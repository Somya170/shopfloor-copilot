# 🏭 Shopfloor Copilot

<div align="center">

![Shopfloor Copilot](https://img.shields.io/badge/Shopfloor-Copilot-0057A8?style=for-the-badge&logo=nvidia&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.0.0-E31837?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Jetson%20AGX%20Orin-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-gray?style=for-the-badge)

**AI-Powered Industrial Manufacturing Monitoring Platform**

*RAG-powered compliance queries · Real-time machine monitoring · Anomaly detection · Built for Industry 4.0*

**Developed by [Yash Technologies](https://www.yashtech.com)**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Hardware Requirements](#-hardware-requirements)
- [Installation](#-installation)
- [Running the Project](#-running-the-project)
- [Auto-Start (systemd)](#-auto-start-systemd)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Phase Roadmap](#-phase-roadmap)
- [Screenshots](#-screenshots)

---

## 🎯 Overview

**Shopfloor Copilot** is an industrial AI monitoring platform built on **Nvidia Jetson AGX Orin 64GB**. It monitors 5 industrial machines in real-time, detects anomalies using machine learning, and provides an AI-powered RAG (Retrieval-Augmented Generation) compliance assistant that answers natural language queries about machine status, maintenance schedules, and alert explanations.

### Problem It Solves

| Before | After |
|--------|-------|
| Manual screen monitoring | Automated 24/7 AI monitoring |
| Late anomaly detection | Real-time ML-based anomaly alerts |
| Manual report generation | One-click PDF/Excel reports |
| Searching through manuals | Natural language AI queries |
| Role-based info silos | Role-based intelligent dashboards |

---

## ✨ Key Features

### 🔴 Real-Time Monitoring
- Live telemetry from 5 machines every 2 seconds
- WebSocket-based dashboard updates (no page refresh needed)
- Parameters: Temperature, Vibration, RPM, Power Consumption, Pressure

### 🤖 AI Anomaly Detection
- Isolation Forest ML model per machine
- Retrained every 5 minutes on latest 500 readings
- Hard-limit threshold rules + statistical detection
- Severity levels: Info → Warning → Critical
- Alert deduplication within 60-second windows

### 🧠 RAG Compliance Assistant
- Ask natural language questions about machines
- Retrieves relevant documents from Qdrant vector database
- Combines live telemetry + knowledge base for accurate answers
- 20 indexed documents: manuals, maintenance schedules, alert guides
- Groq LLM (llama-3.1-8b-instant) for generation
- Offline mode support via Ollama (Phase 3)

### 📊 Report Generation
- Weekly, Monthly, Custom date range reports
- PDF reports with Yash Technologies branding
- Excel reports with telemetry data sheets
- Downloadable directly from RAG chat or Reports section
- AI-generated summaries and recommendations

### 🔐 Authentication & RBAC
- JWT-based authentication (access + refresh tokens)
- bcrypt password hashing (12 rounds)
- Role-Based Access Control:
  - **Admin** → Full platform access
  - **Tech Staff** → Machines, alerts, AI, reports
  - **Non-Tech Staff** → Simplified plant overview

### 📱 Role-Based Dashboards
- **Admin Dashboard**: Live sensor stream, anomaly panel, user management
- **Tech Dashboard**: Machine selector, telemetry charts, alert resolution
- **Non-Tech Dashboard**: Plant status, zone health, compliance score

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│         WebSocket · REST API · Role-based Dashboards         │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│                   BACKEND (Flask + SocketIO)                  │
│        JWT Auth · Machine Simulator · Anomaly Detector        │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┘
       │          │          │          │          │
  TimescaleDB  Redis      Qdrant     Groq/      Isolation
  (telemetry)  (cache/    (vector    Ollama     Forest ML
               pub-sub)   search)    (LLM)
```

### RAG Pipeline

```
User Question
     ↓
Embed (all-MiniLM-L6-v2) → 384-dim vector
     ↓
Qdrant Search → Top-5 relevant documents
     ↓
TimescaleDB → Live telemetry context
     ↓
Groq/Ollama LLM → Natural language answer
     ↓
Response + Download buttons (if report requested)
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.35 | React framework with SSR |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.4.x | Styling |
| Recharts | 2.12.x | Telemetry charts |
| Socket.IO Client | 4.7.x | Real-time WebSocket |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python Flask | 3.0.3 | REST API server |
| Flask-SocketIO | 5.3.6 | WebSocket server |
| PyJWT | 2.8.0 | JWT authentication |
| bcrypt | 4.1.3 | Password hashing |
| psycopg2 | 2.9.9 | PostgreSQL driver |

### AI / ML
| Technology | Version | Purpose |
|-----------|---------|---------|
| Groq API (llama-3.1-8b-instant) | - | LLM generation |
| LangChain | 0.2.6 | RAG orchestration |
| SentenceTransformers (all-MiniLM-L6-v2) | 3.0.1 | Text embeddings |
| Scikit-learn (Isolation Forest) | 1.5.0 | Anomaly detection |
| NumPy | 1.26.4 | Numerical computing |

### Databases & Infrastructure
| Technology | Version | Purpose |
|-----------|---------|---------|
| TimescaleDB | 2.11.2 | Time-series telemetry storage |
| Qdrant | 1.9.1 | Vector database for RAG |
| Redis | 7.x | Cache + pub/sub |
| ReportLab | 4.x | PDF generation |
| OpenPyXL | 3.x | Excel generation |

---

## 💻 Hardware Requirements

### Tested On
- **Nvidia Jetson AGX Orin 64GB Developer Kit**
  - CPU: ARMv8 (12-core Cortex-A78AE)
  - GPU: NVIDIA Ampere (2048 CUDA cores)
  - RAM: 64GB LPDDR5
  - Storage: 64GB eMMC
  - AI Performance: 275 TOPS

### Minimum Requirements
- RAM: 8GB
- Storage: 20GB free
- OS: Ubuntu 20.04+ (ARM64 or x86_64)
- Python: 3.11+
- Node.js: 20+

---

## 📦 Installation

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PostgreSQL + TimescaleDB
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y timescaledb-2-postgresql-12

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install Qdrant
wget https://github.com/qdrant/qdrant/releases/download/v1.9.1/qdrant-aarch64-unknown-linux-musl.tar.gz
tar -xzf qdrant-aarch64-unknown-linux-musl.tar.gz
sudo mv qdrant /usr/local/bin/qdrant
```

### Clone Repository

```bash
git clone https://github.com/Somya170/shopfloor-copilot.git
cd shopfloor-copilot
```

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database Setup

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE factory_ai;"

# Apply schema
sudo -u postgres psql -d factory_ai -f database/schema.sql
```

### Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**Required environment variables:**

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
DEBUG=false

DB_HOST=localhost
DB_PORT=5432
DB_NAME=factory_ai
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

QDRANT_HOST=localhost
QDRANT_PORT=6333

GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant

PORT=5001
CORS_ORIGINS=http://localhost:3000
```

> 🔑 **Get Groq API Key FREE:** https://console.groq.com

### Frontend Setup

```bash
cd ../frontend
npm install

# Create env file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_WS_URL=http://localhost:5001
EOF
```

### Upload Knowledge Base

```bash
cd ../machine_knowledge
python3 upload_knowledge.py
```

---

## 🚀 Running the Project

### Manual Start

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
export LD_PRELOAD=/path/to/venv/lib/python3.12/site-packages/torch/lib/libgomp.so.1:/path/to/venv/lib/python3.12/site-packages/torch/lib/libc10.so
python app.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

**Open Browser:**
```
http://localhost:3000
```

### Using Start Script

```bash
chmod +x backend/start.sh
./backend/start.sh
```

---

## ⚙️ Auto-Start (systemd)

Set up services to start automatically when Jetson boots:

```bash
# Enable services
sudo systemctl enable shopfloor-backend
sudo systemctl enable shopfloor-frontend

# Start services
sudo systemctl start shopfloor-backend
sudo systemctl start shopfloor-frontend

# Check status
sudo systemctl status shopfloor-backend
sudo systemctl status shopfloor-frontend
```

**Useful commands:**
```bash
# View logs
sudo journalctl -u shopfloor-backend -f
sudo journalctl -u shopfloor-frontend -f

# Restart
sudo systemctl restart shopfloor-backend
sudo systemctl restart shopfloor-frontend
```

---

## 🔑 Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | krenal@yash.com | Yash@123 |

> ⚠️ Change credentials in production!

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, get JWT token |
| POST | `/api/auth/signup` | Register new user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout, revoke token |

### Machines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/machines` | All machines + live data |
| GET | `/api/machines/<id>/data` | Telemetry history |
| GET | `/api/machines/<id>/stats` | 24h statistics |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Active alerts |
| POST | `/api/alerts/<id>/resolve` | Resolve alert |

### AI & RAG
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask-ai` | Ask AI assistant |
| GET | `/api/chat-history` | Chat history |
| POST | `/api/index-document` | Add to knowledge base (Admin) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-report` | Generate PDF or Excel report |
| GET | `/api/reports` | List all reports |

---

## 📁 Project Structure

```
shopfloor-copilot/
│
├── backend/
│   ├── app.py                    # Flask app + SocketIO entry point
│   ├── requirements.txt          # Python dependencies
│   ├── start.sh                  # Startup script
│   ├── config/
│   │   └── settings.py           # Environment configuration
│   ├── database/
│   │   ├── db.py                 # PostgreSQL connection pool
│   │   ├── cache.py              # Redis helpers
│   │   └── schema.sql            # TimescaleDB schema + seed data
│   ├── routes/
│   │   ├── auth_routes.py        # Authentication endpoints
│   │   ├── machine_routes.py     # Machine + alert endpoints
│   │   ├── rag_routes.py         # AI assistant endpoints
│   │   └── report_routes.py      # Report generation endpoints
│   └── services/
│       ├── auth_service.py       # JWT + bcrypt + RBAC
│       ├── machine_simulator.py  # Background telemetry generator
│       ├── anomaly_detector.py   # Isolation Forest ML
│       ├── rag_engine.py         # LangChain + Groq + Qdrant
│       └── report_generator.py   # PDF + Excel generation
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with AuthProvider
│   │   ├── page.tsx              # Root redirect
│   │   ├── globals.css           # Global styles + design system
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   └── dashboard/page.tsx    # Main dashboard router
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   └── views/
│   │   │       ├── AdminView.tsx     # Admin dashboard
│   │   │       ├── TechView.tsx      # Tech staff dashboard
│   │   │       └── NonTechView.tsx   # Non-tech dashboard
│   │   ├── charts/
│   │   │   └── TelemetryChart.tsx    # Recharts line charts
│   │   ├── rag-chat/
│   │   │   └── AIChat.tsx            # RAG chat interface
│   │   └── ui/
│   │       └── index.tsx             # Reusable UI components
│   ├── hooks/
│   │   └── useSocket.ts          # Socket.IO WebSocket hook
│   ├── lib/
│   │   ├── api.ts                # Typed API client
│   │   └── auth-context.tsx      # Auth state management
│   └── types/
│       └── index.ts              # TypeScript type definitions
│
├── machine_knowledge/
│   ├── machine_1_cnc_milling.json
│   ├── machine_2_hydraulic_press.json
│   ├── machine_3_conveyor_motor.json
│   ├── machine_4_industrial_pump.json
│   ├── machine_5_compressor.json
│   └── upload_knowledge.py       # Knowledge base upload script
│
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

---

## 🗺️ Phase Roadmap

### ✅ Phase 1 — Foundation (Complete)
- [x] Shopfloor Copilot UI with Yash Technologies branding
- [x] Role-based dashboards (Admin, Tech, Non-Tech)
- [x] Real-time WebSocket telemetry streaming
- [x] JWT authentication + RBAC
- [x] Isolation Forest anomaly detection
- [x] TimescaleDB time-series storage
- [x] systemd auto-start services

### 🔄 Phase 2 — AI Intelligence (In Progress)
- [x] RAG Compliance Query Engine
- [x] Qdrant vector database integration
- [x] Groq LLM (llama-3.1-8b-instant)
- [x] 20 machine knowledge documents indexed
- [x] PDF + Excel report generation
- [x] RAG-triggered report downloads
- [ ] AI-generated report summaries via LLM
- [ ] Real compliance score calculation

### 📋 Phase 3 — Production (Planned)
- [ ] Offline LLM via Ollama (llama3.1:8b on Jetson GPU)
- [ ] MQTT real hardware sensor integration
- [ ] Docker containerization
- [ ] Predictive maintenance analytics
- [ ] Mobile push notifications
- [ ] Multi-language support

---

## 📸 Screenshots

| Login Page | Admin Dashboard |
|-----------|----------------|
| Shopfloor Copilot login with Yash branding | Live sensor stream + anomaly panel |

| RAG Compliance | Reports |
|---------------|---------|
| AI-powered chat with download buttons | PDF/Excel report generation |

---

## 🤝 Contributing

This is a proprietary project developed for **Yash Technologies**.

---

## 📄 License

Copyright © 2026 Yash Technologies. All rights reserved.

---

<div align="center">

**Shopfloor Copilot v1.0**

Built with ❤️ by Yash Technologies

*Powered by Nvidia Jetson AGX Orin · Groq LLM · LangChain · Qdrant*

</div>