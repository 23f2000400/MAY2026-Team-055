# NirogPath — VS Code Local Setup & Execution Guide

This guide details how to set up the Python virtual environment (`.venv`), install all requirements, configure Visual Studio Code, and launch both the **FastAPI Backend Server** and **React Frontend Client** on your local machine.

---

## 📋 Prerequisites

- **Python**: v3.10 or higher
- **Node.js**: v18 or higher (npm / yarn)
- **Visual Studio Code**: Installed on your system

---

## 🚀 Step 1: Set Up Python Virtual Environment (`.venv`)

Open a terminal in the project root directory (`C:\Users\Piyus\Downloads\NirogPath`).

### 1. Create `.venv` (if not already created)
```powershell
python -m venv .venv
```

### 2. Activate the Virtual Environment in PowerShell
```powershell
.\.venv\Scripts\Activate.ps1
```
*(If PowerShell gives an execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first).*

### 3. Upgrade Pip & Install Backend Dependencies
```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## ⚙️ Step 2: Configure VS Code Python Interpreter

To ensure VS Code uses the packages installed inside `.venv`:

1. Open **Visual Studio Code** in the project folder.
2. Press **`Ctrl + Shift + P`** (or `Cmd + Shift + P` on macOS) to open the Command Palette.
3. Type and select **`Python: Select Interpreter`**.
4. Choose the interpreter pointing to your project environment:
   ```
   .\.venv\Scripts\python.exe
   ```

---

## 📦 Step 3: Install Frontend Dependencies

Open a second terminal window (or a split terminal tab in VS Code):

```powershell
# Navigate to the frontend directory
cd frontend

# Install Node.js modules
npm install
```

---

## 🏃 Step 4: Running the Local Servers in VS Code

You will need **two open terminals** in VS Code to run both servers simultaneously.

### Terminal 1: Start the FastAPI Backend Server
In the root directory of the project, run:

```powershell
$env:USE_MOCK_DB="true"
.\.venv\Scripts\python.exe -m uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload
```

- **Backend API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger API Docs**: [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)

---

### Terminal 2: Start the React Frontend Application
In the `frontend` directory, run:

```powershell
cd frontend
npm start
```

- **Frontend App URL**: [`http://localhost:3000`](http://localhost:3000)
- The React application automatically proxies API requests (`/api/*`) to `http://127.0.0.1:8000`.

---

## 🧪 Step 5: Running Automated Pytest Test Suite

While the backend server is running on `http://127.0.0.1:8000`, open a terminal in the root directory and run:

```powershell
# Set backend target URL and execute pytest
$env:REACT_APP_BACKEND_URL="http://127.0.0.1:8000"
.\.venv\Scripts\python.exe -m pytest backend/tests
```

To run only the **Milestone 4 (Sprint 2)** test suite:
```powershell
$env:REACT_APP_BACKEND_URL="http://127.0.0.1:8000"
.\.venv\Scripts\python.exe -m pytest backend/tests/test_milestone4.py
```

---

## 💡 Troubleshooting & Environment Flags

- **Database Fallback**: By default, `USE_MOCK_DB=true` enables the built-in in-memory MongoDB mock database. No local MongoDB service installation is required.
- **Port Conflict**: If port `8000` or `3000` is already in use, terminate the existing process or change the port parameter in the `uvicorn` command.
