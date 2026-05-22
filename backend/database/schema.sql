-- ============================================================
-- Factory AI Platform — TimescaleDB Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(180) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    role          VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'tech_staff', 'non_tech_staff')),
    is_active     BOOLEAN     DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- ── MACHINES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machines (
    id           SERIAL PRIMARY KEY,
    machine_name VARCHAR(80)  NOT NULL UNIQUE,
    location     VARCHAR(120),
    machine_type VARCHAR(80)  DEFAULT 'Industrial',
    status       VARCHAR(20)  DEFAULT 'normal'
                              CHECK (status IN ('normal','warning','critical','offline')),
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── MACHINE TELEMETRY (hypertable) ───────────────────────────
CREATE TABLE IF NOT EXISTS machine_data (
    id                BIGSERIAL,
    machine_id        INTEGER     NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    temperature       FLOAT       NOT NULL,
    vibration         FLOAT       NOT NULL,
    rpm               FLOAT       NOT NULL,
    power_consumption FLOAT       NOT NULL,
    pressure          FLOAT       DEFAULT 0,
    is_anomaly        BOOLEAN     DEFAULT FALSE,
    anomaly_score     FLOAT       DEFAULT 0,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('machine_data','timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_machine_data_machine_id  ON machine_data(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_machine_data_is_anomaly  ON machine_data(is_anomaly, timestamp DESC);

-- ── ALERTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id           BIGSERIAL PRIMARY KEY,
    machine_id   INTEGER     NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    alert_type   VARCHAR(60) NOT NULL,
    message      TEXT        NOT NULL,
    severity     VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')),
    is_resolved  BOOLEAN     DEFAULT FALSE,
    resolved_at  TIMESTAMPTZ,
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

-- ── MACHINE_6 PREDICTION HISTORY ─────────────────────────────
CREATE TABLE IF NOT EXISTS machine_6_predictions (
    id           BIGSERIAL PRIMARY KEY,
    health_score  FLOAT NOT NULL,
    failure_risk  FLOAT NOT NULL,
    rul_hours     FLOAT NOT NULL,
    fault_type    VARCHAR(60) DEFAULT 'none',
    confidence    FLOAT DEFAULT 1.0,
    status        VARCHAR(20) DEFAULT 'normal',
    motor_off     BOOLEAN DEFAULT FALSE,
    trend         FLOAT DEFAULT 0,
    -- Raw sensor snapshot
    temperature   FLOAT,
    v_rmsy        FLOAT,
    acoustic_rms  FLOAT,
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable(
    'machine_6_predictions', 'timestamp',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_m6_pred_timestamp
    ON machine_6_predictions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_machine_id ON alerts(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity, is_resolved);

-- ── REPORTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id           BIGSERIAL PRIMARY KEY,
    machine_id   INTEGER     REFERENCES machines(id) ON DELETE SET NULL,
    report_type  VARCHAR(40) NOT NULL,   -- 'weekly','monthly','custom','plant_wide'
    title        VARCHAR(200),
    content      JSONB       NOT NULL,
    generated_by INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_machine_id ON reports(machine_id, generated_at DESC);

-- ── RAG DOCUMENT STORE (metadata only — vectors in Qdrant) ───
CREATE TABLE IF NOT EXISTS rag_documents (
    id           BIGSERIAL PRIMARY KEY,
    doc_type     VARCHAR(60)  NOT NULL,  -- 'manual','guide','alert_explanation'
    title        VARCHAR(200) NOT NULL,
    content      TEXT         NOT NULL,
    machine_id   INTEGER      REFERENCES machines(id) ON DELETE SET NULL,
    qdrant_id    UUID         UNIQUE,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── CHAT HISTORY ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
    message    TEXT        NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id, created_at DESC);

-- ── SEED: default machines ────────────────────────────────────
INSERT INTO machines (machine_name, location, machine_type) VALUES
    ('Machine_1', 'Zone A - Bay 1', 'CNC Milling'),
    ('Machine_2', 'Zone A - Bay 2', 'Hydraulic Press'),
    ('Machine_3', 'Zone B - Bay 1', 'Conveyor Motor'),
    ('Machine_4', 'Zone B - Bay 2', 'Industrial Pump'),
    ('Machine_5', 'Zone C - Bay 1', 'Compressor')
ON CONFLICT (machine_name) DO NOTHING;

-- ── SEED: default admin user (password: Admin@1234) ──────────
-- password_hash below is bcrypt of "Admin@1234" — regenerate in prod
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User',
     'admin@factory.ai',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfn.UBJC2JiDdBOBu',
     'admin')
ON CONFLICT (email) DO NOTHING;

-- ── Continuous aggregate: hourly machine stats ────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS machine_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    machine_id,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG(temperature)       AS avg_temp,
    MAX(temperature)       AS max_temp,
    AVG(vibration)         AS avg_vibration,
    MAX(vibration)         AS max_vibration,
    AVG(rpm)               AS avg_rpm,
    AVG(power_consumption) AS avg_power,
    COUNT(*)               AS reading_count,
    SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) AS anomaly_count
FROM machine_data
GROUP BY machine_id, bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('machine_hourly_stats',
    start_offset => INTERVAL '3 hours',
    end_offset   => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);