"""
factory-ai-platform · services/rag_engine.py

LLM Strategy:
  - LLM_MODE=auto   → internet check → Groq if online, Ollama if offline
  - LLM_MODE=groq   → always Groq
  - LLM_MODE=ollama → always Ollama (local SLM)
"""

import logging
import uuid
import time
import requests as _req
from typing import Any

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langchain_groq import ChatGroq
from langchain_community.llms import Ollama
from langchain.schema import HumanMessage, SystemMessage

from config.settings import settings
from database.db import execute_many, execute_write, execute_one

logger = logging.getLogger(__name__)

EMBED_MODEL = "all-MiniLM-L6-v2"
VECTOR_DIM = 384
TOP_K = 5

# Internet check cache — recheck every 30 seconds
_internet_cache: dict = {"available": None, "last_check": 0}
CACHE_TTL = 30  # seconds


def _check_internet() -> bool:
    """Check internet with caching — avoid per-query network overhead."""
    global _internet_cache

    now = time.time()

    if now - _internet_cache["last_check"] < CACHE_TTL:
        return _internet_cache["available"]

    try:
        _req.get(
            settings.INTERNET_CHECK_URL,
            timeout=settings.INTERNET_CHECK_TIMEOUT,
        )

        _internet_cache = {
            "available": True,
            "last_check": now,
        }

        return True

    except Exception:
        _internet_cache = {
            "available": False,
            "last_check": now,
        }

        return False


class RAGEngine:

    def __init__(self):
        self._embed_model: SentenceTransformer | None = None
        self._qdrant: QdrantClient | None = None
        self._groq: ChatGroq | None = None
        self._ollama: Ollama | None = None
        self._llm_mode: str = settings.LLM_MODE

    # ─────────────────────────────────────────────────────────
    # init
    # ─────────────────────────────────────────────────────────

    def init(self) -> None:

        logger.info(
            "Loading embedding model '%s'…",
            EMBED_MODEL,
        )

        self._embed_model = SentenceTransformer(
            EMBED_MODEL
        )

        logger.info(
            "Connecting to Qdrant at %s:%d…",
            settings.QDRANT_HOST,
            settings.QDRANT_PORT,
        )

        self._qdrant = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
        )

        self._ensure_collection()

        # ── Groq setup ────────────────────────────────────────

        if settings.GROQ_API_KEY:

            try:
                self._groq = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model_name=settings.GROQ_MODEL,
                    temperature=0.3,
                    max_tokens=1024,
                )

                logger.info(
                    "Groq ready (model=%s)",
                    settings.GROQ_MODEL,
                )

            except Exception as e:
                logger.warning(
                    "Groq init failed: %s",
                    e,
                )

        else:
            logger.warning("GROQ_API_KEY not set")

        # ── Ollama setup ──────────────────────────────────────

        try:
            resp = _req.get(
                f"{settings.OLLAMA_HOST}/api/tags",
                timeout=3,
            )

            if resp.status_code == 200:

                models = [
                    m["name"]
                    for m in resp.json().get("models", [])
                ]

                model_available = any(
                    settings.OLLAMA_MODEL in m
                    for m in models
                )

                if model_available:

                    self._ollama = Ollama(
                        base_url=settings.OLLAMA_HOST,
                        model=settings.OLLAMA_MODEL,
                        temperature=0.3,
                        num_predict=512,
                    )

                    logger.info(
                        "Ollama ready (model=%s) — offline SLM available",
                        settings.OLLAMA_MODEL,
                    )

                else:
                    logger.warning(
                        "Ollama running but model '%s' not found. "
                        "Run: ollama pull %s",
                        settings.OLLAMA_MODEL,
                        settings.OLLAMA_MODEL,
                    )

            else:
                logger.warning("Ollama not responding")

        except Exception as e:
            logger.warning(
                "Ollama unavailable: %s",
                e,
            )

        # ── Log final LLM strategy ────────────────────────────

        groq_ok = self._groq is not None
        ollama_ok = self._ollama is not None

        logger.info(
            "LLM strategy: mode=%s | Groq=%s | Ollama=%s",
            self._llm_mode,
            "✓" if groq_ok else "✗",
            "✓" if ollama_ok else "✗",
        )

        self._seed_knowledge_base()

    # ─────────────────────────────────────────────────────────
    # Qdrant
    # ─────────────────────────────────────────────────────────

    def _ensure_collection(self) -> None:

        existing = [
            c.name
            for c in self._qdrant.get_collections().collections
        ]

        if settings.QDRANT_COLLECTION not in existing:

            self._qdrant.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(
                    size=VECTOR_DIM,
                    distance=Distance.COSINE,
                ),
            )

            logger.info(
                "Qdrant collection '%s' created",
                settings.QDRANT_COLLECTION,
            )

    # ─────────────────────────────────────────────────────────
    # LLM selector
    # ─────────────────────────────────────────────────────────

    def _select_llm(self) -> tuple[str, Any]:
        """
        Returns:
            (llm_type, llm_instance)

        llm_type:
            'groq' | 'ollama' | 'fallback'
        """

        mode = self._llm_mode

        if mode == "groq":

            if self._groq:
                return "groq", self._groq

            logger.warning(
                "Groq forced but unavailable — trying Ollama"
            )

            if self._ollama:
                return "ollama", self._ollama

            return "fallback", None

        if mode == "ollama":

            if self._ollama:
                return "ollama", self._ollama

            logger.warning(
                "Ollama forced but unavailable — trying Groq"
            )

            if self._groq:
                return "groq", self._groq

            return "fallback", None

        # mode == auto

        internet = _check_internet()

        if internet and self._groq:
            logger.debug(
                "Auto: internet available → Groq"
            )
            return "groq", self._groq

        if self._ollama:
            logger.debug(
                "Auto: internet unavailable → Ollama"
            )
            return "ollama", self._ollama

        if self._groq:
            return "groq", self._groq

        return "fallback", None

    # ─────────────────────────────────────────────────────────
    # Query
    # ─────────────────────────────────────────────────────────

    def query(
        self,
        question: str,
        user_id: int | None = None,
    ) -> dict:

        q_lower = question.lower()

        # ── Embed query ───────────────────────────────────────

        q_vector = self._embed(question)

        # ── Retrieve from Qdrant ──────────────────────────────

        hits = self._qdrant.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=q_vector,
            limit=TOP_K,
            score_threshold=0.3,
        )

        rag_context = "\n\n".join(
            f"[{h.payload.get('title', 'Document')}]\n"
            f"{h.payload.get('content', '')}"
            for h in hits
        )

        # ── Live telemetry ────────────────────────────────────

        telemetry_context = self._build_telemetry_context(
            question
        )

        # ── Machine_6 smart context ───────────────────────────

        machine6_context = ""

        m6_keywords = [
            "machine 6",
            "machine_6",
            "m6",
            "edge ai",
            "compressor",
            "rul",
            "remaining useful",
            "health score",
            "failure risk",
            "bearing",
            "misalignment",
            "imbalance",
            "overheating",
            "prediction",
            "compare",
            "trend",
            "yesterday",
            "last hour",
            "acoustic",
            "vrmsy",
        ]

        if any(k in q_lower for k in m6_keywords):
            machine6_context = self._build_machine6_context()

        # ── Combine context ───────────────────────────────────

        full_context = telemetry_context

        if machine6_context:
            full_context += "\n" + machine6_context

        full_context += (
            "\n\n--- Knowledge Base ---\n"
            + rag_context
        )

        user_msg = (
            f"Context:\n{full_context}\n\n"
            f"Question: {question}"
        )

        # ── Select LLM ────────────────────────────────────────

        llm_type, llm = self._select_llm()

        answer = self._generate(
            self._build_system_prompt(),
            user_msg,
            llm_type,
            llm,
        )

        # ── Save history ──────────────────────────────────────

        if user_id:
            self._save_chat(
                user_id,
                "user",
                question,
            )

            self._save_chat(
                user_id,
                "assistant",
                answer,
            )

        return {
            "answer": answer,
            "sources": [
                h.payload.get("title", "")
                for h in hits
            ],
            "telemetry": telemetry_context,
            "llm_used": llm_type,
        }

    # ─────────────────────────────────────────────────────────
    # Generation
    # ─────────────────────────────────────────────────────────

    def _generate(
        self,
        system: str,
        user: str,
        llm_type: str,
        llm: Any,
    ) -> str:

        if llm_type == "fallback" or llm is None:
            return self._fallback_answer(user)

        try:

            if llm_type == "groq":

                messages = [
                    SystemMessage(content=system),
                    HumanMessage(content=user),
                ]

                response = llm.invoke(messages)

                return response.content

            elif llm_type == "ollama":

                prompt = (
                    f"<|system|>\n{system}\n<|end|>\n"
                    f"<|user|>\n{user}\n<|end|>\n"
                    f"<|assistant|>\n"
                )

                return llm.invoke(prompt)

        except Exception as exc:

            logger.error(
                "%s generation failed: %s — trying fallback",
                llm_type,
                exc,
            )

            if llm_type == "groq" and self._ollama:

                try:
                    logger.info(
                        "Groq failed → falling back to Ollama"
                    )

                    prompt = f"{system}\n\n{user}"

                    return self._ollama.invoke(prompt)

                except Exception as e2:
                    logger.error(
                        "Ollama fallback also failed: %s",
                        e2,
                    )

            return self._fallback_answer(user)

        return self._fallback_answer(user)

    # ─────────────────────────────────────────────────────────
    # Fallback
    # ─────────────────────────────────────────────────────────

    def _fallback_answer(
        self,
        user_message: str,
    ) -> str:

        msg = user_message.lower()

        if "status" in msg or "machine" in msg:

            rows = execute_many(
                "SELECT machine_name, status "
                "FROM machines "
                "ORDER BY id"
            )

            lines = [
                f"• {r['machine_name']}: "
                f"{r['status'].upper()}"
                for r in rows
            ]

            return (
                "Current machine statuses:\n"
                + "\n".join(lines)
                + "\n\n"
                "(Offline mode — AI LLM unavailable)"
            )

        return (
            "I'm in offline mode. "
            "Both Groq API and local Ollama "
            "are unavailable."
        )

    # ─────────────────────────────────────────────────────────
    # Index document
    # ─────────────────────────────────────────────────────────

    def index_document(
        self,
        title: str,
        content: str,
        doc_type: str = "manual",
        machine_id: int | None = None,
    ) -> str:

        vector = self._embed(content)

        doc_id = str(uuid.uuid4())

        payload = {
            "title": title,
            "content": content,
            "doc_type": doc_type,
            "machine_id": machine_id,
        }

        self._qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[
                PointStruct(
                    id=doc_id,
                    vector=vector,
                    payload=payload,
                )
            ],
        )

        execute_write(
            """
            INSERT INTO rag_documents
                (
                    doc_type,
                    title,
                    content,
                    machine_id,
                    qdrant_id
                )
            VALUES (%s, %s, %s, %s, %s::uuid)
            ON CONFLICT (qdrant_id) DO NOTHING
            """,
            (
                doc_type,
                title,
                content,
                machine_id,
                doc_id,
            ),
        )

        return doc_id

    # ─────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────

    def _embed(self, text: str) -> list[float]:

        return self._embed_model.encode(
            text,
            normalize_embeddings=True,
        ).tolist()

    def _build_system_prompt(self) -> str:

        llm_type, _ = self._select_llm()

        mode_note = (
            "You are running in OFFLINE mode using a local SLM."
            if llm_type == "ollama"
            else "You are running in ONLINE mode using Groq cloud LLM."
        )

        return (
            "You are an expert industrial AI assistant "
            "for Shopfloor Copilot / Nexfloor "
            "by Yash Technologies. "
            f"{mode_note} "
            "You have access to real-time machine telemetry, "
            "maintenance manuals, production logs, "
            "operator information, and Machine_6 "
            "Edge AI predictions. "
            "Always use actual values from the context. "
            "Be concise and actionable."
        )

    # ─────────────────────────────────────────────────────────
    # UPDATED TELEMETRY CONTEXT
    # ─────────────────────────────────────────────────────────

    def _build_telemetry_context(
        self,
        question: str,
    ) -> str:

        rows = execute_many(
            """
            SELECT m.machine_name, m.status,
                   md.temperature, md.vibration,
                   md.rpm, md.power_consumption,
                   md.is_anomaly, md.timestamp
            FROM machines m
            JOIN LATERAL (
                SELECT temperature, vibration, rpm,
                       power_consumption, is_anomaly, timestamp
                FROM machine_data
                WHERE machine_id = m.id
                ORDER BY timestamp DESC
                LIMIT 1
            ) md ON TRUE
            ORDER BY m.id
            """
        )

        if not rows:
            return "No live telemetry available."

        lines = [
            "=== Live Machine Telemetry ==="
        ]

        for r in rows:

            anomaly_flag = (
                " ⚠ ANOMALY"
                if r["is_anomaly"]
                else ""
            )

            # ──────────────────────────────────────────────────
            # Machine_6
            # ──────────────────────────────────────────────────

            if r["machine_name"] == "Machine_6":

                try:

                    live = _req.get(
                        "http://localhost:5005/api/live-data",
                        timeout=2,
                    ).json()

                    temp = float(
                        live.get("temperature", 0)
                    )

                    v_rmsy = float(
                        live.get("vRMSy", 0)
                    )

                    v_rmsx = float(
                        live.get("vRMSx", 0)
                    )

                    v_rmsz = float(
                        live.get("vRMSz", 0)
                    )

                    a_rmsx = float(
                        live.get("aRMSx", 0)
                    )

                    a_rmsy = float(
                        live.get("aRMSy", 0)
                    )

                    a_rmsz = float(
                        live.get("aRMSz", 0)
                    )

                    acoustic = float(
                        live.get("aucausticRMS", 0)
                    )

                    lines.append(
                        f"Machine_6 "
                        f"[Edge AI · "
                        f"{r['status'].upper()}]"
                        f"{anomaly_flag}\n"
                        f"  Temperature  : "
                        f"{temp:.2f}°C\n"
                        f"  Vibration    : "
                        f"vRMSy={v_rmsy:.3f}  "
                        f"vRMSx={v_rmsx:.3f}  "
                        f"vRMSz={v_rmsz:.3f} mm/s\n"
                        f"  Acceleration : "
                        f"aRMSy={a_rmsy:.3f}  "
                        f"aRMSx={a_rmsx:.3f}  "
                        f"aRMSz={a_rmsz:.3f} g\n"
                        f"  Acoustic RMS : "
                        f"{acoustic:.2f} dB\n"
                        f"  RPM          : "
                        f"N/A\n"
                        f"  Power        : "
                        f"N/A"
                    )

                except Exception as e:

                    logger.warning(
                        "Machine_6 live fetch failed: %s",
                        e,
                    )

                    lines.append(
                        f"Machine_6 "
                        f"[Edge AI · "
                        f"{r['status'].upper()}]\n"
                        f"  Temp: "
                        f"{r['temperature']}°C  |  "
                        f"Vibration: "
                        f"{r['vibration']} mm/s"
                    )

                # ── Prediction ───────────────────────────────

                try:

                    pred = _req.get(
                        "http://localhost:5005/api/prediction",
                        timeout=2,
                    ).json()

                    lines.append(
                        f"  AI Prediction:\n"
                        f"    Health Score : "
                        f"{pred.get('health_score', 0):.1f}%\n"
                        f"    Failure Risk : "
                        f"{pred.get('failure_risk', 0):.1f}%\n"
                        f"    RUL          : "
                        f"{pred.get('rul_hours', 0)/24:.1f} days\n"
                        f"    Fault Type   : "
                        f"{pred.get('fault_type', 'none')}\n"
                        f"    Status       : "
                        f"{pred.get('status', 'normal').upper()}"
                    )

                except Exception:
                    lines.append(
                        "  AI Prediction: unavailable"
                    )

            # ──────────────────────────────────────────────────
            # Other machines
            # ──────────────────────────────────────────────────

            else:

                lines.append(
                    f"{r['machine_name']} "
                    f"[{r['status'].upper()}]"
                    f"{anomaly_flag}\n"
                    f"  Temp: "
                    f"{r['temperature']}°C  |  "
                    f"Vibration: "
                    f"{r['vibration']} mm/s  |  "
                    f"RPM: "
                    f"{r['rpm']}  |  "
                    f"Power: "
                    f"{r['power_consumption']} W"
                )

        return "\n".join(lines)

    # ─────────────────────────────────────────────────────────
    # Machine_6 Smart Context
    # ─────────────────────────────────────────────────────────

    def _build_machine6_context(self) -> str:

        lines = [
            "\n=== Machine_6 Edge AI — Smart Context ==="
        ]

        latest = execute_one(
            """
            SELECT health_score,
                   failure_risk,
                   rul_hours,
                   fault_type,
                   confidence,
                   status,
                   temperature,
                   v_rmsy,
                   acoustic_rms,
                   timestamp
            FROM machine_6_predictions
            ORDER BY timestamp DESC
            LIMIT 1
            """
        )

        if latest:

            lines.append(
                f"\nCURRENT "
                f"(as of "
                f"{str(latest['timestamp'])[:19]}):"
                f"\n  Health: "
                f"{latest['health_score']:.1f}%  |  "
                f"Risk: "
                f"{latest['failure_risk']:.1f}%  |  "
                f"RUL: "
                f"{latest['rul_hours']/24:.1f} days  |  "
                f"Fault: "
                f"{latest['fault_type']}  |  "
                f"Status: "
                f"{latest['status'].upper()}"
            )

        return "\n".join(lines)

    # ─────────────────────────────────────────────────────────
    # Save chat
    # ─────────────────────────────────────────────────────────

    def _save_chat(
        self,
        user_id: int,
        role: str,
        message: str,
    ) -> None:

        execute_write(
            """
            INSERT INTO chat_history
                (
                    user_id,
                    role,
                    message
                )
            VALUES (%s, %s, %s)
            """,
            (
                user_id,
                role,
                message,
            ),
        )

    # ─────────────────────────────────────────────────────────
    # Seed knowledge base
    # ─────────────────────────────────────────────────────────

    def _seed_knowledge_base(self) -> None:

        count = execute_one(
            "SELECT COUNT(*) AS n FROM rag_documents"
        )

        if count and count["n"] > 0:
            return

        logger.info(
            "Seeding RAG knowledge base…"
        )

        docs = [
            {
                "title": "Machine_6 Edge AI Compressor",
                "content": (
                    "Machine_6 Edge AI compressor. "
                    "Normal: Temp 20–30°C, "
                    "vRMSy 0.5–1.5 mm/s, "
                    "Acoustic 50–58 dB."
                ),
                "doc_type": "manual",
            }
        ]

        for doc in docs:
            self.index_document(**doc)

        logger.info(
            "Seeded %d documents",
            len(docs),
        )


# ─────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────

rag_engine = RAGEngine()