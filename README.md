# NirogPath — Smart Hospital OPD Queue Management & Medical AI

NirogPath is an intelligent, full-stack OPD (Outpatient Department) queue management and healthcare orchestration platform. It reduces clinic wait times through live token tracking, dynamic doctor queues, automated slot booking, grounded medical AI (RAG), digital prescription generation with multilingual explanation, and hospital administration workflows.

---

## 🌟 Key Features

- **Smart OPD Queue & Token Flow**: Real-time live token monitoring, dynamic wait times, and status transitions (`booked` &rarr; `arrived` &rarr; `in_consult` &rarr; `completed` / `cancelled`).
- **Doctor Consultation & Queue Management**: Doctor portal to call next tokens, manage patient consultations, set running-late delays with patient broadcast, and publish digital prescriptions.
- **Reception Desk Operations**: Walk-in token generation, real-time queue overview, live check-ins, and hospital department isolation.
- **Grounded Medical AI & RAG Pipeline**:
  - Retrieval-Augmented Generation using an evidence-based clinical guidelines knowledge base.
  - Symptom analysis, clinical urgency assessment, and specialty routing.
  - LLM client with Google Gemini API, OpenAI compatibility, and built-in offline heuristic fallback.
- **Multilingual Prescription Q&A**: Interactive AI assistant that explains prescription dosage, dietary advice, and precautions in English, Hindi, and regional languages.
- **Family Profiles & Wallet System**: Manage health profiles for family members and instant deposit-based booking with automatic refunds on cancellation.
- **Hospital Administration & Analytics**: CEO/Admin dashboards for managing doctors, hospital branches, walk-in receptionists, and departmental KPIs.

---

## 🏗️ Architecture & Tech Stack

```
NirogPath/
├── api/                   # Vercel Serverless entrypoint (index.py)
├── backend/               # FastAPI Backend Application
│   ├── rag/               # Medical RAG Pipeline (Knowledge Base, Retriever, Generator, LLM Client)
│   ├── routes/            # Modular API Route Handlers (Auth, Bookings, Queue, Admin, etc.)
│   ├── tests/             # Automated Pytest Suite (Unit & Integration)
│   ├── config.py          # App Configuration, SmartDB (MongoDB / Mock Fallback), JWT Auth
│   ├── server.py          # FastAPI application initialization & CORS middleware
│   └── requirements.txt   # Backend Python dependencies
├── frontend/              # React Single Page Application
│   ├── src/
│   │   ├── components/    # Reusable UI components & Nirog feature widgets
│   │   ├── pages/         # Application pages (Patient, Doctor, Reception, Admin)
│   │   └── lib/           # API clients, AuthContext, i18n translation engine
│   └── package.json       # Node.js dependencies & CRACO build scripts
├── openssl.cnf            # OpenSSL TLS 1.2 configuration for cloud serverless environments
├── render.yaml            # Render deployment blueprint configuration
├── vercel.json            # Vercel fullstack deployment configuration
├── requirements.txt       # Root Python dependencies (Render/Cloud builds)
└── swagger_api_documentation.yaml # Complete OpenAPI / Swagger API specification
```

- **Backend**: Python 3.10+, FastAPI, Motor / PyMongo, Mongomock-Motor (built-in in-memory MongoDB fallback), PyJWT, Pydantic v2, Bcrypt, Pytest.
- **Frontend**: React 19, CRACO, Tailwind CSS, Radix UI primitives, Lucide React, Framer Motion, Axios, i18next.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: v3.10 or higher
- **Node.js**: v18 or higher (npm or yarn)
- **MongoDB** *(Optional)*: Local MongoDB or MongoDB Atlas URI. If no MongoDB is detected, NirogPath automatically runs on its built-in in-memory mock database.

---

### 1. Backend Setup

1. Open a terminal in the root directory:
   ```bash
   # Create and activate Python virtual environment
   python -m venv .venv

   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # macOS / Linux:
   source .venv/bin/activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. *(Optional)* Configure environment variables:
   Copy `backend/.env.example` to `backend/.env` and update values if connecting to MongoDB Atlas or Google Gemini:
   ```bash
   # Optional: MongoDB URI (defaults to mongodb://localhost:27017)
   MONGO_URL=mongodb://localhost:27017
   USE_MOCK_DB=true

   # Optional: Gemini API Key for live AI RAG recommendations
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **Backend API**: `http://127.0.0.1:8000`
   - **Interactive API Documentation (Swagger)**: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

1. Open a second terminal window and navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the React development server:
   ```bash
   npm start
   ```
   - **Frontend App**: `http://localhost:3000`
   - The frontend automatically proxies API requests (`/api/*`) to `http://127.0.0.1:8000`.

---

## 👥 Demo Accounts & Credentials

The database is pre-seeded with sample accounts for all primary roles (Password for all: `nirog1234`):

| Role | Email | Password | Access / Purpose |
|---|---|---|---|
| **Patient** | `patient@nirog.in` | `nirog1234` | Patient dashboard, slot booking, live queue tracker, prescriptions & wallet |
| **Doctor** | `kavya@nirog.in` | `nirog1234` | Doctor queue management, consultation caller, late delay notification, Rx builder |
| **Receptionist** | `admin@nirog.in` | `nirog1234` | Reception desk, walk-in tokens, hospital check-in management |
| **Admin / CEO** | `ceo@nirog.in` | `nirog1234` | Hospital branches, doctor management, system analytics |

---

## 🧪 Automated Testing

To run the automated backend test suite with pytest:

```bash
# Set target backend URL and run pytest
$env:REACT_APP_BACKEND_URL="http://127.0.0.1:8000"   # Windows PowerShell
pytest backend/tests
```

To run frontend tests or production build check:
```bash
cd frontend
npm run build
```

---

## ☁️ Deployment

- **Vercel**: Pre-configured via `vercel.json` and `api/index.py` for fullstack serverless deployment.
- **Render**: Pre-configured via `render.yaml` with separate web service and static site instances.

---

## 📄 API Documentation

Complete API specifications are available interactively at `http://127.0.0.1:8000/docs` or via the provided `swagger_api_documentation.yaml` OpenAPI schema file.
