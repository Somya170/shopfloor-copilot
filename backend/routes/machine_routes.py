"""
factory-ai-platform · routes/machine_routes.py
GET  /api/machines
GET  /api/machines/<id>
GET  /api/machines/<id>/data
GET  /api/machines/<id>/stats
GET  /api/alerts
POST /api/alerts/<id>/resolve
"""
import logging

from flask import Blueprint, g, jsonify, request

from database.db import execute_many, execute_one, execute_write
from database.cache import cache_get, cache_set
from services.auth_service import jwt_required, roles_required

logger = logging.getLogger(__name__)

machine_bp = Blueprint("machines", __name__, url_prefix="/api")


# ── Machines ─────────────────────────────────────────────────

@machine_bp.route("/machines", methods=["GET"])
@jwt_required
def list_machines():
    """All machines with their latest telemetry snapshot."""
    cache_key = "machines:list"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached), 200

    rows = execute_many(
        """
        SELECT
            m.id, m.machine_name, m.location, m.machine_type, m.status,
            md.temperature, md.vibration, md.rpm, md.power_consumption,
            md.is_anomaly, md.timestamp AS last_reading
        FROM machines m
        LEFT JOIN LATERAL (
            SELECT temperature, vibration, rpm, power_consumption, is_anomaly, timestamp
            FROM machine_data
            WHERE machine_id = m.id
            ORDER BY timestamp DESC
            LIMIT 1
        ) md ON TRUE
        ORDER BY m.id
        """
    )
    result = [dict(r) for r in rows]
    cache_set(cache_key, result, ttl=5)  # short TTL — data is live
    return jsonify(result), 200


@machine_bp.route("/machines/<int:machine_id>", methods=["GET"])
@jwt_required
def get_machine(machine_id: int):
    row = execute_one(
        "SELECT id, machine_name, location, machine_type, status, created_at FROM machines WHERE id = %s",
        (machine_id,),
    )
    if not row:
        return jsonify({"error": "Machine not found"}), 404
    return jsonify(dict(row)), 200


@machine_bp.route("/machines/<int:machine_id>/data", methods=["GET"])
@jwt_required
def machine_data(machine_id: int):
    """Paginated telemetry history for a machine."""
    limit  = min(int(request.args.get("limit",  "100")), 500)
    offset = int(request.args.get("offset", "0"))

    rows = execute_many(
        """
        SELECT id, temperature, vibration, rpm, power_consumption, pressure,
               is_anomaly, anomaly_score, timestamp
        FROM machine_data
        WHERE machine_id = %s
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
        """,
        (machine_id, limit, offset),
    )
    return jsonify([dict(r) for r in rows]), 200


@machine_bp.route("/machines/<int:machine_id>/stats", methods=["GET"])
@jwt_required
def machine_stats(machine_id: int):
    """Aggregate stats (last 24 hours)."""
    cache_key = f"machine:stats:{machine_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached), 200

    stats = execute_one(
        """
        SELECT
            COUNT(*)                                                AS total_readings,
            ROUND(AVG(temperature)::numeric, 2)                    AS avg_temp,
            ROUND(MAX(temperature)::numeric, 2)                    AS max_temp,
            ROUND(AVG(vibration)::numeric, 4)                      AS avg_vibration,
            ROUND(MAX(vibration)::numeric, 4)                      AS max_vibration,
            ROUND(AVG(rpm)::numeric, 1)                            AS avg_rpm,
            ROUND(AVG(power_consumption)::numeric, 2)              AS avg_power,
            SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END)            AS anomaly_count,
            ROUND(
                (SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END)::numeric
                / GREATEST(COUNT(*), 1)) * 100, 2
            )                                                       AS anomaly_rate_pct
        FROM machine_data
        WHERE machine_id = %s
          AND timestamp > NOW() - INTERVAL '24 hours'
        """,
        (machine_id,),
    )
    result = dict(stats) if stats else {}
    cache_set(cache_key, result, ttl=30)
    return jsonify(result), 200


# ── Alerts ───────────────────────────────────────────────────

@machine_bp.route("/alerts", methods=["GET"])
@jwt_required
def list_alerts():
    """Recent alerts, optionally filtered by severity / machine."""
    severity   = request.args.get("severity")
    machine_id = request.args.get("machine_id")
    limit      = min(int(request.args.get("limit", "50")), 200)
    resolved   = request.args.get("resolved", "false").lower() == "true"

    conditions = ["a.is_resolved = %s"]
    params: list = [resolved]

    if severity:
        conditions.append("a.severity = %s")
        params.append(severity)
    if machine_id:
        conditions.append("a.machine_id = %s")
        params.append(int(machine_id))

    where = " AND ".join(conditions)
    params.append(limit)

    rows = execute_many(
        f"""
        SELECT a.id, a.machine_id, m.machine_name, a.alert_type,
               a.message, a.severity, a.is_resolved, a.timestamp
        FROM alerts a
        JOIN machines m ON m.id = a.machine_id
        WHERE {where}
        ORDER BY a.timestamp DESC
        LIMIT %s
        """,
        tuple(params),
    )
    return jsonify([dict(r) for r in rows]), 200


@machine_bp.route("/alerts/<int:alert_id>/resolve", methods=["POST"])
@jwt_required
@roles_required("admin", "tech_staff")
def resolve_alert(alert_id: int):
    execute_write(
        "UPDATE alerts SET is_resolved = TRUE, resolved_at = NOW() WHERE id = %s",
        (alert_id,),
    )
    return jsonify({"message": "Alert resolved"}), 200


# ── Admin — user management ───────────────────────────────────

@machine_bp.route("/admin/users", methods=["GET"])
@jwt_required
@roles_required("admin")
def list_users():
    rows = execute_many(
        "SELECT id, name, email, role, is_active, created_at, last_login FROM users ORDER BY id"
    )
    return jsonify([dict(r) for r in rows]), 200


@machine_bp.route("/admin/users/<int:user_id>/toggle", methods=["POST"])
@jwt_required
@roles_required("admin")
def toggle_user(user_id: int):
    execute_write(
        "UPDATE users SET is_active = NOT is_active WHERE id = %s",
        (user_id,),
    )
@machine_bp.route("/anomaly-stats", methods=["GET"])
@jwt_required
def anomaly_stats():
    """Anomaly statistics for dashboard."""
    stats = execute_many(
        """
        SELECT
            m.machine_name,
            m.id as machine_id,
            COUNT(a.id) as total_alerts,
            SUM(CASE WHEN a.severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
            SUM(CASE WHEN a.severity = 'warning'  THEN 1 ELSE 0 END) as warning_count,
            SUM(CASE WHEN a.is_resolved = FALSE    THEN 1 ELSE 0 END) as active_count,
            MAX(a.timestamp) as last_alert
        FROM machines m
        LEFT JOIN alerts a ON a.machine_id = m.id
        GROUP BY m.id, m.machine_name
        ORDER BY total_alerts DESC
        """
    )

    recent = execute_many(
        """
        SELECT
            a.id, a.machine_id, m.machine_name,
            a.alert_type, a.message, a.severity,
            a.is_resolved, a.timestamp,
            md.anomaly_score
        FROM alerts a
        JOIN machines m ON m.id = a.machine_id
        LEFT JOIN LATERAL (
            SELECT anomaly_score FROM machine_data
            WHERE machine_id = a.machine_id
            ORDER BY timestamp DESC LIMIT 1
        ) md ON TRUE
        ORDER BY a.timestamp DESC
        LIMIT 50
        """
    )

    severity_counts = execute_one(
        """
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN severity = 'critical' AND is_resolved = FALSE THEN 1 ELSE 0 END) as active_critical,
            SUM(CASE WHEN severity = 'warning'  AND is_resolved = FALSE THEN 1 ELSE 0 END) as active_warning,
            SUM(CASE WHEN is_resolved = TRUE  THEN 1 ELSE 0 END) as resolved
        FROM alerts
        """
    )

    return jsonify({
        "machine_stats":   [dict(r) for r in stats],
        "recent_alerts":   [dict(r) for r in recent],
        "severity_counts": dict(severity_counts) if severity_counts else {},
    }), 200
    return jsonify({"message": "User status toggled"}), 200