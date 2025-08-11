"""Audit logger for tracking RLVR experiments and ensuring reproducibility."""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional


class AuditLogger:
    """
    Logs all RLVR operations for reproducibility and analysis.

    Tracks:
    - Input/output pairs
    - Model parameters and prompts
    - Metric scores and breakdowns
    - Random seeds and timestamps
    - System configuration
    """

    def __init__(self, run_id: Optional[str] = None, output_dir: str = "audit/runs"):
        """
        Initialize audit logger.

        Args:
            run_id: Unique identifier for this run (auto-generated if not provided)
            output_dir: Directory to save audit logs
        """
        self.run_id = run_id or self._generate_run_id()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.log_file = self.output_dir / f"{self.run_id}.jsonl"
        self.metadata = {
            "run_id": self.run_id,
            "start_time": datetime.now().isoformat(),
            "events": []
        }

        # Write initial metadata
        self._write_event({
            "type": "run_start",
            "run_id": self.run_id,
            "timestamp": self.metadata["start_time"]
        })

    def _generate_run_id(self) -> str:
        """Generate unique run ID with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        short_uuid = str(uuid.uuid4())[:8]
        return f"run_{timestamp}_{short_uuid}"

    def _write_event(self, event: Dict[str, Any]):
        """Write an event to the audit log."""
        event["timestamp"] = event.get("timestamp", datetime.now().isoformat())

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event, ensure_ascii=False) + '\n')

    def log_config(self, config: Dict[str, Any]):
        """Log configuration settings."""
        self._write_event({
            "type": "config",
            "config": config
        })

    def log_translation(self,
                        src: str,
                        candidates: List[str],
                        scores: List[Dict[str, Any]],
                        best_idx: int,
                        prompt: str,
                        params: Optional[Dict[str, Any]] = None):
        """
        Log a translation operation.

        Args:
            src: Source text
            candidates: List of generated candidates
            scores: List of score dictionaries for each candidate
            best_idx: Index of selected best candidate
            prompt: Prompt template used
            params: Additional parameters (temperature, etc.)
        """
        self._write_event({
            "type": "translation",
            "src": src,
            "candidates": candidates,
            "scores": scores,
            "best_idx": best_idx,
            "best_text": candidates[best_idx] if candidates else None,
            "best_score": scores[best_idx]["total"] if scores else None,
            "prompt": prompt,
            "params": params or {}
        })

    def log_metric_evaluation(self,
                              text: str,
                              metric_name: str,
                              score: float,
                              details: Dict[str, Any]):
        """Log individual metric evaluation."""
        self._write_event({
            "type": "metric_eval",
            "text": text,
            "metric": metric_name,
            "score": score,
            "details": details
        })

    def log_bandit_update(self,
                          prompt: str,
                          reward: float,
                          new_value: float,
                          counts: Dict[str, int]):
        """Log bandit learning update."""
        self._write_event({
            "type": "bandit_update",
            "prompt": prompt,
            "reward": reward,
            "new_value": new_value,
            "prompt_counts": counts
        })

    def log_error(self, error_type: str, message: str, details: Optional[Dict[str, Any]] = None):
        """Log errors for debugging."""
        self._write_event({
            "type": "error",
            "error_type": error_type,
            "message": message,
            "details": details or {}
        })

    def finalize(self, summary: Optional[Dict[str, Any]] = None):
        """Finalize the audit log with summary statistics."""
        self._write_event({
            "type": "run_end",
            "run_id": self.run_id,
            "end_time": datetime.now().isoformat(),
            "summary": summary or {}
        })

    def get_log_path(self) -> Path:
        """Return the path to the current log file."""
        return self.log_file
