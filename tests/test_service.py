#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Basic smoke tests for the local AI service.
Run with: python tests/test_service.py
"""

import json
import os
import sys
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(PROJECT_DIR)
sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

import django

django.setup()

from ai_assistant.services import LocalAgentService  # noqa: E402


def print_block(title: str, payload) -> None:
    print("\n" + "=" * 60)
    print(f"{title} @ {datetime.now():%Y-%m-%d %H:%M:%S}")
    print("=" * 60)
    if isinstance(payload, (dict, list)):
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload)


def main() -> None:
    service = LocalAgentService()
    service.reset_sessions()

    print_block("Available sessions (initial)", service.list_sessions())

    first = service.send_message("Please describe the intelligent manufacturing supply chain.")
    print_block("First response", first)

    session_id = first.get("session_id")
    second = service.send_message(
        "Which metrics help evaluate a company's position in that chain?", session_id=session_id
    )
    print_block("Follow-up response", second)

    history = service.get_chat_history(session_id)
    print_block("History", history)

    cleared = service.delete_session(session_id)
    print_block("Delete session result", {"session_id": session_id, "deleted": cleared})
    print_block("Available sessions (final)", service.list_sessions())


if __name__ == "__main__":
    main()
