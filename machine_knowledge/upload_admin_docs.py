#!/usr/bin/env python3
"""
upload_admin_docs.py
Uploads all admin-level machine documents to the RAG system.
Run from: ~/factory-ai-platform/
Usage: python3 upload_admin_docs.py
"""

import json
import os
import sys
import requests

API_URL  = "http://localhost:5000"
EMAIL    = "admin@factory.ai"
PASSWORD = "Admin@1234"

JSON_FILES = [
    "admin_machine_1.json",
    "admin_machine_2.json",
    "admin_machine_3.json",
    "admin_machine_4.json",
    "admin_machine_5.json",
    "admin_fleet_summary.json",
]

def login() -> str:
    print("🔐 Logging in...")
    res = requests.post(f"{API_URL}/api/auth/login",
                        json={"email": EMAIL, "password": PASSWORD})
    if res.status_code != 200:
        print(f"❌ Login failed: {res.text}")
        sys.exit(1)
    print("✅ Login successful!")
    return res.json()["access_token"]

def upload_document(token: str, title: str, content: str, doc_type: str) -> bool:
    res = requests.post(
        f"{API_URL}/api/index-document",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"title": title, "content": content, "doc_type": doc_type}
    )
    return res.status_code == 201

def upload_file(token: str, filepath: str) -> None:
    with open(filepath, "r") as f:
        data = json.load(f)
    name = data["machine_name"]
    docs = data["documents"]
    print(f"\n📦 Uploading {name} ({len(docs)} documents)...")
    for doc in docs:
        ok = upload_document(token, doc["title"], doc["content"], doc["doc_type"])
        print(f"  {'✅' if ok else '❌'} [{doc['doc_type']}] {doc['title']}")

def main():
    print("=" * 65)
    print("  Shopfloor Copilot — Admin Knowledge Base Uploader")
    print("=" * 65)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token = login()
    uploaded_files = 0
    for filename in JSON_FILES:
        filepath = os.path.join(script_dir, filename)
        if os.path.exists(filepath):
            upload_file(token, filepath)
            uploaded_files += 1
        else:
            print(f"\n⚠️  File not found: {filepath}")

    print(f"\n{'=' * 65}")
    print(f"✅ Done! {uploaded_files}/{len(JSON_FILES)} files uploaded.")
    print(f"")
    print(f"RAG can now answer admin queries including:")
    print(f"  • Maintenance history and technician workload")
    print(f"  • Spare parts inventory and reorder alerts")
    print(f"  • Safety compliance and audit logs")
    print(f"  • KPIs: MTBF, MTTR, OEE benchmarks")
    print(f"  • Cost summaries per machine and fleet-wide")
    print(f"  • Upcoming maintenance schedule")
    print(f"{'=' * 65}")

if __name__ == "__main__":
    main()
