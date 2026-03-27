"""
factory-ai-platform · routes/report_routes.py
POST /api/generate-report  — generate PDF or Excel
GET  /api/reports          — list reports
GET  /api/reports/<id>     — get report
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request, send_file
import io

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
    report_type = data.get("report_type", "weekly")
    machine_id  = data.get("machine_id")
    fmt         = data.get("format", "pdf").lower()   # 'pdf' or 'excel'

    # ── Date range ──────────────────────────────────────────
    if report_type == "weekly":
        start_dt, end_dt = get_weekly_range()
    elif report_type == "monthly":
        start_dt, end_dt = get_monthly_range()
    elif report_type == "custom":
        try:
            start_dt = datetime.fromisoformat(data["start_date"]).replace(tzinfo=timezone.utc)
            end_dt   = datetime.fromisoformat(data["end_date"]).replace(tzinfo=timezone.utc)
        except (KeyError, ValueError) as exc:
            return jsonify({"error": f"Invalid date: {exc}"}), 400
    else:
        return jsonify({"error": f"Unknown report_type '{report_type}'"}), 400

    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    try:
        if fmt == "excel":
            file_bytes = report_generator.generate_excel(
                machine_id=int(machine_id),
                report_type=report_type,
                start_dt=start_dt,
                end_dt=end_dt,
                generated_by=g.user_id,
            )
            filename = f"Machine_{machine_id}_{report_type}_report.xlsx"
            mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            file_bytes = report_generator.generate_pdf(
                machine_id=int(machine_id),
                report_type=report_type,
                start_dt=start_dt,
                end_dt=end_dt,
                generated_by=g.user_id,
            )
            filename = f"Machine_{machine_id}_{report_type}_report.pdf"
            mimetype = "application/pdf"

        return send_file(
            io.BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename,
        )

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
            "SELECT id, machine_id, report_type, title, generated_by, generated_at FROM reports WHERE machine_id = %s ORDER BY generated_at DESC LIMIT %s",
            (int(machine_id), limit),
        )
    else:
        rows = execute_many(
            "SELECT id, machine_id, report_type, title, generated_by, generated_at FROM reports ORDER BY generated_at DESC LIMIT %s",
            (limit,),
        )
    return jsonify([dict(r) for r in rows]), 200


@report_bp.route("/reports/<int:report_id>", methods=["GET"])
@jwt_required
def get_report(report_id: int):
    row = execute_one("SELECT * FROM reports WHERE id = %s", (report_id,))
    if not row:
        return jsonify({"error": "Report not found"}), 404
    return jsonify(dict(row)), 200