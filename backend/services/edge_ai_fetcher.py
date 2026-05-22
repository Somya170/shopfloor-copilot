"""
edge_ai_fetcher.py
Fetches Machine_6 data from Edge AI (port 5005)
Stores: telemetry + prediction history
"""
import logging
import threading
import time
import requests
from database.db import execute_write, execute_one

logger = logging.getLogger(__name__)
EDGE_AI_URL = "http://localhost:5005"


class EdgeAIFetcher:
    def __init__(self):
        self._running   = False
        self._thread    = None
        self._machine_id = None

    def start(self):
        self._ensure_machine()
        self._running = True
        self._thread  = threading.Thread(
            target=self._loop, daemon=True, name="edge-ai-fetcher"
        )
        self._thread.start()
        logger.info("Edge AI fetcher started — Machine_6")

    def stop(self):
        self._running = False

    def _ensure_machine(self):
        existing = execute_one(
            "SELECT id FROM machines WHERE machine_name = 'Machine_6'"
        )
        if existing:
            self._machine_id = existing["id"]
        else:
            row = execute_write(
                """
                INSERT INTO machines
                    (machine_name, location, machine_type, status)
                VALUES
                    ('Machine_6','Zone C - Bay 2',
                     'Compressor (Edge AI)','normal')
                RETURNING id
                """,
            )
            self._machine_id = row["id"]
            logger.info("Machine_6 created id=%d", self._machine_id)

    def _loop(self):
        while self._running:
            try:
                self._fetch_and_store()
            except Exception as e:
                logger.warning("Edge AI fetch error: %s", e)
            time.sleep(5)

    def _fetch_and_store(self):
        # ── Live sensor data ──────────────────────────────────
        live_res = requests.get(
            f"{EDGE_AI_URL}/api/live-data", timeout=4
        )
        if live_res.status_code != 200:
            return
        live = live_res.json()

        temp     = float(live.get("temperature", 0))
        v_rmsy   = float(live.get("vRMSy", 0))
        acoustic = float(live.get("aucausticRMS", 0))

        # ── Prediction ────────────────────────────────────────
        try:
            pred_res = requests.get(
                f"{EDGE_AI_URL}/api/prediction", timeout=4
            )
            pred = pred_res.json() if pred_res.status_code == 200 else {}
        except:
            pred = {}

        health       = float(pred.get("health_score", 100))
        failure_risk = float(pred.get("failure_risk", 0))
        rul_hours    = float(pred.get("rul_hours", 720))
        fault_type   = pred.get("fault_type", "none") or "none"
        confidence   = float(pred.get("confidence", 1.0))
        status       = pred.get("status", "normal")
        motor_off    = bool(pred.get("motor_off", False))
        trend        = float(pred.get("trend", 0))
        is_anomaly   = status != "normal"

        # ── Store telemetry ───────────────────────────────────
        execute_write(
            """
            INSERT INTO machine_data
                (machine_id, temperature, vibration, rpm,
                 power_consumption, pressure,
                 is_anomaly, anomaly_score, timestamp)
            VALUES (%s,%s,%s,0,0,%s,%s,%s,NOW())
            """,
            (
                self._machine_id,
                temp, v_rmsy, acoustic,
                is_anomaly, failure_risk / 100.0,
            ),
        )

        # ── Store prediction history ──────────────────────────
        execute_write(
            """
            INSERT INTO machine_6_predictions
                (health_score, failure_risk, rul_hours,
                 fault_type, confidence, status,
                 motor_off, trend,
                 temperature, v_rmsy, acoustic_rms)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                health, failure_risk, rul_hours,
                fault_type, confidence, status,
                motor_off, trend,
                temp, v_rmsy, acoustic,
            ),
        )

        # ── Update machine status ─────────────────────────────
        execute_write(
            "UPDATE machines SET status=%s WHERE id=%s",
            (status, self._machine_id),
        )

        # ── Store alert if needed ─────────────────────────────
        if is_anomaly and fault_type != "none":
            execute_write(
                """
                INSERT INTO alerts
                    (machine_id, alert_type, message, severity)
                SELECT %s,%s,%s,%s
                WHERE NOT EXISTS (
                    SELECT 1 FROM alerts
                    WHERE machine_id=%s
                      AND alert_type=%s
                      AND is_resolved=FALSE
                      AND timestamp > NOW() - INTERVAL '60 seconds'
                )
                """,
                (
                    self._machine_id,
                    f"edge_ai_{fault_type}",
                    f"Machine_6: {fault_type} detected "
                    f"(Risk: {failure_risk:.1f}%, "
                    f"Health: {health:.0f}%)",
                    status,
                    self._machine_id,
                    f"edge_ai_{fault_type}",
                ),
            )

        logger.debug(
            "M6 stored — health=%.0f risk=%.1f rul=%.0fh fault=%s",
            health, failure_risk, rul_hours, fault_type,
        )


edge_ai_fetcher = EdgeAIFetcher()