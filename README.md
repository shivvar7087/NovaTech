<p align="center">
  <img src="assets/banner.svg" alt="Campus Resource Intelligence Platform Banner" width="100%" />
</p>

# Campus Resource Intelligence Platform (CampusIQ)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Pandas](https://img.shields.io/badge/Pandas-Verified_Math-150458.svg?logo=pandas&logoColor=white)](https://pandas.pydata.org)
[![Gemma](https://img.shields.io/badge/Model-Gemma_4-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev/gemma)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7.svg?logo=render&logoColor=white)](https://render.com)

**Campus Resource Intelligence Platform** is an enterprise-grade AI analytics and facility intelligence dashboard designed to turn raw campus resource telemetry into actionable, evidence-backed operational decisions. 

It pairs an executive gradient-accented React 18 interface with a high-performance FastAPI backend, **100% deterministic Python Pandas mathematical verification**, and Google **Gemma 4** natural-language intent parsing via Ollama.

---

<p align="center">
  <img src="assets/dashboard-preview.svg" alt="Campus Resource Intelligence Dashboard Preview" width="100%" />
</p>

---

## 🌟 Key Highlights

- **Guaranteed Zero-Hallucination Architecture**: Gemma 4 interprets natural language intent and synthesizes executive briefings, while Python Pandas computes 100% of arithmetic, sums, averages, comparisons, and rankings directly from timestamped telemetry.
- **Dynamic Reactive CSV Engine**: Upload **any** CSV dataset (electricity, water, HVAC, student occupancy, solar generation, indoor air quality). The entire platform dynamically adapts its KPIs, charts, hotspots, rankings, and suggested questions to the active file's columns and entities.
- **Modern Executive UI**: Featuring the deep navy (`#101a39`), royal purple (`#6958f5`), electric teal (`#29c9c1`), and mint palette with **DM Sans** and **Manrope** typography, smooth micro-interactions, and instant **Light / Dark mode** switching.
- **5 Focused Workspaces**:
  1. **❖ Dashboard**: High-level executive overview, 4 dynamic KPI cards, interactive Recharts Area trend with interval & metric selectors, Recharts Donut distribution, live resource hotspots, AI insight of the day, and Quick Ask bar.
  2. **⇧ Upload Data**: Drag-and-drop file ingestion (CSV, XLSX, JSON), 4 benchmark sample datasets (`⚡ Electricity`, `💧 Water`, `♙ Student Services`, `▧ Campus Infrastructure`), Data readiness checklist, and raw data preview table with in-table search.
  3. **✳ Ask Campus AI**: Natural language query console with suggested question chips that auto-adapt to the active CSV, 4-step reasoning audit trail, interactive `AnswerCard`, multi-chart format switcher (📊 Bar, 📉 Area, 📈 Line, 🥧 Pie), and verified supporting meter records table.
  4. **▥ Detailed Insights**: 4-tab interactive switcher (**Overview**, **Trends**, **Comparison**, **Recommendations**), dynamic ranking index with gradient progress bars, and actionable recommendation cards with direct `[Analyze with AI ↗]` buttons.
  5. **▤ Reports & Export**: Full telemetry KPI metrics, facility comparison bar chart, dynamic facility summary table with 1-click query rows, working **"Export CSV ↓"** and **"Download summary ↓"** buttons.
- **Resilient Dual-Engine Execution**: Seamlessly connects to the live FastAPI backend on Render, with built-in instant client-side deterministic verification fallback if the backend is waking up or offline. Zero blocking error popups.

---

## 🏗️ System Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="End-to-End Verification and Architecture Diagram" width="100%" />
</p>

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CampusIQ Modern React Frontend                        │
│             (DM Sans & Manrope · Light/Dark Mode · Recharts · Vite)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      REST API Calls   │  (/api/query, /api/health, etc.)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FastAPI High-Performance API                        │
│                   (Single Web Service or Standalone Backend)                │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│         Gemma 4 (Local Ollama)        │ │       Deterministic Engine        │
│   • Intent & Entity Extraction        │ │   • 100% Python Pandas Math       │
│   • Metric & Filter Classification    │ │   • Zero Hallucination Risk       │
│   • Executive Narrative Synthesis     │ │   • In-Memory Telemetry Aggs      │
└───────────────────────────────────────┘ └───────────────────────────────────┘
```

When Ollama is offline or in cloud-only environments without local GPUs, the backend automatically transitions to its built-in pattern classification engine and verified mathematical explanation generator.

---

## 📁 Project Structure

```text
NovaTech/
├── build.sh                            # Unified production build script for Render
├── render.yaml                         # Infrastructure-as-Code Blueprint for Render
├── RENDER_DEPLOYMENT.md                # Step-by-step deployment guide
├── campus-intelligence/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py                 # FastAPI application, CORS, and SPA static mount
│   │   │   ├── routes.py               # /api endpoints (health, summary, query, upload)
│   │   │   ├── schemas.py              # Pydantic validation models
│   │   │   ├── data_loader.py          # CSV loader, column normalizer, and summary engine
│   │   │   ├── analysis_engine.py      # Pandas-based verified mathematical calculations
│   │   │   └── gemma_service.py        # Gemma 4 Ollama integration with TCP fallback
│   │   ├── data/
│   │   │   ├── campus_electricity.csv  # 360-row default smart meter dataset
│   │   │   └── generate_data.py        # Synthetic telemetry generator script
│   │   ├── test_system.py              # End-to-end backend verification test suite
│   │   └── requirements.txt            # Python dependencies (FastAPI, Pandas, Uvicorn)
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── AnswerCard.jsx      # Evidence-backed AI answer card
│       │   │   ├── ChartPanel.jsx      # Recharts visualizer (Bar, Area, Line, Pie)
│       │   │   └── DataTable.jsx       # Supporting meter records table with search
│       │   ├── services/
│       │   │   └── api.js              # Browser API client with dynamic host override
│       │   ├── App.jsx                 # 5 interactive views & reactive CSV engine
│       │   ├── index.css               # Complete CampusIQ CSS design system
│       │   └── main.jsx                # React root mount
│       ├── index.html                  # HTML entrypoint with Google Fonts
│       ├── vite.config.js              # Vite configuration and /api proxy
│       └── package.json                # Frontend dependencies (React, Recharts)
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: 18 or newer and npm
- **Ollama** *(Optional)*: Install from [ollama.com](https://ollama.com/) if you want local Gemma 4 AI parsing.

---

### Option A: Local Development (Separate Terminals)

#### 1. Start the Backend API

```powershell
cd campus-intelligence\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

*(On macOS/Linux, run `source .venv/bin/activate` instead).*

- **API Root**: [http://localhost:8000/](http://localhost:8000/)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 2. Start the Frontend Dashboard

In a new terminal:

```powershell
cd campus-intelligence\frontend
npm install
npm run dev
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser. Vite automatically proxies `/api` calls to `http://localhost:8000`.

---

### Option B: Local Full-Stack Single Process

You can compile the frontend into the backend and serve both from a single server:

```powershell
# 1. Build frontend
cd campus-intelligence\frontend
npm install
npm run build

# 2. Run unified FastAPI server
cd ..\backend
uvicorn app.main:app --port 8000
```
Open **[http://localhost:8000/](http://localhost:8000/)** to access the full-stack application directly.

---

### Option C: Enable Local Gemma 4 Model (Optional)

To enable local Gemma-powered question interpretation:

```bash
ollama run gemma4:e2b
```

The system automatically detects the running Ollama daemon on port `11434` and displays `🤖 Gemma 4 (Local Ollama)` in the status badge. If Ollama is not running, the platform seamlessly uses its built-in rule and pattern engine.

---

## 📊 Dynamic CSV Ingestion & Format Support

The platform automatically normalizes column names, detects entity categories, and converts numeric metrics. You can upload any CSV with standard headers:

| Canonical Field | Recognized Aliases | Purpose |
|---|---|---|
| `timestamp` | `date`, `time`, `datetime`, `interval` | Temporal reading timestamp |
| `building` / `facility` | `facility`, `zone`, `station`, `location`, `unit_id` | Monitored campus entity |
| `kwh_usage` | `kwh`, `usage`, `consumption`, `electricity_kwh` | Energy consumption |
| `water_liters` | `water`, `liters`, `litres`, `gallons` | Water consumption |
| `peak_demand_kw` | `peak_kw`, `peak_demand`, `demand_kw` | Peak electrical surge |
| `cost_usd` | `cost`, `total_cost`, `spend`, `price` | Financial expenditure |
| `occupancy` | `occupancy_count`, `attendance`, `headcount` | Facility occupancy |
| `air_quality_aqi` | `aqi`, `pm25`, `co2_ppm` | Environmental quality |

### Adaptive Question Engine
When a custom CSV is uploaded, suggested questions in **Ask AI** automatically update to reflect the uploaded file:
- *"Which facility has the highest water liters?"*
- *"Compare Science Center and Athletics Complex water liters"*
- *"What is the total campus water liters?"*
- *"Show chronological trend for occupancy count"*

---

## 🔌 API Reference

All backend API routes are prefixed under `/api`:

| Endpoint | Method | Description |
|---|:---:|---|
| `/api/health` | `GET` | Health status, Ollama availability, and active dataset information |
| `/api/dataset/summary` | `GET` | Active dataset totals, building list, and metric columns |
| `/api/dataset/sample?limit=20` | `GET` | Paginated raw telemetry sample records |
| `/api/buildings` | `GET` | List of unique facilities/entities in active dataset |
| `/api/dataset/upload` | `POST` | Multipart CSV upload (`file`), normalized via Pandas |
| `/api/dataset/reset` | `POST` | Resets the active dataset to bundled `campus_electricity.csv` |
| `/api/query` | `POST` | Natural language question parsing with verified mathematical proof |

#### Example Query Request
```bash
curl -X POST "http://localhost:8000/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "Which building had the highest power consumption?", "building_filter": null}'
```

---

## ⚙️ Environment Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base API URL prefix or full remote URL (e.g., Render URL) |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Address of local Ollama runtime |
| `OLLAMA_MODEL` | `gemma4:e2b` | Gemma model tag in Ollama |
| `OLLAMA_TIMEOUT` | `4.0` | Timeout in seconds before AI fallback to rule engine |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins for web client |
| `PORT` | `8000` | Port for the FastAPI server |

---

## ☁️ Deployment

### 1-Click Render Deployment (Blueprint)
The repository includes [`render.yaml`](./render.yaml) and [`build.sh`](./build.sh) for unified deployment on Render:

1. In the [Render Dashboard](https://dashboard.render.com/), select **New +** → **Blueprint**.
2. Connect your GitHub repository.
3. Render automatically executes `build.sh` (installing Python packages, running `npm run build` for React), and starts the full-stack server on Python 3.12.
4. For detailed step-by-step instructions, see [`RENDER_DEPLOYMENT.md`](./RENDER_DEPLOYMENT.md).

---

## 🛡️ Verification Principle & Auditing

The system enforces a strict boundary between language models and calculations:
1. **No LLM Math**: Gemma 4 is never asked to perform arithmetic.
2. **Deterministic Pandas Execution**: Calculations are evaluated in-memory using vector aggregations.
3. **Auditable Evidence**: Every answer response includes the verified numerical calculation, comparison summaries, caveats, interactive Recharts visualization, and raw meter interval rows for stakeholder review.

---

## 📄 License

This project is open-source and available under the **MIT License**.
