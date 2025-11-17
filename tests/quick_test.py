#!/usr/bin/env python3
"""Quick sanity check for the local AI assistant."""

import os
import sys

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(PROJECT_DIR)
sys.path.insert(0, BASE_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

import django

django.setup()

from ai_assistant.services import LocalAgentService  # noqa: E402


def main() -> int:
    service = LocalAgentService()
    service.reset_sessions()

    print("Quick test: Local AI assistant")
    response = service.send_message("Please summarise the new energy industry chain.")
    if not response.get("success"):
        print("Service failed:", response.get("error"))
        return 1

    print("Reply:", response.get("response"))
    session_id = response.get("session_id")
    history = service.get_chat_history(session_id)
    print(f"History length: {len(history)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
