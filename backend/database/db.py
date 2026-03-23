"""
factory-ai-platform · database/db.py
PostgreSQL / TimescaleDB connection pool using psycopg2.
"""
import logging
from contextlib import contextmanager
from typing import Any, Generator

import psycopg2
import psycopg2.pool
import psycopg2.extras

from config.settings import settings

logger = logging.getLogger(__name__)

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def init_pool(minconn: int = 2, maxconn: int = 20) -> None:
    """Initialise the connection pool. Call once at app startup."""
    global _pool
    _pool = psycopg2.pool.ThreadedConnectionPool(
        minconn,
        maxconn,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        cursor_factory=psycopg2.extras.RealDictCursor,
        connect_timeout=10,
    )
    logger.info("Database connection pool created (min=%d max=%d)", minconn, maxconn)


def close_pool() -> None:
    """Close all connections. Call on shutdown."""
    if _pool:
        _pool.closeall()
        logger.info("Database connection pool closed")


@contextmanager
def get_db() -> Generator[psycopg2.extensions.connection, None, None]:
    """Context manager that yields a checked-out connection."""
    if _pool is None:
        raise RuntimeError("DB pool not initialised — call init_pool() first")
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def execute_one(sql: str, params: tuple = ()) -> dict | None:
    """Execute a query that returns at most one row."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def execute_many(sql: str, params: tuple = ()) -> list[dict]:
    """Execute a query that returns multiple rows."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall() or []


def execute_write(sql: str, params: tuple = ()) -> Any:
    """Execute INSERT/UPDATE/DELETE and return lastrowid or rowcount."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            try:
                return cur.fetchone()
            except Exception:
                return None


def run_schema(schema_path: str) -> None:
    """Run a SQL file (idempotent migrations)."""
    with open(schema_path, "r") as f:
        sql = f.read()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    logger.info("Schema applied from %s", schema_path)