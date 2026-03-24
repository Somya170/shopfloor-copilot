#!/bin/bash
cd /home/jetiot/factory-ai-platform/backend
source venv/bin/activate
export LD_PRELOAD=/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/torch/lib/libgomp.so.1:/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/torch/lib/libc10.so
export $(cat .env | grep -v '^#' | xargs)
python app.py
