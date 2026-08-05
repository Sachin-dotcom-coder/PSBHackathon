"""
PHANTOM Stats & Health Router
=============================
Provides endpoints for backend health checks and dashboard metrics.
"""

from fastapi import APIRouter
import services.data_loader as data_loader

router = APIRouter(tags=["Stats"])


@router.get("/health")
def health():
    """Health check endpoint detailing loaded prediction counts."""
    return {
        "status": "ok",
        "employees_loaded": len(data_loader.ALL_PREDICTIONS),
        "chain_scores": len(data_loader.CHAIN_SCORES),
        "collusion_scores": len(data_loader.COLLUSION_SCORES),
    }


@router.get("/api/stats")
def get_stats():
    """Returns high-level risk breakdown statistics for the dashboard."""
    return data_loader.STATS_CACHE
