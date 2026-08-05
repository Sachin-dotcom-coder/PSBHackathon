"""
b.py — Backward-compatibility entry point wrapper.
Re-exports the FastAPI `app` from `main.py`.

Command options:
    uvicorn b:app --reload --port 8000 (from backend/)
    uvicorn backend.b:app --reload --port 8000 (from root PSBHackathon/)
"""

import sys
import pathlib

BACKEND_DIR = pathlib.Path(__file__).parent.resolve()
ROOT_DIR    = BACKEND_DIR.parent.resolve()

for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
