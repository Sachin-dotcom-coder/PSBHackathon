"""
PHANTOM — Backend API Server
============================
Modular FastAPI application exposing all 4 Insider Threat Detection Engines.

Run from PSBHackathon root:
    uvicorn backend.main:app --reload --port 8000

Or from backend directory:
    cd backend && uvicorn main:app --reload --port 8000
"""

import sys
import pathlib

BACKEND_DIR = pathlib.Path(__file__).parent.resolve()
ROOT_DIR    = BACKEND_DIR.parent.resolve()

for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.data_loader import load_all_data
from routes.stats import router as stats_router
from routes.employees import router as employees_router
from routes.engines import router as engines_router
from routes.graph import router as graph_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to handle startup data loading."""
    load_all_data()
    yield


app = FastAPI(
    title="PHANTOM API",
    description="AI Insider Threat Detection System — live data and scoring from 4 specialized engines.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(stats_router)
app.include_router(employees_router)
app.include_router(engines_router)
app.include_router(graph_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
