# Deploying the Campus Resource Intelligence Assistant

The application is deployed as two services:

- **Frontend:** Netlify builds and hosts the React/Vite application.
- **Backend:** Render runs the FastAPI API.

## 1. Deploy the backend to Render

Create a new **Web Service** from `shivvar7087/NovaTech` with:

| Setting | Value |
|---|---|
| Name | `campus-resource-intelligence-api` |
| Environment | `Production` |
| Runtime | `Python 3` |
| Branch | `main` |
| Region | `Oregon (US West)` |
| Root Directory | Leave blank |
| Build Command | `pip install -r campus-intelligence/backend/requirements.txt` |
| Start Command | `uvicorn app.main:app --app-dir campus-intelligence/backend --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |

Add these environment variables:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.10` |
| `OLLAMA_TIMEOUT` | `4.0` |
| `CORS_ORIGINS` | Your Netlify URL, for example `https://your-site.netlify.app` |

Ollama is optional. If it is unavailable on Render, the backend uses its
verified rule engine.

After the first successful deploy, copy the Render service URL. It will look
similar to:

```text
https://campus-resource-intelligence-api.onrender.com
```

The API health endpoint should then be available at
`https://your-render-service.onrender.com/api/health`.

## 2. Deploy the frontend to Netlify

Create a new Netlify site from the same GitHub repository:
`shivvar7087/NovaTech`.

Use these settings:

| Setting | Value |
|---|---|
| Base directory | `campus-intelligence/frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Branch | `main` |

The repository includes [`netlify.toml`](./netlify.toml), which supplies these
settings and the single-page application fallback. If Netlify asks for a
publish directory after the base directory is set, use `dist`, not
`campus-intelligence/frontend/dist`.

In Netlify **Site configuration → Environment variables**, add:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

Replace the value with the actual Render URL and keep the `/api` suffix. Then
trigger a new deploy because Vite embeds `VITE_*` values during the build.

## 3. Finish CORS configuration

Copy the final Netlify site URL, including `https://`, into the Render
`CORS_ORIGINS` variable. For example:

```text
CORS_ORIGINS=https://campus-resource-intelligence.netlify.app
```

Save the Render variable and redeploy or restart the service. For local
development, a comma-separated value can include the local Vite origins:

```text
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://your-site.netlify.app
```

Do not upload the local `.env` file to either platform. Production values
belong in the Render and Netlify environment-variable dashboards.
