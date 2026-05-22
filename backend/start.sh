#!/bin/bash
cd /home/jetiot/factory-ai-platform/backend
source venv/bin/activate

# Offline mode — prevent HuggingFace network calls
export TRANSFORMERS_OFFLINE=1
export HF_DATASETS_OFFLINE=1
export HF_HUB_OFFLINE=1

# PyTorch ARM fix — sahi path
export LD_PRELOAD=/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/scikit_learn.libs/libgomp-d22c30c5.so.1.0.0:/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/torch/lib/libc10.so

# Load .env
set -a
source /home/jetiot/factory-ai-platform/backend/.env
set +a

python app.py
