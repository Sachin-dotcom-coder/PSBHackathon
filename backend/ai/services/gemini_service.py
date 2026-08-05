"""
PHANTOM Gemini AI Integration Service
======================================
Communicates with Google Gemini API to generate executive SOC investigation reports
from structured Engine 1-4 telemetry JSON objects.
Includes intelligent zero-failure fallback for offline/keyless demonstration mode.
"""

import os
import json
import requests
from typing import Dict, Any, Tuple
from ai.reports.report_formatter import format_markdown_report

# Default system prompt path
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "..", "prompts", "investigation_prompt.txt")


def load_system_prompt() -> str:
    """Loads the system prompt for Gemini SOC analyst persona."""
    if os.path.exists(PROMPT_FILE):
        try:
            with open(PROMPT_FILE, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            pass
    return "You are a Senior Cyber Security SOC Analyst working in a Public Sector Bank. Generate a professional markdown investigation report."


def generate_report_with_gemini(schema_data: Dict[str, Any]) -> Tuple[str, bool]:
    """
    Sends structured employee schema to Gemini API.
    Returns tuple of (markdown_text, used_live_gemini_bool).
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if not api_key:
        # Fallback to internal executive generator
        return format_markdown_report(schema_data), False

    system_prompt = load_system_prompt()
    user_json = json.dumps(schema_data, indent=2)

    prompt_content = f"{system_prompt}\n\nStructured Input Data:\n```json\n{user_json}\n```\n\nGenerate the investigation report now in Markdown format."

    # Gemini REST API endpoints to attempt
    models_to_try = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"]
    
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
            }
        }
        
        try:
            resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=8)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip(), True
        except Exception as e:
            print(f"[Gemini Service Warning] Failed using model {model_name}: {e}")
            continue

    # If API calls fail, return clean formatted markdown report
    return format_markdown_report(schema_data), False
