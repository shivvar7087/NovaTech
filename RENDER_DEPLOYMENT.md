# 🚀 Deploying to Render (render.com)

This guide walks you through deploying the **Campus Resource Intelligence Assistant** to [Render](https://render.com/).

---

## 🎯 Recommended Method: 1-Click Render Blueprint (Automated)

The project includes an official [`render.yaml`](./render.yaml) file. This automatically configures:
- Python 3.12 & Node 20 runtimes
- Build step: installs Python requirements and compiles React assets via `build.sh`
- Start step: runs Uvicorn on `$PORT` serving both the React frontend and FastAPI backend
- Automatic Health Check on `/api/health`

### Steps:
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right, then select **Blueprint**.
3. Connect your GitHub account and select your repository: **`shivvar7087/NovaTech`**.
4. Render will detect `render.yaml` automatically.
5. Click **Apply**.
6. Render will build and deploy the application. Once finished, you will receive a public HTTPS URL (e.g., `https://campus-resource-intelligence.onrender.com`).

---

## 🛠️ Alternative Method: Manual Web Service Setup

If you prefer to configure the service manually on Render:

1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: **`shivvar7087/NovaTech`**.
3. Configure the following settings:
   - **Name:** `campus-resource-intelligence`
   - **Region:** Any (e.g., *Oregon (US West)* or *Frankfurt (EU)*)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Python`
   - **Build Command:** `bash build.sh`
   - **Start Command:** `uvicorn app.main:app --app-dir campus-intelligence/backend --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

4. Add the following **Environment Variables** under the *Environment* tab:
   | Key | Value | Notes |
   |---|---|---|
   | `PYTHON_VERSION` | `3.12.10` | Matches local Python version |
   | `NODE_VERSION` | `20.11.0` | Required to build React assets |
   | `OLLAMA_TIMEOUT` | `4.0` | Prevents timeouts when AI is offline |
   | `CORS_ORIGINS` | `*` | Allows cross-origin requests |

5. Under **Advanced**, set **Health Check Path** to `/api/health`.
6. Click **Create Web Service**.

---

## 🔍 How the Deployment Works

- **Unified Single-Service Hosting**: The build script (`build.sh`) compiles the React frontend into `campus-intelligence/frontend/dist`.
- **FastAPI Static Mount**: FastAPI automatically detects the `dist` folder and serves the React single-page app at `/` while routing all API endpoints to `/api/*`.
- **No CORS Issues**: Since both the frontend and API run on the same Render domain, zero cross-origin configuration is required.
- **Failover Safe**: If an external Ollama runtime is not connected, the application uses its built-in verified mathematical and pattern engines so all queries and charts work immediately on Render.
