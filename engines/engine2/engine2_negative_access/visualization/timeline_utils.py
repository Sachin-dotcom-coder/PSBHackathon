"""
timeline_utils.py — Behavioral change point detection, trend analysis, and event labeling helper functions.
"""
import numpy as np
import pandas as pd


def detect_decline_start(series: pd.Series, baseline_days=20, threshold=0.85) -> int:
    """
    Detect the first day when a module's activity falls below a percentage of its early baseline.
    
    Parameters:
    -----------
    series : pd.Series
        The daily activity count series.
    baseline_days : int
        Number of days to use for calculating baseline average (default: 20).
    threshold : float
        Decline ratio threshold (default: 0.85 = 15% drop).
        
    Returns:
    --------
    int or None : The day index where decline starts.
    """
    if len(series) < baseline_days:
        return None
    
    baseline_val = series.iloc[:baseline_days].mean()
    if baseline_val < 1.0:
        return None  # Baseline is already zero or negligible
    
    # Calculate rolling average to smooth noise
    rolling = series.rolling(window=7, min_periods=1).mean()
    
    for i in range(baseline_days, len(series)):
        if rolling.iloc[i] < baseline_val * threshold:
            # Verify it stays down or continues to drop
            if i + 5 < len(series) and rolling.iloc[i:i+5].mean() < baseline_val * threshold:
                return i
            elif i + 5 >= len(series):
                return i
    return None


def detect_first_zero(series: pd.Series, check_window=3) -> int:
    """
    Detect the first day when activity reaches 0 and stays at 0.
    """
    for i in range(len(series)):
        if series.iloc[i] == 0:
            # Check if it remains 0 for a window of days
            if i + check_window <= len(series):
                if (series.iloc[i:i+check_window] == 0).all():
                    return i
            else:
                if (series.iloc[i:] == 0).all():
                    return i
    return None


def detect_risk_threshold_cross(series: pd.Series, threshold=60) -> int:
    """
    Detect the first day when the Access Void Score exceeds the threshold.
    """
    for i in range(len(series)):
        if series.iloc[i] >= threshold:
            return i
    return None


def get_trend_indicator(series: pd.Series, window=7) -> str:
    """
    Calculate the trend of the recent values of a series and return a text label.
    """
    if len(series) < window * 2:
        return "→ Stable"
    
    recent_mean = series.tail(window).mean()
    prev_mean = series.iloc[-window*2:-window].mean()
    
    diff = recent_mean - prev_mean
    if diff > 5.0:
        return "↑ Increasing"
    elif diff < -5.0:
        return "↓ Decreasing"
    else:
        return "→ Stable"
