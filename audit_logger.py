import json
import datetime
import os

AUDIT_FILE = os.path.join(os.path.dirname(__file__), "audit.jsonl")

def log_event(event_type: str, data: dict):
    """
    Registra cada evento de auditoría de manera inmutable en audit.jsonl.
    """
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "event_type": event_type,  # PROPOSAL, VALIDATION, EXECUTION, REJECTION
        "details": data
    }
    with open(AUDIT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
