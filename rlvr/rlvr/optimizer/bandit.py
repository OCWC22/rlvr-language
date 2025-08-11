"""Epsilon-greedy bandit for prompt optimization."""

import random
import json
from typing import List, Dict, Any, Optional
from pathlib import Path


class EpsilonGreedyBandit:
    """
    Epsilon-greedy multi-armed bandit for prompt selection.

    Balances exploration of new prompts with exploitation of best-performing ones.
    """

    def __init__(self,
                 prompts: List[str],
                 epsilon: float = 0.2,
                 initial_value: float = 0.5):
        """
        Initialize the bandit.

        Args:
            prompts: List of prompt templates to choose from
            epsilon: Exploration rate (0-1), probability of random selection
            initial_value: Initial value estimate for all prompts
        """
        self.prompts = prompts
        self.epsilon = epsilon

        # Initialize value estimates and counts
        self.values: Dict[str, float] = {p: initial_value for p in prompts}
        self.counts: Dict[str, int] = {p: 0 for p in prompts}
        self.total_selections = 0

        # Track history for analysis
        self.history: List[Dict[str, Any]] = []

    def pick(self) -> str:
        """
        Select a prompt using epsilon-greedy strategy.

        Returns:
            Selected prompt string
        """
        self.total_selections += 1

        if random.random() < self.epsilon:
            # Explore: random selection
            prompt = random.choice(self.prompts)
            selection_type = "explore"
        else:
            # Exploit: select best performing
            prompt = max(self.prompts, key=lambda p: self.values[p])
            selection_type = "exploit"

        self.history.append({
            "selection": self.total_selections,
            "prompt": prompt,
            "type": selection_type,
            "value": self.values[prompt]
        })

        return prompt

    def update(self, prompt: str, reward: float):
        """
        Update value estimate for a prompt based on observed reward.

        Uses incremental update rule for online learning.

        Args:
            prompt: The prompt that was used
            reward: Observed reward (typically 0-1)
        """
        if prompt not in self.prompts:
            raise ValueError(f"Unknown prompt: {prompt}")

        # Increment count
        self.counts[prompt] += 1
        n = self.counts[prompt]

        # Update value estimate using incremental average
        old_value = self.values[prompt]
        self.values[prompt] = old_value + (reward - old_value) / n

        # Record update
        self.history.append({
            "selection": self.total_selections,
            "prompt": prompt,
            "type": "update",
            "reward": reward,
            "new_value": self.values[prompt],
            "count": n
        })

    def get_stats(self) -> Dict[str, Any]:
        """
        Get current bandit statistics.

        Returns:
            Dictionary with prompt performance stats
        """
        stats = {
            "total_selections": self.total_selections,
            "epsilon": self.epsilon,
            "prompts": []
        }

        for prompt in self.prompts:
            stats["prompts"].append({
                "prompt": prompt,
                "value": self.values[prompt],
                "count": self.counts[prompt],
                "selection_rate": self.counts[prompt] / max(1, self.total_selections)
            })

        # Sort by value
        stats["prompts"].sort(key=lambda p: p["value"], reverse=True)

        return stats

    def save_state(self, filepath: Path):
        """Save bandit state to file."""
        state = {
            "prompts": self.prompts,
            "epsilon": self.epsilon,
            "values": self.values,
            "counts": self.counts,
            "total_selections": self.total_selections,
            "history": self.history[-100:]  # Keep last 100 entries
        }

        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)

    def load_state(self, filepath: Path):
        """Load bandit state from file."""
        with open(filepath, 'r') as f:
            state = json.load(f)

        self.prompts = state["prompts"]
        self.epsilon = state["epsilon"]
        self.values = state["values"]
        self.counts = state["counts"]
        self.total_selections = state["total_selections"]
        self.history = state.get("history", [])
