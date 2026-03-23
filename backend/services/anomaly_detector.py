"""
factory-ai-platform · services/anomaly_detector.py
Scikit-learn Isolation Forest — trains on historical data,
scores each new reading, stores alerts in DB.
"""
import logging
import threading
import time
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from database.db import execute_many, execute_write
from database.cache import cache_get, cache_set, publish
from config.settings import settings

logger = logging.getLogger(__name__)

FEATURES = ["temperature", "vibration", "rpm", "power_consumption"]

# Thresholds that trigger a severity escalation even without IF verdict
HARD_LIMITS = {
    "temperature":       {"warning": 95,  "critical": 110},
    "vibration":         {"warning": 0.4, "critical": 0.7},
    "rpm":               {"warning": 4200,"critical": 4800},
    "power_consumption": {"warning": 1500,"critical": 1800},
}


class AnomalyDetector:
    """Per-machine Isolation Forest models with periodic retraining."""

    def __init__(self):
        self._models:  dict[int, IsolationForest] = {}
        self._scalers: dict[int, StandardScaler]  = {}
        self._lock     = threading.Lock()
        self._running  = False
        self._thread: Optional[threading.Thread] = None

    # ── lifecycle ─────────────────────────────────────────────

    def start(self) -> None:
        self._running = True
        self._thread  = threading.Thread(
            target=self._retrain_loop, daemon=True, name="anomaly-trainer"
        )
        self._thread.start()
        logger.info("Anomaly detector started")

    def stop(self) -> None:
        self._running = False

    # ── public API ────────────────────────────────────────────

    def score(self, reading: dict) -> dict:
        """Score a single reading. Returns the reading enriched with anomaly info."""
        machine_id = reading["machine_id"]

        # ── hard limit check ────────────────────────────────
        hard_alert = self._check_hard_limits(reading)

        # ── isolation forest check ──────────────────────────
        if_anomaly = False
        if_score   = 0.0
        with self._lock:
            model  = self._models.get(machine_id)
            scaler = self._scalers.get(machine_id)

        if model and scaler:
            X = np.array([[reading[f] for f in FEATURES]])
            X_scaled = scaler.transform(X)
            pred  = model.predict(X_scaled)[0]         # -1 anomaly, 1 normal
            score = model.score_samples(X_scaled)[0]   # more negative = more anomalous
            if_anomaly = pred == -1
            if_score   = float(-score)  # flip so higher = worse

        is_anomaly = if_anomaly or (hard_alert is not None)
        severity   = hard_alert["severity"] if hard_alert else ("warning" if if_anomaly else "info")

        enriched = {**reading, "is_anomaly": is_anomaly, "anomaly_score": round(if_score, 4)}

        if is_anomaly:
            alert_type = hard_alert["type"] if hard_alert else "isolation_forest"
            message    = hard_alert["message"] if hard_alert else (
                f"{reading['machine_name']}: statistical anomaly detected "
                f"(score {if_score:.3f})"
            )
            self._store_alert(machine_id, alert_type, message, severity)
            enriched["alert"]    = message
            enriched["severity"] = severity
            publish("alerts", {**enriched, "alert": message, "severity": severity})

        return enriched

    # ── private helpers ───────────────────────────────────────

    def _check_hard_limits(self, reading: dict) -> Optional[dict]:
        worst = None
        for param, limits in HARD_LIMITS.items():
            value = reading.get(param, 0)
            if value >= limits["critical"]:
                worst = {
                    "type":     f"critical_{param}",
                    "severity": "critical",
                    "message":  (
                        f"{reading['machine_name']}: {param} critically high "
                        f"({value} ≥ {limits['critical']})"
                    ),
                }
                break  # critical beats everything
            elif value >= limits["warning"] and worst is None:
                worst = {
                    "type":     f"high_{param}",
                    "severity": "warning",
                    "message":  (
                        f"{reading['machine_name']}: {param} elevated "
                        f"({value} ≥ {limits['warning']})"
                    ),
                }
        return worst

    def _store_alert(
        self, machine_id: int, alert_type: str, message: str, severity: str
    ) -> None:
        # Deduplicate — skip if identical alert stored in last 60 s
        recent = execute_many(
            """
            SELECT id FROM alerts
            WHERE machine_id = %s AND alert_type = %s AND is_resolved = FALSE
              AND timestamp > NOW() - INTERVAL '60 seconds'
            LIMIT 1
            """,
            (machine_id, alert_type),
        )
        if recent:
            return

        execute_write(
            """
            INSERT INTO alerts (machine_id, alert_type, message, severity)
            VALUES (%s, %s, %s, %s)
            """,
            (machine_id, alert_type, message, severity),
        )

        # update machine status
        execute_write(
            "UPDATE machines SET status = %s WHERE id = %s",
            (severity, machine_id),
        )
        logger.info("Alert stored — machine %d: %s [%s]", machine_id, alert_type, severity)

    def _retrain_loop(self) -> None:
        """Retrain models on startup and every 5 minutes thereafter."""
        while self._running:
            self._retrain_all()
            time.sleep(300)

    def _retrain_all(self) -> None:
        machines = execute_many("SELECT id FROM machines")
        for m in machines:
            mid = m["id"]
            rows = execute_many(
                f"""
                SELECT temperature, vibration, rpm, power_consumption
                FROM machine_data
                WHERE machine_id = %s
                ORDER BY timestamp DESC
                LIMIT {settings.ANOMALY_RETRAIN_ROWS}
                """,
                (mid,),
            )
            if len(rows) < 30:
                logger.debug("Skipping retraining for machine %d — not enough data (%d rows)", mid, len(rows))
                continue

            X = np.array([[r[f] for f in FEATURES] for r in rows])
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            model = IsolationForest(
                n_estimators=100,
                contamination=settings.ANOMALY_CONTAMINATION,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_scaled)

            with self._lock:
                self._models[mid]  = model
                self._scalers[mid] = scaler

            logger.info("IF model retrained for machine %d (%d rows)", mid, len(rows))


# ── singleton ────────────────────────────────────────────────
detector = AnomalyDetector()