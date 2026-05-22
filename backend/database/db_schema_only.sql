--
-- PostgreSQL database dump
--

-- Dumped from database version 12.22 (Ubuntu 12.22-0ubuntu0.20.04.4)
-- Dumped by pg_dump version 12.22 (Ubuntu 12.22-0ubuntu0.20.04.4)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: timescaledb; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION timescaledb IS 'Enables scalable inserts and complex queries for time-series data (Community Edition)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: machine_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_data (
    id bigint NOT NULL,
    machine_id integer NOT NULL,
    temperature double precision NOT NULL,
    vibration double precision NOT NULL,
    rpm double precision NOT NULL,
    power_consumption double precision NOT NULL,
    pressure double precision DEFAULT 0,
    is_anomaly boolean DEFAULT false,
    anomaly_score double precision DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.machine_data OWNER TO postgres;

--
-- Name: _direct_view_2; Type: VIEW; Schema: _timescaledb_internal; Owner: postgres
--

CREATE VIEW _timescaledb_internal._direct_view_2 AS
 SELECT machine_data.machine_id,
    public.time_bucket('01:00:00'::interval, machine_data."timestamp") AS bucket,
    avg(machine_data.temperature) AS avg_temp,
    max(machine_data.temperature) AS max_temp,
    avg(machine_data.vibration) AS avg_vibration,
    max(machine_data.vibration) AS max_vibration,
    avg(machine_data.rpm) AS avg_rpm,
    avg(machine_data.power_consumption) AS avg_power,
    count(*) AS reading_count,
    sum(
        CASE
            WHEN machine_data.is_anomaly THEN 1
            ELSE 0
        END) AS anomaly_count
   FROM public.machine_data
  GROUP BY machine_data.machine_id, (public.time_bucket('01:00:00'::interval, machine_data."timestamp"));


ALTER TABLE _timescaledb_internal._direct_view_2 OWNER TO postgres;

--
-- Name: _hyper_1_11_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_11_chunk (
    CONSTRAINT constraint_11 CHECK ((("timestamp" >= '2026-05-14 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-05-21 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_11_chunk OWNER TO postgres;

--
-- Name: _hyper_1_1_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_1_chunk (
    CONSTRAINT constraint_1 CHECK ((("timestamp" >= '2026-03-19 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-03-26 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_1_chunk OWNER TO postgres;

--
-- Name: _hyper_1_3_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_3_chunk (
    CONSTRAINT constraint_3 CHECK ((("timestamp" >= '2026-03-26 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-04-02 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_3_chunk OWNER TO postgres;

--
-- Name: _hyper_1_4_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_4_chunk (
    CONSTRAINT constraint_4 CHECK ((("timestamp" >= '2026-04-02 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-04-09 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_4_chunk OWNER TO postgres;

--
-- Name: _hyper_1_5_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_5_chunk (
    CONSTRAINT constraint_5 CHECK ((("timestamp" >= '2026-04-09 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-04-16 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_5_chunk OWNER TO postgres;

--
-- Name: _hyper_1_6_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_6_chunk (
    CONSTRAINT constraint_6 CHECK ((("timestamp" >= '2026-04-16 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-04-23 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_6_chunk OWNER TO postgres;

--
-- Name: _hyper_1_7_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_7_chunk (
    CONSTRAINT constraint_7 CHECK ((("timestamp" >= '2026-04-23 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-04-30 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_7_chunk OWNER TO postgres;

--
-- Name: _hyper_1_8_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_8_chunk (
    CONSTRAINT constraint_8 CHECK ((("timestamp" >= '2026-04-30 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-05-07 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_8_chunk OWNER TO postgres;

--
-- Name: _hyper_1_9_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_1_9_chunk (
    CONSTRAINT constraint_9 CHECK ((("timestamp" >= '2026-05-07 05:30:00+05:30'::timestamp with time zone) AND ("timestamp" < '2026-05-14 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (public.machine_data);


ALTER TABLE _timescaledb_internal._hyper_1_9_chunk OWNER TO postgres;

--
-- Name: _materialized_hypertable_2; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_2 (
    machine_id integer,
    bucket timestamp with time zone NOT NULL,
    avg_temp double precision,
    max_temp double precision,
    avg_vibration double precision,
    max_vibration double precision,
    avg_rpm double precision,
    avg_power double precision,
    reading_count bigint,
    anomaly_count bigint
);


ALTER TABLE _timescaledb_internal._materialized_hypertable_2 OWNER TO postgres;

--
-- Name: _hyper_2_10_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_2_10_chunk (
    CONSTRAINT constraint_10 CHECK (((bucket >= '2026-05-07 05:30:00+05:30'::timestamp with time zone) AND (bucket < '2026-07-16 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (_timescaledb_internal._materialized_hypertable_2);


ALTER TABLE _timescaledb_internal._hyper_2_10_chunk OWNER TO postgres;

--
-- Name: _hyper_2_2_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TABLE _timescaledb_internal._hyper_2_2_chunk (
    CONSTRAINT constraint_2 CHECK (((bucket >= '2026-02-26 05:30:00+05:30'::timestamp with time zone) AND (bucket < '2026-05-07 05:30:00+05:30'::timestamp with time zone)))
)
INHERITS (_timescaledb_internal._materialized_hypertable_2);


ALTER TABLE _timescaledb_internal._hyper_2_2_chunk OWNER TO postgres;

--
-- Name: _partial_view_2; Type: VIEW; Schema: _timescaledb_internal; Owner: postgres
--

CREATE VIEW _timescaledb_internal._partial_view_2 AS
 SELECT machine_data.machine_id,
    public.time_bucket('01:00:00'::interval, machine_data."timestamp") AS bucket,
    avg(machine_data.temperature) AS avg_temp,
    max(machine_data.temperature) AS max_temp,
    avg(machine_data.vibration) AS avg_vibration,
    max(machine_data.vibration) AS max_vibration,
    avg(machine_data.rpm) AS avg_rpm,
    avg(machine_data.power_consumption) AS avg_power,
    count(*) AS reading_count,
    sum(
        CASE
            WHEN machine_data.is_anomaly THEN 1
            ELSE 0
        END) AS anomaly_count
   FROM public.machine_data
  GROUP BY machine_data.machine_id, (public.time_bucket('01:00:00'::interval, machine_data."timestamp"));


ALTER TABLE _timescaledb_internal._partial_view_2 OWNER TO postgres;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id bigint NOT NULL,
    machine_id integer NOT NULL,
    alert_type character varying(60) NOT NULL,
    message text NOT NULL,
    severity character varying(20) NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT alerts_severity_check CHECK (((severity)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.alerts_id_seq OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: chat_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_history (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_history_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[])))
);


ALTER TABLE public.chat_history OWNER TO postgres;

--
-- Name: chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_history_id_seq OWNER TO postgres;

--
-- Name: chat_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_history_id_seq OWNED BY public.chat_history.id;


--
-- Name: machine_6_predictions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machine_6_predictions (
    id bigint NOT NULL,
    health_score double precision NOT NULL,
    failure_risk double precision NOT NULL,
    rul_hours double precision NOT NULL,
    fault_type character varying(60) DEFAULT 'none'::character varying,
    confidence double precision DEFAULT 1.0,
    status character varying(20) DEFAULT 'normal'::character varying,
    motor_off boolean DEFAULT false,
    trend double precision DEFAULT 0,
    temperature double precision,
    v_rmsy double precision,
    acoustic_rms double precision,
    "timestamp" timestamp with time zone DEFAULT now()
);


ALTER TABLE public.machine_6_predictions OWNER TO postgres;

--
-- Name: machine_6_predictions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.machine_6_predictions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.machine_6_predictions_id_seq OWNER TO postgres;

--
-- Name: machine_6_predictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.machine_6_predictions_id_seq OWNED BY public.machine_6_predictions.id;


--
-- Name: machine_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.machine_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.machine_data_id_seq OWNER TO postgres;

--
-- Name: machine_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.machine_data_id_seq OWNED BY public.machine_data.id;


--
-- Name: machine_hourly_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.machine_hourly_stats AS
 SELECT _materialized_hypertable_2.machine_id,
    _materialized_hypertable_2.bucket,
    _materialized_hypertable_2.avg_temp,
    _materialized_hypertable_2.max_temp,
    _materialized_hypertable_2.avg_vibration,
    _materialized_hypertable_2.max_vibration,
    _materialized_hypertable_2.avg_rpm,
    _materialized_hypertable_2.avg_power,
    _materialized_hypertable_2.reading_count,
    _materialized_hypertable_2.anomaly_count
   FROM _timescaledb_internal._materialized_hypertable_2
  WHERE (_materialized_hypertable_2.bucket < COALESCE(_timescaledb_internal.to_timestamp(_timescaledb_internal.cagg_watermark(2)), '-infinity'::timestamp with time zone))
UNION ALL
 SELECT machine_data.machine_id,
    public.time_bucket('01:00:00'::interval, machine_data."timestamp") AS bucket,
    avg(machine_data.temperature) AS avg_temp,
    max(machine_data.temperature) AS max_temp,
    avg(machine_data.vibration) AS avg_vibration,
    max(machine_data.vibration) AS max_vibration,
    avg(machine_data.rpm) AS avg_rpm,
    avg(machine_data.power_consumption) AS avg_power,
    count(*) AS reading_count,
    sum(
        CASE
            WHEN machine_data.is_anomaly THEN 1
            ELSE 0
        END) AS anomaly_count
   FROM public.machine_data
  WHERE (machine_data."timestamp" >= COALESCE(_timescaledb_internal.to_timestamp(_timescaledb_internal.cagg_watermark(2)), '-infinity'::timestamp with time zone))
  GROUP BY machine_data.machine_id, (public.time_bucket('01:00:00'::interval, machine_data."timestamp"));


ALTER TABLE public.machine_hourly_stats OWNER TO postgres;

--
-- Name: machines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    machine_name character varying(80) NOT NULL,
    location character varying(120),
    machine_type character varying(80) DEFAULT 'Industrial'::character varying,
    status character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT machines_status_check CHECK (((status)::text = ANY ((ARRAY['normal'::character varying, 'warning'::character varying, 'critical'::character varying, 'offline'::character varying])::text[])))
);


ALTER TABLE public.machines OWNER TO postgres;

--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.machines_id_seq OWNER TO postgres;

--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: rag_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rag_documents (
    id bigint NOT NULL,
    doc_type character varying(60) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    machine_id integer,
    qdrant_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rag_documents OWNER TO postgres;

--
-- Name: rag_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rag_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rag_documents_id_seq OWNER TO postgres;

--
-- Name: rag_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rag_documents_id_seq OWNED BY public.rag_documents.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id bigint NOT NULL,
    machine_id integer,
    report_type character varying(40) NOT NULL,
    title character varying(200),
    content jsonb NOT NULL,
    generated_by integer,
    generated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(180) NOT NULL,
    password_hash text NOT NULL,
    role character varying(30) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'tech_staff'::character varying, 'non_tech_staff'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: _hyper_1_11_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_11_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_11_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_11_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_11_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_1_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_1_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_1_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_1_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_1_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_3_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_3_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_3_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_3_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_3_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_4_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_4_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_4_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_4_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_4_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_5_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_5_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_5_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_5_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_5_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_6_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_6_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_6_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_6_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_6_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_7_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_7_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_7_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_7_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_7_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_8_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_8_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_8_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_8_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_8_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: _hyper_1_9_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: _hyper_1_9_chunk pressure; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk ALTER COLUMN pressure SET DEFAULT 0;


--
-- Name: _hyper_1_9_chunk is_anomaly; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk ALTER COLUMN is_anomaly SET DEFAULT false;


--
-- Name: _hyper_1_9_chunk anomaly_score; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk ALTER COLUMN anomaly_score SET DEFAULT 0;


--
-- Name: _hyper_1_9_chunk timestamp; Type: DEFAULT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk ALTER COLUMN "timestamp" SET DEFAULT now();


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: chat_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history ALTER COLUMN id SET DEFAULT nextval('public.chat_history_id_seq'::regclass);


--
-- Name: machine_6_predictions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_6_predictions ALTER COLUMN id SET DEFAULT nextval('public.machine_6_predictions_id_seq'::regclass);


--
-- Name: machine_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_data ALTER COLUMN id SET DEFAULT nextval('public.machine_data_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: rag_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_documents ALTER COLUMN id SET DEFAULT nextval('public.rag_documents_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: chat_history chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);


--
-- Name: machine_6_predictions machine_6_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_6_predictions
    ADD CONSTRAINT machine_6_predictions_pkey PRIMARY KEY (id);


--
-- Name: machines machines_machine_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_name_key UNIQUE (machine_name);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: rag_documents rag_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_documents
    ADD CONSTRAINT rag_documents_pkey PRIMARY KEY (id);


--
-- Name: rag_documents rag_documents_qdrant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_documents
    ADD CONSTRAINT rag_documents_qdrant_id_key UNIQUE (qdrant_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: _hyper_1_11_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_11_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_11_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_11_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_11_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_11_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_11_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_11_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_11_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_1_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_1_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_1_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_1_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_1_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_1_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_1_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_1_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_1_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_3_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_3_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_3_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_3_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_3_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_3_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_3_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_3_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_3_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_4_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_4_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_4_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_4_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_4_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_4_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_4_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_4_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_4_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_5_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_5_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_5_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_5_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_5_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_5_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_5_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_5_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_5_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_6_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_6_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_6_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_6_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_6_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_6_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_6_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_6_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_6_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_7_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_7_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_7_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_7_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_7_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_7_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_7_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_7_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_7_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_8_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_8_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_8_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_8_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_8_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_8_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_8_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_8_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_8_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_9_chunk_idx_machine_data_is_anomaly; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_9_chunk_idx_machine_data_is_anomaly ON _timescaledb_internal._hyper_1_9_chunk USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: _hyper_1_9_chunk_idx_machine_data_machine_id; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_9_chunk_idx_machine_data_machine_id ON _timescaledb_internal._hyper_1_9_chunk USING btree (machine_id, "timestamp" DESC);


--
-- Name: _hyper_1_9_chunk_machine_data_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_1_9_chunk_machine_data_timestamp_idx ON _timescaledb_internal._hyper_1_9_chunk USING btree ("timestamp" DESC);


--
-- Name: _hyper_2_10_chunk__materialized_hypertable_2_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_2_10_chunk__materialized_hypertable_2_bucket_idx ON _timescaledb_internal._hyper_2_10_chunk USING btree (bucket DESC);


--
-- Name: _hyper_2_10_chunk__materialized_hypertable_2_machine_id_bucket_; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_2_10_chunk__materialized_hypertable_2_machine_id_bucket_ ON _timescaledb_internal._hyper_2_10_chunk USING btree (machine_id, bucket DESC);


--
-- Name: _hyper_2_2_chunk__materialized_hypertable_2_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_2_2_chunk__materialized_hypertable_2_bucket_idx ON _timescaledb_internal._hyper_2_2_chunk USING btree (bucket DESC);


--
-- Name: _hyper_2_2_chunk__materialized_hypertable_2_machine_id_bucket_i; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _hyper_2_2_chunk__materialized_hypertable_2_machine_id_bucket_i ON _timescaledb_internal._hyper_2_2_chunk USING btree (machine_id, bucket DESC);


--
-- Name: _materialized_hypertable_2_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _materialized_hypertable_2_bucket_idx ON _timescaledb_internal._materialized_hypertable_2 USING btree (bucket DESC);


--
-- Name: _materialized_hypertable_2_machine_id_bucket_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: postgres
--

CREATE INDEX _materialized_hypertable_2_machine_id_bucket_idx ON _timescaledb_internal._materialized_hypertable_2 USING btree (machine_id, bucket DESC);


--
-- Name: idx_alerts_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_machine_id ON public.alerts USING btree (machine_id, "timestamp" DESC);


--
-- Name: idx_alerts_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_severity ON public.alerts USING btree (severity, is_resolved);


--
-- Name: idx_chat_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_user_id ON public.chat_history USING btree (user_id, created_at DESC);


--
-- Name: idx_machine_data_is_anomaly; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_data_is_anomaly ON public.machine_data USING btree (is_anomaly, "timestamp" DESC);


--
-- Name: idx_machine_data_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machine_data_machine_id ON public.machine_data USING btree (machine_id, "timestamp" DESC);


--
-- Name: idx_reports_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_machine_id ON public.reports USING btree (machine_id, generated_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: machine_data_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX machine_data_timestamp_idx ON public.machine_data USING btree ("timestamp" DESC);


--
-- Name: _hyper_1_11_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_11_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_1_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_1_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_3_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_3_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_4_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_4_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_5_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_5_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_6_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_6_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_7_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_7_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_8_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_8_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _hyper_1_9_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_9_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: _materialized_hypertable_2 ts_insert_blocker; Type: TRIGGER; Schema: _timescaledb_internal; Owner: postgres
--

CREATE TRIGGER ts_insert_blocker BEFORE INSERT ON _timescaledb_internal._materialized_hypertable_2 FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.insert_blocker();


--
-- Name: machine_data ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON public.machine_data FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.continuous_agg_invalidation_trigger('1');


--
-- Name: machine_data ts_insert_blocker; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ts_insert_blocker BEFORE INSERT ON public.machine_data FOR EACH ROW EXECUTE FUNCTION _timescaledb_internal.insert_blocker();


--
-- Name: _hyper_1_11_chunk 11_9_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_11_chunk
    ADD CONSTRAINT "11_9_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_1_chunk 1_1_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk
    ADD CONSTRAINT "1_1_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_3_chunk 3_2_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_3_chunk
    ADD CONSTRAINT "3_2_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_4_chunk 4_3_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_4_chunk
    ADD CONSTRAINT "4_3_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_5_chunk 5_4_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_5_chunk
    ADD CONSTRAINT "5_4_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_6_chunk 6_5_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_6_chunk
    ADD CONSTRAINT "6_5_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_7_chunk 7_6_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_7_chunk
    ADD CONSTRAINT "7_6_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_8_chunk 8_7_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_8_chunk
    ADD CONSTRAINT "8_7_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: _hyper_1_9_chunk 9_8_machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: _timescaledb_internal; Owner: postgres
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_9_chunk
    ADD CONSTRAINT "9_8_machine_data_machine_id_fkey" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: chat_history chat_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: machine_data machine_data_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machine_data
    ADD CONSTRAINT machine_data_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: rag_documents rag_documents_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_documents
    ADD CONSTRAINT rag_documents_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: reports reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

