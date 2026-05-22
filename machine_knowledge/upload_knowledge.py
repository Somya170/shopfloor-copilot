#!/usr/bin/env python3
"""
upload_knowledge.py
Uploads all machine knowledge JSON files to the RAG system via API.
"""

import json
import os
import sys
import requests

# ── Config ────────────────────────────────────────────────────
API_URL   = "http://localhost:5001"
EMAIL     = "krenal@yash.com"
PASSWORD  = "Yash@123"

# ── JSON files to upload ──────────────────────────────────────
JSON_FILES = [
    "machine_1_cnc_milling.json",
    "machine_2_hydraulic_press.json",
    "machine_3_conveyor_motor.json",
    "machine_4_industrial_pump.json",
    "machine_5_compressor.json",
    "machine_6_edge_ai_compressor.json",
    "machine_3_production_logs.json",
]

def login() -> str:
    print("🔐 Logging in...")
    res = requests.post(f"{API_URL}/api/auth/login", json={
        "email": EMAIL, "password": PASSWORD
    })
    if res.status_code != 200:
        print(f"❌ Login failed: {res.text}")
        sys.exit(1)
    token = res.json()["access_token"]
    print("✅ Login successful!")
    return token

def upload_document(token: str, title: str, content: str, doc_type: str) -> bool:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    res = requests.post(f"{API_URL}/api/index-document",
        headers=headers,
        json={"title": title, "content": content, "doc_type": doc_type}
    )
    return res.status_code == 201

def upload_machine_file(token: str, filepath: str) -> None:
    with open(filepath, "r") as f:
        data = json.load(f)
    machine_name = data["machine_name"]
    documents    = data["documents"]
    print(f"\n📦 Uploading {machine_name} ({len(documents)} documents)...")
    for doc in documents:
        success = upload_document(token, doc["title"], doc["content"], doc["doc_type"])
        status  = "✅" if success else "❌"
        print(f"  {status} {doc['title']}")

def main():
    print("=" * 60)
    print("  EDGEAI — Knowledge Base Uploader")
    print("=" * 60)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token = login()
    uploaded = 0
    for filename in JSON_FILES:
        filepath = os.path.join(script_dir, filename)
        if os.path.exists(filepath):
            upload_machine_file(token, filepath)
            uploaded += 1
        else:
            print(f"\n⚠️  File not found: {filepath}")
    print(f"\n{'=' * 60}")
    print(f"✅ Done! {uploaded}/{len(JSON_FILES)} machine files uploaded.")
    print(f"🤖 RAG knowledge base updated with real machine data!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
