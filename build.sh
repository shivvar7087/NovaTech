#!/usr/bin/env bash
# ==============================================================================
# Unified Production Build Script for Render (Full-Stack Single Web Service)
# ==============================================================================
set -e

echo "📦 1/2 Installing Python backend dependencies..."
python -m pip install --upgrade pip
pip install -r campus-intelligence/backend/requirements.txt

echo "⚛️ 2/2 Building React frontend assets..."
cd campus-intelligence/frontend
npm install
npm run build
cd ../..

echo "✅ Build completed successfully! Production assets ready in campus-intelligence/frontend/dist"
