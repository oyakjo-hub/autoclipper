#!/bin/bash
# AutoClipper AI - Hugging Face Spaces Entrypoint Script
set -e

# 1. Start the background worker process
echo "Starting ARQ Background Worker..."
.venv/bin/arq src.workers.tasks.WorkerSettings &

# 2. Start the FastAPI API server on port 7860 (Hugging Face default)
echo "Starting FastAPI Server on port 7860..."
exec .venv/bin/uvicorn src.main_refactored:app --host 0.0.0.0 --port 7860
