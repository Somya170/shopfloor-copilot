"""
factory-ai-platform · services/rag_engine.py
Retrieval-Augmented Generation:
  • SentenceTransformers for embeddings
  • Qdrant for vector search
  • Groq (llama3) for generation via LangChain
"""
import logging
import uuid
from typing import Any

import requests
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue,
)
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage

from config.settings import settings
from database.db import execute_many, execute_write, execute_one

logger = logging.getLogger(__name__)

EMBED_MODEL   = "all-MiniLM-L6-v2"
VECTOR_DIM    = 384   # output dimension of all-MiniLM-L6-v2
TOP_K         = 5     # number of Qdrant results to retrieve


class RAGEngine:
    def __init__(self):
        self._embed_model: SentenceTransformer | None = None
        self._qdrant:      QdrantClient | None = None
        self._llm:         ChatGroq | None = None

    # ── initialisation ───────────────────────────────────────

    def init(self) -> None:
        """Load models and connect to Qdrant. Call once at startup."""
        logger.info("Loading embedding model '%s'…", EMBED_MODEL)
        self._embed_model = SentenceTransformer(EMBED_MODEL)

        logger.info("Connecting to Qdrant at %s:%d…", settings.QDRANT_HOST, settings.QDRANT_PORT)
        self._qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self._ensure_collection()

        if settings.GROQ_API_KEY:
            self._llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=0.3,
                max_tokens=1024,
            )
            logger.info("Groq LLM initialised (model=%s)", settings.GROQ_MODEL)
        else:
            logger.warning("GROQ_API_KEY not set — AI responses will use fallback mode")

        # seed knowledge base if empty
        self._seed_knowledge_base()

    def _ensure_collection(self) -> None:
        existing = [c.name for c in self._qdrant.get_collections().collections]
        if settings.QDRANT_COLLECTION not in existing:
            self._qdrant.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            logger.info("Qdrant collection '%s' created", settings.QDRANT_COLLECTION)

    # ── core RAG query ────────────────────────────────────────

    def query(self, question: str, user_id: int | None = None) -> dict:
        """Full RAG pipeline: embed → retrieve → augment → generate."""
        # 1. embed the question
        q_vector = self._embed(question)

        # 2. retrieve relevant docs from Qdrant
        hits = self._qdrant.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=q_vector,
            limit=TOP_K,
            score_threshold=0.3,
        )
        rag_context = "\n\n".join(
            f"[{h.payload.get('title', 'Document')}]\n{h.payload.get('content', '')}"
            for h in hits
        )

        # 3. fetch live telemetry context
        telemetry_context = self._build_telemetry_context(question)

        # 4. build prompt
        system_prompt = self._build_system_prompt()
        full_context = f"{telemetry_context}\n\n--- Knowledge Base ---\n{rag_context}"

        user_message = f"""Context:\n{full_context}\n\nQuestion: {question}"""

        # 5. call LLM
        answer = self._generate(system_prompt, user_message)

        # 6. persist to chat history
        if user_id:
            self._save_chat(user_id, "user",      question)
            self._save_chat(user_id, "assistant",  answer)

        return {
            "answer":    answer,
            "sources":   [h.payload.get("title", "") for h in hits],
            "telemetry": telemetry_context,
        }

    # ── document indexing ─────────────────────────────────────

    def index_document(
        self,
        title:      str,
        content:    str,
        doc_type:   str = "manual",
        machine_id: int | None = None,
    ) -> str:
        """Embed and store a document in Qdrant + metadata in postgres."""
        vector  = self._embed(content)
        doc_id  = str(uuid.uuid4())
        payload = {
            "title":      title,
            "content":    content,
            "doc_type":   doc_type,
            "machine_id": machine_id,
        }
        self._qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[PointStruct(id=doc_id, vector=vector, payload=payload)],
        )
        execute_write(
            """
            INSERT INTO rag_documents (doc_type, title, content, machine_id, qdrant_id)
            VALUES (%s, %s, %s, %s, %s::uuid)
            ON CONFLICT (qdrant_id) DO NOTHING
            """,
            (doc_type, title, content, machine_id, doc_id),
        )
        return doc_id

    # ── helpers ───────────────────────────────────────────────

    def _embed(self, text: str) -> list[float]:
        return self._embed_model.encode(text, normalize_embeddings=True).tolist()

    def _generate(self, system: str, user: str) -> str:
        if not self._llm:
            return self._fallback_answer(user)
        try:
            messages = [SystemMessage(content=system), HumanMessage(content=user)]
            response = self._llm.invoke(messages)
            return response.content
        except Exception as exc:
            logger.error("Groq generation failed: %s", exc)
            return self._fallback_answer(user)

    def _fallback_answer(self, user_message: str) -> str:
        """Rule-based fallback when Groq is unavailable."""
        msg = user_message.lower()
        if "status" in msg or "machine" in msg:
            rows = execute_many(
                "SELECT machine_name, status FROM machines ORDER BY id LIMIT 5"
            )
            lines = [f"• {r['machine_name']}: {r['status'].upper()}" for r in rows]
            return "Current machine statuses:\n" + "\n".join(lines)
        return "I'm operating in offline mode. Please configure GROQ_API_KEY for full AI responses."

    def _build_system_prompt(self) -> str:
        return (
            "You are an expert industrial AI assistant for a manufacturing monitoring platform. "
            "You have access to real-time machine telemetry, maintenance manuals, and alert history. "
            "Provide concise, accurate, actionable answers. "
            "When reporting telemetry, include actual values with units. "
            "Always end diagnostic responses with a brief recommendation. "
            "If you suggest a report, list the options: 1-week, 1-month, or custom date range."
        )

    def _build_telemetry_context(self, question: str) -> str:
        """Fetch live telemetry for machines mentioned in the question."""
        rows = execute_many(
            """
            SELECT m.machine_name, m.status,
                   md.temperature, md.vibration, md.rpm, md.power_consumption,
                   md.is_anomaly, md.timestamp
            FROM machines m
            JOIN LATERAL (
                SELECT temperature, vibration, rpm, power_consumption, is_anomaly, timestamp
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

        lines = ["=== Live Machine Telemetry ==="]
        for r in rows:
            anomaly_flag = " ⚠ ANOMALY" if r["is_anomaly"] else ""
            lines.append(
                f"{r['machine_name']} [{r['status'].upper()}]{anomaly_flag}\n"
                f"  Temp: {r['temperature']}°C  |  Vibration: {r['vibration']} mm/s  "
                f"|  RPM: {r['rpm']}  |  Power: {r['power_consumption']} W"
            )
        return "\n".join(lines)

    def _save_chat(self, user_id: int, role: str, message: str) -> None:
        execute_write(
            "INSERT INTO chat_history (user_id, role, message) VALUES (%s, %s, %s)",
            (user_id, role, message),
        )

    # ── seed knowledge base ───────────────────────────────────

    def _seed_knowledge_base(self) -> None:
        count = execute_one("SELECT COUNT(*) AS n FROM rag_documents")
        if count and count["n"] > 0:
            return  # already seeded

        logger.info("Seeding RAG knowledge base…")
        docs = [
            {
                "title": "CNC Milling Machine — Operating Manual",
                "content": (
                    "CNC Milling Machine normal operating ranges: temperature 60–85°C, "
                    "vibration 0.05–0.20 mm/s, RPM 2800–3600, power 900–1200 W. "
                    "Preventive maintenance every 500 operating hours. "
                    "Lubricate spindle bearings monthly. Replace coolant fluid quarterly."
                ),
                "doc_type": "manual",
            },
            {
                "title": "Hydraulic Press — Maintenance Guide",
                "content": (
                    "Hydraulic press normal ranges: temperature 50–75°C, vibration 0.10–0.30 mm/s, "
                    "RPM 1800–2400, power 800–1100 W. "
                    "Check hydraulic fluid level weekly. Replace hydraulic seals every 2000 hours. "
                    "High vibration indicates pump cavitation or air in the hydraulic circuit."
                ),
                "doc_type": "guide",
            },
            {
                "title": "Alert Explanation — High Temperature",
                "content": (
                    "High temperature alert is triggered when machine temperature exceeds 95°C (warning) "
                    "or 110°C (critical). Possible causes: cooling system failure, blocked air filters, "
                    "excessive load, or ambient temperature rise. "
                    "Immediate actions: reduce load, check coolant flow, clean filters. "
                    "If critical, shut down machine immediately."
                ),
                "doc_type": "alert_explanation",
            },
            {
                "title": "Alert Explanation — High Vibration",
                "content": (
                    "Vibration alert triggered above 0.4 mm/s (warning) or 0.7 mm/s (critical). "
                    "Causes include bearing wear, imbalanced rotating parts, loose mounting bolts, "
                    "or resonance. Prolonged high vibration causes accelerated bearing failure. "
                    "Schedule bearing inspection within 48 hours of warning-level vibration."
                ),
                "doc_type": "alert_explanation",
            },
            {
                "title": "Conveyor Motor — Operating Manual",
                "content": (
                    "Conveyor motor normal ranges: temperature 55–80°C, vibration 0.08–0.25 mm/s, "
                    "RPM 2200–3000, power 700–950 W. "
                    "Inspect belt tension weekly. Lubricate drive chain every 200 hours. "
                    "Motor thermal protection trips at 115°C — requires manual reset."
                ),
                "doc_type": "manual",
            },
            {
                "title": "Industrial Pump — Maintenance Guide",
                "content": (
                    "Industrial pump normal ranges: temperature 45–70°C, vibration 0.06–0.18 mm/s, "
                    "RPM 2800–3400, power 850–1100 W. "
                    "Check impeller wear quarterly. Mechanical seal replacement every 8000 hours. "
                    "Cavitation indicated by RPM drops and increased vibration simultaneously."
                ),
                "doc_type": "guide",
            },
            {
                "title": "Compressor — Operating Manual",
                "content": (
                    "Compressor normal ranges: temperature 65–90°C, vibration 0.10–0.22 mm/s, "
                    "RPM 3000–3800, power 950–1300 W. "
                    "Check inlet filter every 100 hours. Change compressor oil every 1000 hours. "
                    "Discharge pressure relief valve tested annually. "
                    "High power consumption with low output pressure indicates valve leakage."
                ),
                "doc_type": "manual",
            },
            {
                "title": "General Anomaly Detection — Guide",
                "content": (
                    "The platform uses Isolation Forest ML algorithm to detect statistical anomalies. "
                    "Anomaly score > 0.5 indicates unusual behaviour. "
                    "All anomalies are logged as alerts with severity: info, warning, or critical. "
                    "Recommended response: info → monitor, warning → schedule inspection within 24h, "
                    "critical → immediate shutdown and maintenance."
                ),
                "doc_type": "guide",
            },
        ]

        for doc in docs:
            self.index_document(
                title=doc["title"],
                content=doc["content"],
                doc_type=doc["doc_type"],
            )
        logger.info("Knowledge base seeded with %d documents", len(docs))


# ── singleton ────────────────────────────────────────────────
rag_engine = RAGEngine()