# SentinAI — Intelligent API Monitoring & Alert System

**Live Demo:** [https://sentinai.vercel.app](https://sentinai.vercel.app)  
**GitHub Repository:** [https://github.com/RifatHossaiN47/sentinai](https://github.com/RifatHossaiN47/sentinai)

SentinAI is a full-stack API health monitoring, anomaly detection, and AI-assisted incident triage system built with **Node.js**, **Express**, **TypeScript**, **Prisma (PostgreSQL)**, **Google Gemini**, and **React**.

It continuously tracks microservice health metrics (`response_time_ms`, `status_code`, and `records_returned`), flags anomalies against configurable SLA thresholds, and uses Google Gemini to generate clear root-cause explanations and remediation steps for on-call engineers.

---

## Key Features

- **Dual Input Support:** Ingest API telemetry either through live REST requests (`POST /monitor`) or from static JSON files via CLI (`npm run monitor:file`) and the web dashboard's drag-and-drop uploader.
- **Multi-Threshold Anomaly Detection:** Evaluates response latency (`> 2500ms`), HTTP status codes (`4xx` / `5xx`), and unexpected empty data payloads (`records_returned === 0`).
- **Cost-Efficient Fast Path:** Normal healthy checks (`200 OK` within SLA and returning records) are logged directly to PostgreSQL without calling the LLM (`0 AI tokens` used).
- **AI-Generated Incident Diagnostics:** Anomalous requests are analyzed by Google Gemini (`@google/genai`) with structured JSON output (`message`, `root_cause_explanation`, `suggested_action`). Includes a `3.5s` circuit breaker and deterministic fallback rules so alerts are never dropped if the AI API is unreachable or rate-limited.
- **Alert Deduplication & Lifecycle Tracking:** Repeated failures on an already active endpoint increment `occurrence_count` instead of creating duplicate incident cards. Resolving an alert via `PATCH /alerts/:id/resolve` records operator notes and computes Mean Time To Resolve (`MTTR`).
- **Automated Email Notifications:** Dispatches HTML incident emails via Nodemailer whenever a `CRITICAL` outage is detected (with automatic Ethereal preview links in development).

---

## System Architecture & Design Diagrams

All architecture diagrams and their editable Draw.io source files are located in the [`docs/`](./docs) directory:
- **System Architecture:** [`docs/Architecture.png`](./docs/Architecture.png) ([`Architecture.drawio`](./docs/Architecture.drawio))
- **Anomaly Detection & Incident FSM:** [`docs/FSM.png`](./docs/FSM.png) ([`FSM.drawio`](./docs/FSM.drawio))
- **Database Schema (ERD):** [`docs/ERD.png`](./docs/ERD.png) ([`ERD.drawio`](./docs/ERD.drawio))

### 1. End-to-End System Architecture
![System Architecture](./docs/Architecture.png)

### 2. Anomaly Detection Logic & Incident Lifecycle (FSM)
![Anomaly Detection & Incident FSM](./docs/FSM.png)

| Severity | Trigger Condition | Action Taken |
| :--- | :--- | :--- |
| **`CRITICAL` (P1)** | `status_code >= 500` **or** (`status_code >= 400` and `records_returned == 0` on a critical API) | Generate Gemini AI diagnosis, mark endpoint `DOWN`, and dispatch HTML alert email |
| **`HIGH` (P2)** | `response_time_ms > 2500` (SLA breach) **or** (`status_code == 200` and `records_returned == 0`) | Generate Gemini AI diagnosis, create high-priority alert, and mark endpoint `DEGRADED` |
| **`WARNING` (P3)** | `status_code` between `400` and `499` (with error payload returned) | Generate Gemini AI diagnosis, log warning alert, and mark endpoint `DEGRADED` |
| **`HEALTHY` (P4)** | `status_code` in `200..299`, `response_time_ms <= 2500`, and `records_returned > 0` | Log directly to `TelemetryLog` without invoking Gemini |

### 3. Database Schema & Entity-Relationship Diagram (ERD)
![Database ERD](./docs/ERD.png)

---

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Zod, Nodemailer
- **AI Integration:** Google Gemini SDK (`@google/genai`) with structured JSON schema output
- **Database & ORM:** PostgreSQL (Neon Serverless) with Prisma ORM
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Testing:** Vitest & Supertest

---

## Local Setup & Installation

### Prerequisites
- **Node.js** `v18+`
- **npm** `v9+`
- A PostgreSQL connection string (e.g., [Neon](https://neon.tech) or local PostgreSQL)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) *(optional — falls back to rule-based diagnostics if omitted)*

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/RifatHossaiN47/sentinai.git
cd sentinai
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and set your PostgreSQL and Gemini credentials:
```env
PORT=5000
NODE_ENV=development

DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-3.5-flash-lite"
AI_TIMEOUT_MS=3500

ALERT_RECEIVER_EMAIL="sre-alerts@careguide.local"
```

### 3. Push Database Schema & Seed Default Endpoints
```bash
npm run setup
```

### 4. Start the Development Servers
```bash
npm run dev
```
- **Backend API:** `http://localhost:5000`
- **Frontend Dashboard:** `http://localhost:5173`

---

## Input Methods & API Reference

### Input Method 1: Static JSON File Processing
You can process static JSON telemetry files either from the terminal or by dragging and dropping a `.json` file into the dashboard simulator.

```bash
# Process the default sample file (backend/sample_data/sample_input.json)
cd backend
npm run monitor:file

# Process a specific JSON file
npm run monitor:file sample_data/critical_outage.json
npm run monitor:file sample_data/healthy_stream.json
```

### Input Method 2: REST API (`POST /monitor`)
All endpoints are available at both root (`/monitor`, `/alerts`, `/metrics`) and `/api/*` (`/api/monitor`, `/api/alerts`, `/api/metrics`).

#### 1. Send Batch Telemetry Payload (`POST /monitor`)
```bash
curl -X POST http://localhost:5000/monitor \
  -H "Content-Type: application/json" \
  -d '[
    {
      "api_name": "PatientDataAPI",
      "response_time_ms": 1200,
      "status_code": 200,
      "records_returned": 50
    },
    {
      "api_name": "AppointmentAPI",
      "response_time_ms": 5500,
      "status_code": 500,
      "records_returned": 0
    }
  ]'
```

#### 2. Send Single API Check (`POST /monitor`)
```bash
curl -X POST http://localhost:5000/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "api_name": "BillingAPI",
    "response_time_ms": 3800,
    "status_code": 200,
    "records_returned": 14
  }'
```

#### 3. Retrieve Alerts (`GET /alerts`)
```bash
# Get active alerts
curl http://localhost:5000/alerts

# Filter by status (ACTIVE | RESOLVED | ALL) and severity (CRITICAL | HIGH | WARNING)
curl "http://localhost:5000/alerts?status=ALL&severity=CRITICAL"
```

#### 4. Resolve an Incident (`PATCH /alerts/:id/resolve`)
```bash
curl -X PATCH http://localhost:5000/alerts/<ALERT_ID>/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "operator_name": "Md Rifat Hossen",
    "resolution_notes": "Restarted service container and verified database connection pool."
  }'
```

#### 5. Get System Health & KPI Metrics (`GET /metrics`)
```bash
curl http://localhost:5000/metrics
```

---

## Running Automated Tests

The backend includes unit and integration tests (`Vitest` + `Supertest`) covering threshold rules, batch and single ingestion, payload validation (`HTTP 422`), incident deduplication, and alert resolution (`MTTR`):

```bash
cd backend
npm test
```

---

## Project Structure

```text
sentinai/
├── api/
│   └── index.ts                  # Serverless API entry point for Vercel deployment
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL schema (ApiEndpoint, TelemetryLog, AnomalyAlert, AlertActionLog)
│   │   └── seed.ts               # Database seeder for default monitored APIs
│   ├── sample_data/              # Sample JSON files for static file ingestion
│   ├── src/
│   │   ├── config/               # Environment validation, Prisma client, default endpoint config
│   │   ├── controllers/          # Route handlers for /monitor, /alerts, and /metrics
│   │   ├── middleware/           # Zod request validation, error handler, HTTP logger
│   │   ├── routes/               # Express route definitions
│   │   ├── scripts/              # CLI runner for static JSON files (cliRunner.ts)
│   │   ├── services/             # Anomaly evaluation, Gemini AI triage, and email service
│   │   ├── app.ts                # Express application setup
│   │   └── server.ts             # HTTP server entry point
│   └── tests/                    # Unit and API integration tests
├── frontend/
│   └── src/
│       ├── components/           # Dashboard UI components (Header, KpiDeck, AlertFeed, Simulator, Modal)
│       ├── hooks/                # Data fetching and polling hook (useTelemetry.ts)
│       └── App.tsx               # Main dashboard view
├── docs/                         # System Architecture, FSM, and ERD diagrams (.png + .drawio)
├── vercel.json                   # Full-stack Vercel routing and build configuration
└── README.md
```

---

## Author

**Md Rifat Hossen**  
- **Email:** [rifat8851@gmail.com](mailto:rifat8851@gmail.com)  
- **Portfolio:** [https://rifathossen47.web.app/](https://rifathossen47.web.app/)  
- **GitHub:** [https://github.com/RifatHossaiN47](https://github.com/RifatHossaiN47)  
- **LinkedIn:** [https://www.linkedin.com/in/rifathossain47/](https://www.linkedin.com/in/rifathossain47/)
