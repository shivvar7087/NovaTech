# Deploying the Campus Resource Intelligence Assistant

You can deploy this application in one of two ways:

- **Method A (Recommended): Full-Stack on Render (1 Service, 1 URL, Zero Configuration)**
  Uses the included `render.yaml` Blueprint and `build.sh` script to build React and run FastAPI together on Render. No CORS issues, no separate hosting needed.
- **Method B: Split Deployment (React on Netlify + FastAPI on Render)**
  Keeps the static frontend on Netlify and runs the API backend on Render.

---

## Method A (Recommended): 1-Click Blueprint Full-Stack on Render

This uses Render's Infrastructure-as-Code (`render.yaml`) to automatically provision a single unified Web Service.

### Step-by-Step Instructions:

1. **Log in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Sign in with your GitHub account.

2. **Create New Blueprint Instance**:
   - Click the blue **New +** button in the top right.
   - Select **Blueprint** from the dropdown menu.

3. **Connect Your GitHub Repository**:
   - Find and select **`shivvar7087/NovaTech`** (or paste `https://github.com/shivvar7087/NovaTech`).
   - If your repository isn't listed, click *Configure account* to grant Render access to your repository.

4. **Review Blueprint Spec**:
   - Render will detect the `render.yaml` file in the root of your repo.
   - It will display the service details:
     - **Service Name**: `campus-resource-intelligence`
     - **Runtime**: `Python 3`
     - **Plan**: `Free`
     - **Build Command**: `bash build.sh` (builds React into `dist/` and installs Python packages)
     - **Start Command**: `uvicorn app.main:app --app-dir campus-intelligence/backend --host 0.0.0.0 --port $PORT`
     - **Health Check Path**: `/health`

5. **Click "Apply"**:
   - Click the green **Apply** button at the bottom of the page.
   - Render will begin the build:
     1. Clones your repository.
     2. Runs `build.sh`:
        - Installs Python dependencies via `pip`.
        - Installs npm packages and builds the production React application with Vite.
     3. Starts Uvicorn on `$PORT`.
     4. Performs the health check on `/health`.

6. **Access Your Live Full-Stack App**:
   - Once the deployment shows a green **Live** badge, click the public URL provided at the top:
     `https://campus-resource-intelligence.onrender.com`
   - **Everything works out-of-the-box**:
     - Visiting `/` loads the interactive React dashboard.
     - API requests to `/api/*` are handled directly on the same domain without CORS.
     - Dataset upload, AI query engine, analytics, and charts are fully functional!

---

## Method B: Split Deployment (FastAPI on Render + React on Netlify)

If you prefer keeping your React frontend on Netlify while hosting only the API on Render:

### 1. Deploy the backend to Render manual Web Service

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
