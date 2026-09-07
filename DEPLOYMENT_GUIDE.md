# 🚀 FolderLens Deployment Guide (100% Free & Fast)

This guide walks you through deploying **FolderLens** so you have a live portfolio URL to share with recruiters and clients.

---

## Architecture Overview
- **Frontend Web App (`admin-web`)** → Deploy to **Vercel** (Free, instant global CDN)
- **Backend API (`backend`)** → Deploy to **Render** or **Railway** (Free/low-cost Python hosting)

---

## Step 1: Push Your Code to GitHub

1. Open your terminal in the `FolderLens` folder:
   ```bash
   git init
   git add .
   git commit -m "feat: FolderLens complete with Sky Blue & Cream Beach theme"
   ```
2. Create a new repository on [GitHub.com](https://github.com/new) called `FolderLens`.
3. Push your repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/FolderLens.git
   git push -u origin main
   ```

---

## Step 2: Deploy Backend to Render (Free)

1. Go to [Render.com](https://render.com) and log in with GitHub.
2. Click **New +** → **Web Service**.
3. Select your **FolderLens** GitHub repository.
4. Fill in the settings:
   - **Name**: `folderlens-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3` (or choose `Docker`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Click **Deploy Web Service**.
6. Once deployed, Render will give you a public URL, for example:  
   `https://folderlens-api.onrender.com`

---

## Step 3: Deploy Frontend to Vercel (Free)

1. Go to [Vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Import your **FolderLens** repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `admin-web`
   - **Environment Variables**:
     - Key: `VITE_API_URL`
     - Value: `https://folderlens-api.onrender.com` *(use your Render backend URL from Step 2)*
5. Click **Deploy**.
6. In ~60 seconds, your live frontend link will be ready (e.g. `https://folderlens.vercel.app`).

---

## Step 4: Chrome Extension for Portfolio Demonstrations

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `FolderLens/extension/dist` folder.
4. In the side panel settings gear icon (⚙️), set the backend API URL to your live Render backend URL (`https://folderlens-api.onrender.com`).
5. Now you can use the extension on any live website!

---

## Verification Checklist

- [ ] Backend health check responds: `https://folderlens-api.onrender.com/api/health`
- [ ] Frontend loads with Beach theme: `https://folderlens.vercel.app`
- [ ] Visual image search and duplicate detection work seamlessly
