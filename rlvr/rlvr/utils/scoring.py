"""Scoring utilities for aggregating metric scores."""

from typing import List, Dict, Any


def aggregate_scores(component_scores: List[Dict[str, Any]],
                     weights: Dict[str, float]) -> float:
    """
    Aggregate multiple metric scores into a single score using weights.

    Args:
        component_scores: List of metric results, each with 'name' and 'score'
        weights: Dictionary mapping metric names to weights

    Returns:
        Weighted average score between 0 and 1
    """
    total = 0.0
    total_weight = 0.0

    for score_dict in component_scores:
        metric_name = score_dict.get("name")
        metric_score = score_dict.get("score", 0.0)

        if metric_name in weights:
            weight = weights[metric_name]
            total += weight * metric_score
            total_weight += weight

    # Normalize by total weight to handle cases where not all metrics apply
    if total_weight > 0:
        return total / total_weight
    else:
        return 0.0


def create_reward_breakdown(component_scores: List[Dict[str, Any]],
                            weights: Dict[str, float],
                            total_score: float) -> Dict[str, Any]:
    """
    Create a detailed reward breakdown for transparency.

    Args:
        component_scores: List of metric results
        weights: Dictionary mapping metric names to weights  
        total_score: The aggregated total score

    Returns:
        Dictionary with total score and component breakdowns
    """
    return {
        "total": total_score,
        "components": component_scores,
        "weights": weights,
        "weighted_scores": {
            score["name"]: score["score"] * weights.get(score["name"], 0.0)
            for score in component_scores
            if score["name"] in weights
        }
    }
