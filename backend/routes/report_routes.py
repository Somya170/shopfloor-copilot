"""
factory-ai-platform · routes/report_routes.py
POST /api/generate-report
GET  /api/reports
GET  /api/reports/<id>
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database.db import execute_many, execute_one
from services.auth_service import jwt_required, roles_required
from services.report_generator import report_generator, get_weekly_range, get_monthly_range

logger = logging.getLogger(__name__)

report_bp = Blueprint("reports", __name__, url_prefix="/api")


@report_bp.route("/generate-report", methods=["POST"])
@jwt_required
@roles_required("admin", "tech_staff")
def generate_report():
    data        = request.get_json(silent=True) or {}
    report_type = data.get("report_type", "weekly")   # weekly | monthly | custom | plant_wide
    machine_id  = data.get("machine_id")               # None for plant-wide

    # ── resolve date range ─────────────────────────────────
    if report_type == "weekly":
        start_dt, end_dt = get_weekly_range()
    elif report_type == "monthly":
        start_dt, end_dt = get_monthly_range()
    elif report_type == "custom":
        try:
            start_dt = datetime.fromisoformat(data["start_date"]).replace(tzinfo=timezone.utc)
            end_dt   = datetime.fromisoformat(data["end_date"]).replace(tzinfo=timezone.utc)
        except (KeyError, ValueError) as exc:
            return jsonify({"error": f"Invalid date format: {exc}"}), 400
    elif report_type == "plant_wide":
        start_dt, end_dt = get_weekly_range()
    else:
        return jsonify({"error": f"Unknown report_type '{report_type}'"}), 400

    try:
        if report_type == "plant_wide" or machine_id is None:
            report = report_generator.generate_plant_report(
                report_type="plant_wide",
                start_dt=start_dt,
                end_dt=end_dt,
                generated_by=g.user_id,
            )
        else:
            report = report_generator.generate_machine_report(
                machine_id=int(machine_id),
                report_type=report_type,
                start_dt=start_dt,
                end_dt=end_dt,
                generated_by=g.user_id,
            )
        return jsonify(report), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        return jsonify({"error": "Report generation failed"}), 500


@report_bp.route("/reports", methods=["GET"])
@jwt_required
def list_reports():
    machine_id = request.args.get("machine_id")
    limit      = min(int(request.args.get("limit", "20")), 100)

    if machine_id:
        rows = execute_many(
            """
            SELECT id, machine_id, report_type, title, generated_by, generated_at
            FROM reports WHERE machine_id = %s ORDER BY generated_at DESC LIMIT %s
            """,
            (int(machine_id), limit),
        )
    else:
        rows = execute_many(
            """
            SELECT id, machine_id, report_type, title, generated_by, generated_at
            FROM reports ORDER BY generated_at DESC LIMIT %s
            """,
            (limit,),
        )
    return jsonify([dict(r) for r in rows]), 200


@report_bp.route("/reports/<int:report_id>", methods=["GET"])
@jwt_required
def get_report(report_id: int):
    row = execute_one("SELECT * FROM reports WHERE id = %s", (report_id,))
    if not row:
        return jsonify({"error": "Report not found"}), 404
    result = dict(row)
    # content is already JSONB — psycopg2 returns it as a dict
    return jsonify(result), 200