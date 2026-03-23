"""
factory-ai-platform · routes/rag_routes.py
POST /api/ask-ai
GET  /api/chat-history
POST /api/index-document
"""
import logging

from flask import Blueprint, g, jsonify, request

from database.db import execute_many
from services.auth_service import jwt_required, roles_required
from services.rag_engine import rag_engine

logger = logging.getLogger(__name__)

rag_bp = Blueprint("rag", __name__, url_prefix="/api")


@rag_bp.route("/ask-ai", methods=["POST"])
@jwt_required
def ask_ai():
    """Full RAG query — accessible to all authenticated roles."""
    data     = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400
    if len(question) > 2000:
        return jsonify({"error": "Question too long (max 2000 chars)"}), 400

    try:
        result = rag_engine.query(question, user_id=g.user_id)
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
        (g.user_id, limit),
    )
    # return in chronological order
    return jsonify([dict(r) for r in reversed(rows)]), 200


@rag_bp.route("/index-document", methods=["POST"])
@jwt_required
@roles_required("admin")
def index_document():
    """Admin endpoint to add a new document to the knowledge base."""
    data    = request.get_json(silent=True) or {}
    title   = (data.get("title")   or "").strip()
    content = (data.get("content") or "").strip()
    doc_type   = data.get("doc_type", "manual")
    machine_id = data.get("machine_id")

    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400

    doc_id = rag_engine.index_document(
        title=title,
        content=content,
        doc_type=doc_type,
        machine_id=machine_id,
    )
    return jsonify({"message": "Document indexed", "qdrant_id": doc_id}), 201