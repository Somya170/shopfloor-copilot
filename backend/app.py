"""
factory-ai-platform · app.py
Flask application factory + WebSocket server (Flask-SocketIO).
"""
import json
import logging
import os
import sys
import threading
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

# ── path setup ────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import settings
from database.db import init_pool, run_schema
from database.cache import init_redis, get_redis

# ── logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def create_app() -> tuple[Flask, SocketIO]:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.SECRET_KEY

    # ── CORS ──────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": settings.CORS_ORIGINS}}, supports_credentials=True)

    # ── SocketIO ──────────────────────────────────────────────
    socketio = SocketIO(
        app,
        cors_allowed_origins=settings.CORS_ORIGINS,
        async_mode="threading",
        logger=settings.DEBUG,
        engineio_logger=settings.DEBUG,
    )

    # ── Blueprints ────────────────────────────────────────────
    from routes.auth_routes    import auth_bp
    from routes.machine_routes import machine_bp
    from routes.rag_routes     import rag_bp
    from routes.report_routes  import report_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(machine_bp)
    app.register_blueprint(rag_bp)
    app.register_blueprint(report_bp)

    # ── Health check ──────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status":  "ok",
            "version": settings.VERSION,
            "app":     settings.APP_NAME,
        }), 200

    # ── Error handlers ────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Unhandled exception")
        return jsonify({"error": "Internal server error"}), 500

    # ── WebSocket events ──────────────────────────────────────
    @socketio.on("connect")
    def on_connect(auth):
        logger.info("WS client connected")

    @socketio.on("disconnect")
    def on_disconnect():
        logger.info("WS client disconnected")

    @socketio.on("subscribe_machine")
    def on_subscribe(data):
        """Client can subscribe to a specific machine's telemetry."""
        from flask_socketio import join_room
        machine_id = data.get("machine_id")
        if machine_id:
            join_room(f"machine_{machine_id}")
            logger.debug("Client subscribed to machine_%s", machine_id)

    return app, socketio


def _redis_listener(socketio: SocketIO) -> None:
    """Background thread: subscribe to Redis pub/sub and emit to WebSocket clients."""
    r      = get_redis()
    pubsub = r.pubsub()
    pubsub.subscribe("telemetry", "alerts")
    logger.info("Redis pub/sub listener started")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data    = json.loads(message["data"])
            channel = message["channel"]

            if channel == "telemetry":
                machine_id = data.get("machine_id")
                socketio.emit("telemetry", data)
                if machine_id:
                    socketio.emit("telemetry", data, room=f"machine_{machine_id}")

            elif channel == "alerts":
                socketio.emit("alert", data)

        except Exception as exc:
            logger.error("Redis listener error: %s", exc)


def _bootstrap_services() -> None:
    """Initialise DB pool, apply schema, start background services."""
    # DB
    init_pool()
    schema_path = Path(__file__).parent / "database" / "schema.sql"
    if schema_path.exists():
        try:
            run_schema(str(schema_path))
        except Exception as exc:
            logger.warning("Schema run skipped (may already be applied): %s", exc)

    # Redis
    try:
        init_redis()
    except Exception as exc:
        logger.warning("Redis unavailable — pub/sub disabled: %s", exc)

    # Anomaly detector
    try:
        from services.anomaly_detector import detector
        detector.start()
    except Exception as exc:
        logger.warning("Anomaly detector startup failed: %s", exc)

    # Machine simulator
    try:
        from services.machine_simulator import simulator
        simulator.start()
    except Exception as exc:
        logger.warning("Simulator startup failed: %s", exc)

    # RAG engine
    try:
        from services.rag_engine import rag_engine
        rag_engine.init()
    except Exception as exc:
        logger.warning("RAG engine startup failed: %s", exc)


# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    _bootstrap_services()

    app, socketio = create_app()

    # Start Redis listener in background thread
    try:
        listener_thread = threading.Thread(
            target=_redis_listener,
            args=(socketio,),
            daemon=True,
            name="redis-listener",
        )
        listener_thread.start()
    except Exception as exc:
        logger.warning("Redis listener thread failed: %s", exc)

    port = int(os.getenv("PORT", "5000"))
    logger.info("Starting %s on port %d", settings.APP_NAME, port)
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=settings.DEBUG,
        use_reloader=False,   # reloader breaks background threads
        allow_unsafe_werkzeug=True,
    )