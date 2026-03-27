#!/usr/bin/env python3
"""
upload_operational_data.py
Uploads machine operational data (uptime, downtime, sensor logs) to RAG.
Run from: ~/factory-ai-platform/
Usage: python3 upload_operational_data.py
"""

import json
import os
import sys
import requests

API_URL  = "http://localhost:5000"
EMAIL    = "admin@factory.ai"
PASSWORD = "Admin@1234"

JSON_FILES = [
    "operational_machine_1.json",
    "operational_machine_2.json",
    "operational_machine_3.json",
    "operational_machine_4.json",
    "operational_machine_5.json",
]

def login() -> str:
    print("🔐 Logging in...")
    res = requests.post(f"{API_URL}/api/auth/login", json={
        "email": EMAIL, "password": PASSWORD
    })
    if res.status_code != 200:
        print(f"❌ Login failed: {res.text}")
        sys.exit(1)
    print("✅ Login successful!")
    return res.json()["access_token"]

def upload_document(token: str, title: str, content: str, doc_type: str) -> bool:
    res = requests.post(f"{API_URL}/api/index-document",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"title": title, "content": content, "doc_type": doc_type}
    )
    return res.status_code == 201

def upload_machine_file(token: str, filepath: str) -> None:
    with open(filepath, "r") as f:
        data = json.load(f)

    machine_name = data["machine_name"]
    documents    = data["documents"]
    period       = data.get("report_period", "")

    print(f"\n📦 Uploading {machine_name} operational data ({len(documents)} docs, period: {period})...")
    for doc in documents:
        success = upload_document(token, doc["title"], doc["content"], doc["doc_type"])
        print(f"  {'✅' if success else '❌'} {doc['title']}")

def main():
    print("=" * 60)
    print("  Shopfloor Copilot — Operational Data Uploader")
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
    print(f"✅ Done! {uploaded}/{len(JSON_FILES)} operational files uploaded.")
    print(f"🤖 RAG can now answer uptime, downtime, sensor, and alert queries!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
