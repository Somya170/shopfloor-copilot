"""
factory-ai-platform · services/report_generator.py
Generates machine & plant-wide reports, stores in DB.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from database.db import execute_many, execute_one, execute_write
from config.settings import settings

logger = logging.getLogger(__name__)


def _safe_float(v) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


class ReportGenerator:

    def generate_machine_report(
        self,
        machine_id:  int,
        report_type: str,        # 'weekly' | 'monthly' | 'custom'
        start_dt:    datetime,
        end_dt:      datetime,
        generated_by: int | None = None,
        llm_summary: str | None  = None,
    ) -> dict:
        """Build and persist a machine telemetry report."""
        machine = execute_one(
            "SELECT id, machine_name, location, machine_type FROM machines WHERE id = %s",
            (machine_id,),
        )
        if not machine:
            raise ValueError(f"Machine {machine_id} not found")

        stats = execute_one(
            """
            SELECT
                COUNT(*)                          AS reading_count,
                ROUND(AVG(temperature)::numeric,2)         AS avg_temp,
                ROUND(MAX(temperature)::numeric,2)         AS max_temp,
                ROUND(MIN(temperature)::numeric,2)         AS min_temp,
                ROUND(AVG(vibration)::numeric,4)           AS avg_vibration,
                ROUND(MAX(vibration)::numeric,4)           AS max_vibration,
                ROUND(AVG(rpm)::numeric,1)                 AS avg_rpm,
                ROUND(AVG(power_consumption)::numeric,2)   AS avg_power,
                ROUND(MAX(power_consumption)::numeric,2)   AS max_power,
                SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) AS anomaly_count
            FROM machine_data
            WHERE machine_id = %s
              AND timestamp BETWEEN %s AND %s
            """,
            (machine_id, start_dt, end_dt),
        )

        alerts = execute_many(
            """
            SELECT alert_type, message, severity, timestamp
            FROM alerts
            WHERE machine_id = %s AND timestamp BETWEEN %s AND %s
            ORDER BY timestamp DESC
            LIMIT 20
            """,
            (machine_id, start_dt, end_dt),
        )

        uptime_pct = self._calc_uptime(machine_id, start_dt, end_dt)

        content = {
            "machine_id":   machine_id,
            "machine_name": machine["machine_name"],
            "location":     machine["location"],
            "machine_type": machine["machine_type"],
            "period": {
                "start": start_dt.isoformat(),
                "end":   end_dt.isoformat(),
                "type":  report_type,
            },
            "telemetry_stats": {
                "reading_count":  int(stats["reading_count"] or 0),
                "temperature": {
                    "avg": _safe_float(stats["avg_temp"]),
                    "max": _safe_float(stats["max_temp"]),
                    "min": _safe_float(stats["min_temp"]),
                },
                "vibration": {
                    "avg": _safe_float(stats["avg_vibration"]),
                    "max": _safe_float(stats["max_vibration"]),
                },
                "rpm":   {"avg": _safe_float(stats["avg_rpm"])},
                "power": {
                    "avg": _safe_float(stats["avg_power"]),
                    "max": _safe_float(stats["max_power"]),
                },
                "anomaly_count": int(stats["anomaly_count"] or 0),
            },
            "uptime_pct": uptime_pct,
            "alerts":     [dict(a) for a in alerts],
            "ai_summary": llm_summary or self._rule_based_summary(stats, alerts, machine),
        }

        title = (
            f"{machine['machine_name']} — "
            f"{report_type.capitalize()} Report "
            f"({start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')})"
        )

        row = execute_write(
            """
            INSERT INTO reports (machine_id, report_type, title, content, generated_by)
            VALUES (%s, %s, %s, %s::jsonb, %s)
            RETURNING id, generated_at
            """,
            (machine_id, report_type, title,
             __import__("json").dumps(content, default=str), generated_by),
        )

        content["report_id"]    = row["id"] if row else None
        content["generated_at"] = str(row["generated_at"]) if row else None
        content["title"]        = title
        return content

    def generate_plant_report(
        self,
        report_type:  str,
        start_dt:     datetime,
        end_dt:       datetime,
        generated_by: int | None = None,
    ) -> dict:
        """Plant-wide summary across all machines."""
        machines = execute_many("SELECT id, machine_name FROM machines ORDER BY id")
        machine_reports = []
        for m in machines:
            try:
                rpt = self.generate_machine_report(
                    m["id"], report_type, start_dt, end_dt, generated_by
                )
                machine_reports.append(rpt)
            except Exception as exc:
                logger.warning("Skipped machine %d in plant report: %s", m["id"], exc)

        total_anomalies = sum(r["telemetry_stats"]["anomaly_count"] for r in machine_reports)
        avg_uptime      = (
            sum(r["uptime_pct"] for r in machine_reports) / len(machine_reports)
            if machine_reports else 0
        )

        content = {
            "report_type":    report_type,
            "period":         {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
            "machine_count":  len(machine_reports),
            "total_anomalies": total_anomalies,
            "avg_uptime_pct": round(avg_uptime, 2),
            "machines":       machine_reports,
        }

        title = (
            f"Plant-Wide {report_type.capitalize()} Report "
            f"({start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')})"
        )

        execute_write(
            """
            INSERT INTO reports (machine_id, report_type, title, content, generated_by)
            VALUES (NULL, %s, %s, %s::jsonb, %s)
            """,
            (report_type, title, __import__("json").dumps(content, default=str), generated_by),
        )

        content["title"] = title
        return content

    # ── helpers ───────────────────────────────────────────────

    def _calc_uptime(self, machine_id: int, start_dt: datetime, end_dt: datetime) -> float:
        """Approximate uptime as % of 2-second intervals with a reading."""
        period_secs = (end_dt - start_dt).total_seconds()
        expected_readings = period_secs / 2  # one reading every 2 s
        actual = execute_one(
            "SELECT COUNT(*) AS n FROM machine_data WHERE machine_id=%s AND timestamp BETWEEN %s AND %s",
            (machine_id, start_dt, end_dt),
        )
        actual_count = actual["n"] if actual else 0
        return round(min(100, (actual_count / max(expected_readings, 1)) * 100), 2)

    def _rule_based_summary(self, stats: dict, alerts: list, machine: dict) -> str:
        anomalies = int(stats.get("anomaly_count") or 0)
        avg_temp  = _safe_float(stats.get("avg_temp"))
        max_vib   = _safe_float(stats.get("max_vibration"))

        lines = [f"Summary for {machine['machine_name']}:"]
        if anomalies == 0:
            lines.append("✅ No anomalies detected during this period.")
        else:
            lines.append(f"⚠ {anomalies} anomaly readings detected.")

        if avg_temp > 90:
            lines.append(f"🌡 Average temperature ({avg_temp}°C) is elevated — inspect cooling system.")
        if max_vib > 0.35:
            lines.append(f"📳 Peak vibration ({max_vib} mm/s) is high — check bearing condition.")

        critical = sum(1 for a in alerts if a.get("severity") == "critical")
        if critical:
            lines.append(f"🚨 {critical} critical alert(s) during this period — immediate review required.")

        lines.append("Recommendation: Schedule routine inspection within 7 days.")
        return "\n".join(lines)


# ── date range helpers ────────────────────────────────────────

def get_weekly_range() -> tuple[datetime, datetime]:
    end   = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    return start, end


def get_monthly_range() -> tuple[datetime, datetime]:
    end   = datetime.now(timezone.utc)
    start = end - timedelta(days=30)
    return start, end


# ── singleton ────────────────────────────────────────────────
report_generator = ReportGenerator()