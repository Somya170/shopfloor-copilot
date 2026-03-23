"""
factory-ai-platform · database/cache.py
Redis wrapper — caching, pub/sub helpers.
"""
import json
import logging
from typing import Any

import redis

from config.settings import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def init_redis() -> None:
    global _redis_client
    _redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=5,
    )
    _redis_client.ping()
    logger.info("Redis connected at %s:%d", settings.REDIS_HOST, settings.REDIS_PORT)


def get_redis() -> redis.Redis:
    if _redis_client is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    return _redis_client


# ── Convenience helpers ─────────────────────────────────────

def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    get_redis().setex(key, ttl, json.dumps(value, default=str))


def cache_get(key: str) -> Any | None:
    raw = get_redis().get(key)
    return json.loads(raw) if raw else None


def cache_delete(key: str) -> None:
    get_redis().delete(key)


def cache_delete_pattern(pattern: str) -> None:
    r = get_redis()
    keys = r.keys(pattern)
    if keys:
        r.delete(*keys)


def publish(channel: str, data: Any) -> None:
    get_redis().publish(channel, json.dumps(data, default=str))