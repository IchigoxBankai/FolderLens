# 🚀 FolderLens Deployment & Lightweight Migration Guide

FolderLens uses a **Client-Side AI + Lightweight Vector API** architecture designed specifically to run with maximum speed and reliability on free cloud hosting tiers (such as Render's 512 MB free tier).

---

## 🏗️ Architecture Overview

```
[ User / Web Page ]
       │
       ▼
[ Web App / Chrome Extension ] ─── Local WebGPU / WASM (Transformers.js: Xenova/clip-vit-base-patch32)
       │
       ▼ (512-dim Normalized Embedding Vector + Hashes)
[ Lightweight Render API ] (<50 MB RAM, FastAPI + NumPy / pgvector)
       │
       ▼
[ Vector Storage & Database ]
       │
       ▼
[ Top Ranked Results & Folder Location ]
```

- **Frontend Web App (`admin-web`)** → Deployed to **Vercel** (Free, instant global CDN)
- **Backend API (`backend`)** → Deployed to **Render** (<50 MB RAM, 100% free tier compatible)
- **Chrome Extension (`extension`)** → Loads unpacked in developer mode on Chrome, Edge, or Brave

---

## ⚡ Why Render Free Tier (512 MB RAM) Now Works Perfectly

1. **Zero PyTorch on Server**: Heavy PyTorch (~350MB+) and HuggingFace Transformers were removed from `requirements.txt`.
2. **Client-Side Visual Embeddings**: Embeddings are generated in the browser/extension using WebGPU (with WASM fallback).
3. **Sub-50MB RAM Footprint**: The FastAPI server uses minimal memory and boots in under 1 second.
4. **Instant Health Checks**: `GET /health` and `GET /api/health` respond immediately.

---

## Step 1: Deploy Backend to Render

1. Go to [Render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure service settings:
   - **Name**: `folderlens-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
   - **Plan**: `Free (512 MB)`
4. Health check path: `/health`
5. Click **Deploy Web Service**. You will get a URL like `https://folderlens-api.onrender.com`.

---

## Step 2: Deploy Web App to Vercel

1. Go to [Vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Import your `FolderLens` repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `admin-web`
   - **Build & Development Settings**: Keep defaults (Override toggles **OFF**):
     - Build Command: `vite build` (or `npm run build`)
     - Output Directory: `dist`
     - Install Command: `npm install`
   - **Environment Variables**:
     - Key: `VITE_API_URL`
     - Value: `https://folderlens-api.onrender.com` (your Render backend URL)
4. Click **Deploy**.

> **Note on Vercel "cd: admin-web: No such file or directory" error**:
> If your project's Root Directory is already set to `admin-web`, do NOT enable a Build Command override that includes `cd admin-web`. Simply leave the Build Command toggle OFF (or use `npm run build`).

---

## Step 3: Test Chrome Extension

1. In the `extension` folder, run `npm run build`.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the `FolderLens/extension/dist` folder.
5. In the extension side panel settings (⚙️), set the backend API URL to your live Render backend URL or `http://localhost:8000`.
6. Browse any webpage, click an image, and watch FolderLens find the matching folder in real time!

---

## 🔍 Verification & Diagnostics

- **Health Check**: `GET /health` or `GET /api/health` -> `{"status": "healthy"}`
- **Memory Footprint Monitor**: `GET /api/system/memory` -> displays real-time RSS & VMS RAM usage in MB
- **Visual Search**: `POST /api/search/visual` -> receives 512-dim embedding vector and returns ranked folder matches
