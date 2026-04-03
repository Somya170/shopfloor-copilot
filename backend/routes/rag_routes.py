"""
factory-ai-platform · routes/rag_routes.py
POST /api/ask-ai
GET  /api/chat-history
POST /api/index-document
"""
import logging
from datetime import datetime, timezone, timedelta

from flask import Blueprint, g, jsonify, request

from database.db import execute_many, execute_one
from services.auth_service import jwt_required, roles_required
from services.rag_engine import rag_engine

logger = logging.getLogger(__name__)
rag_bp = Blueprint("rag", __name__, url_prefix="/api")


def _detect_report_intent(question: str) -> dict | None:
    """Detect if user wants a report and extract parameters."""
    q = question.lower()

    # Must contain report-related keywords
    report_keywords = ['report', 'uptime', 'downtime', 'performance', 'summary', 'analysis']
    if not any(k in q for k in report_keywords):
        return None

    # Detect machine
    machine_id = None
    for i in range(1, 6):
        if f'machine {i}' in q or f'machine_{i}' in q:
            machine_id = i
            break
    if not machine_id:
        return None

    # Detect report type
    if 'uptime' in q or 'downtime' in q:
        report_type = 'uptime'
    elif 'temperature' in q or 'temp' in q:
        report_type = 'temperature'
    elif 'vibration' in q or 'vib' in q:
        report_type = 'vibration'
    elif 'power' in q or 'energy' in q:
        report_type = 'power'
    elif 'monthly' in q or 'month' in q:
        report_type = 'monthly'
    else:
        report_type = 'weekly'

    # Detect date range
    end_dt   = datetime.now(timezone.utc)
    if 'monthly' in q or 'month' in q:
        start_dt = end_dt - timedelta(days=30)
        period   = 'monthly'
    else:
        start_dt = end_dt - timedelta(days=7)
        period   = 'weekly'

    return {
        'machine_id':  machine_id,
        'report_type': report_type,
        'period':      period,
        'start_dt':    start_dt,
        'end_dt':      end_dt,
    }


def _build_real_report_context(intent: dict) -> dict:
    """Fetch REAL data from TimescaleDB based on report intent."""
    mid      = intent['machine_id']
    start_dt = intent['start_dt']
    end_dt   = intent['end_dt']

    machine = execute_one(
        "SELECT machine_name, machine_type, location FROM machines WHERE id = %s",
        (mid,)
    )
    if not machine:
        return {}

    # Real stats from TimescaleDB
    stats = execute_one(
        """
        SELECT
            COUNT(*)                                    AS total_readings,
            ROUND(AVG(temperature)::numeric, 2)         AS avg_temp,
            ROUND(MAX(temperature)::numeric, 2)         AS max_temp,
            ROUND(MIN(temperature)::numeric, 2)         AS min_temp,
            ROUND(AVG(vibration)::numeric, 4)           AS avg_vibration,
            ROUND(MAX(vibration)::numeric, 4)           AS max_vibration,
            ROUND(AVG(rpm)::numeric, 1)                 AS avg_rpm,
            ROUND(AVG(power_consumption)::numeric, 2)   AS avg_power,
            ROUND(MAX(power_consumption)::numeric, 2)   AS max_power,
            SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) AS anomaly_count
        FROM machine_data
        WHERE machine_id = %s AND timestamp BETWEEN %s AND %s
        """,
        (mid, start_dt, end_dt)
    ) or {}

    # Real alerts
    alerts = execute_many(
        """
        SELECT alert_type, severity, message, timestamp
        FROM alerts
        WHERE machine_id = %s AND timestamp BETWEEN %s AND %s
        ORDER BY timestamp DESC LIMIT 10
        """,
        (mid, start_dt, end_dt)
    )

    # Uptime calculation
    period_secs       = (end_dt - start_dt).total_seconds()
    expected_readings = period_secs / 2
    total_readings    = int(stats.get('total_readings') or 0)
    uptime_pct        = round(min(100, (total_readings / max(expected_readings, 1)) * 100), 2)
    anomaly_count     = int(stats.get('anomaly_count') or 0)
    anomaly_rate      = round((anomaly_count / max(total_readings, 1)) * 100, 2)

    return {
        'machine_name':  machine['machine_name'],
        'machine_type':  machine['machine_type'],
        'location':      machine['location'],
        'period':        intent['period'],
        'start_dt':      start_dt.strftime('%d %b %Y'),
        'end_dt':        end_dt.strftime('%d %b %Y'),
        'uptime_pct':    uptime_pct,
        'total_readings':total_readings,
        'anomaly_count': anomaly_count,
        'anomaly_rate':  anomaly_rate,
        'avg_temp':      float(stats.get('avg_temp') or 0),
        'max_temp':      float(stats.get('max_temp') or 0),
        'min_temp':      float(stats.get('min_temp') or 0),
        'avg_vibration': float(stats.get('avg_vibration') or 0),
        'max_vibration': float(stats.get('max_vibration') or 0),
        'avg_rpm':       float(stats.get('avg_rpm') or 0),
        'avg_power':     float(stats.get('avg_power') or 0),
        'max_power':     float(stats.get('max_power') or 0),
        'alerts':        [dict(a) for a in alerts],
    }


def _format_real_report_text(data: dict, report_type: str) -> str:
    """Format real data into a readable report text for chat."""
    if not data:
        return "Could not fetch machine data. Please check machine ID."

    lines = [
        f"**{report_type.upper()} REPORT — {data['machine_name']} ({data['machine_type']})**",
        f"Period: {data['start_dt']} to {data['end_dt']} | Location: {data['location']}",
        "",
    ]

    if report_type == 'uptime':
        lines += [
            f"**Uptime & Reliability:**",
            f"• Estimated Uptime: **{data['uptime_pct']}%**",
            f"• Total Data Readings: {data['total_readings']}",
            f"• Anomaly Events: {data['anomaly_count']} ({data['anomaly_rate']}% anomaly rate)",
            "",
            f"**Telemetry Summary:**",
            f"• Avg Temperature: {data['avg_temp']}°C (Max: {data['max_temp']}°C)",
            f"• Avg Vibration: {data['avg_vibration']} mm/s (Max: {data['max_vibration']} mm/s)",
            f"• Avg RPM: {data['avg_rpm']}",
            f"• Avg Power: {data['avg_power']} W",
        ]
    elif report_type == 'temperature':
        lines += [
            f"**Temperature Report:**",
            f"• Average: {data['avg_temp']}°C",
            f"• Maximum: {data['max_temp']}°C",
            f"• Minimum: {data['min_temp']}°C",
            f"• Status: {'⚠ ELEVATED' if data['max_temp'] > 95 else '✅ NORMAL'}",
        ]
    elif report_type == 'vibration':
        lines += [
            f"**Vibration Report:**",
            f"• Average: {data['avg_vibration']} mm/s",
            f"• Maximum: {data['max_vibration']} mm/s",
            f"• Status: {'⚠ HIGH' if data['max_vibration'] > 0.4 else '✅ NORMAL'}",
        ]
    elif report_type == 'power':
        lines += [
            f"**Power Consumption Report:**",
            f"• Average: {data['avg_power']} W",
            f"• Maximum: {data['max_power']} W",
            f"• Status: {'⚠ HIGH' if data['max_power'] > 1500 else '✅ NORMAL'}",
        ]
    else:
        # Weekly/Monthly full report
        lines += [
            f"**Performance Summary:**",
            f"• Uptime: {data['uptime_pct']}%",
            f"• Total Readings: {data['total_readings']}",
            f"• Anomalies: {data['anomaly_count']} ({data['anomaly_rate']}%)",
            "",
            f"**Telemetry:**",
            f"• Temperature: Avg {data['avg_temp']}°C / Max {data['max_temp']}°C",
            f"• Vibration: Avg {data['avg_vibration']} mm/s / Max {data['max_vibration']} mm/s",
            f"• RPM: Avg {data['avg_rpm']}",
            f"• Power: Avg {data['avg_power']} W / Max {data['max_power']} W",
        ]

    # Alerts
    if data.get('alerts'):
        lines += ["", f"**Recent Alerts ({len(data['alerts'])}):**"]
        for a in data['alerts'][:5]:
            lines.append(f"• [{a['severity'].upper()}] {a['message'][:80]}")

    # Recommendation
    lines += [
        "",
        "**Recommendation:**",
    ]
    if data['anomaly_count'] > 0:
        lines.append(f"⚠ {data['anomaly_count']} anomalies detected — schedule inspection within 24 hours.")
    if data['max_temp'] > 95:
        lines.append("🌡 High temperature detected — check cooling system.")
    if data['max_vibration'] > 0.4:
        lines.append("📳 High vibration detected — check bearing condition.")
    if data['anomaly_count'] == 0 and data['max_temp'] <= 95 and data['max_vibration'] <= 0.4:
        lines.append("✅ Machine operating within normal parameters. Routine inspection in 7 days.")

    lines += ["", "Use the download buttons below to get the full detailed report in PDF or Excel format."]
    return "\n".join(lines)


@rag_bp.route("/ask-ai", methods=["POST"])
@jwt_required
def ask_ai():
    data     = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400
    if len(question) > 2000:
        return jsonify({"error": "Question too long"}), 400

    # ── Detect report intent ──────────────────────────────────
    intent = _detect_report_intent(question)

    if intent:
        # Fetch REAL data and format as report
        real_data   = _build_real_report_context(intent)
        report_text = _format_real_report_text(real_data, intent['report_type'])

        # Also ask RAG for additional context
        try:
            rag_result = rag_engine.query(question, user_id=g.user_id)
            # Combine real data report with RAG knowledge
            final_answer = report_text
        except Exception:
            final_answer = report_text

        return jsonify({
            "answer":      final_answer,
            "sources":     [],
            "telemetry":   "",
            "report_info": {
                "machine_id":  intent['machine_id'],
                "report_type": intent['period'],
                "has_report":  True,
            }
        }), 200

    # ── Normal RAG query ──────────────────────────────────────
    try:
        result = rag_engine.query(question, user_id=g.user_id)
        result["report_info"] = None
        return jsonify(result), 200
    except Exception as exc:
        logger.error("RAG query failed: %s", exc)
        return jsonify({"error": "AI assistant temporarily unavailable"}), 503


@rag_bp.route("/chat-history", methods=["GET"])
@jwt_required
def chat_history():
    limit = min(int(request.args.get("limit", "50")), 200)
    rows  = execute_many(
        """
        SELECT role, message, created_at
        FROM chat_history
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (g.user_id, limit),  # 1Week Projects
    )
    return jsonify([dict(r) for r in reversed(rows)]), 200


@rag_bp.route("/index-document", methods=["POST"])
@jwt_required
@roles_required("admin")
def index_document():
    data    = request.get_json(silent=True) or {}
    title   = (data.get("title")   or "").strip()
    content = (data.get("content") or "").strip()
    doc_type   = data.get("doc_type", "manual")
    machine_id = data.get("machine_id")
    if not title or not content:
        return jsonify({"error": "title and content required"}), 400
    doc_id = rag_engine.index_document(
        title=title, content=content,
        doc_type=doc_type, machine_id=machine_id,
    )
    return jsonify({"message": "Document indexed", "qdrant_id": doc_id}), 201
