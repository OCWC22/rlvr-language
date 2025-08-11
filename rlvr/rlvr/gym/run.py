"""
Main gym runner for RLVR framework.
Loads datasets, runs generator/scorer loops, optimizes prompts, and saves results.
"""

from rlvr.optimizer.bandit import EpsilonGreedyBandit
from rlvr.utils.scoring import aggregate_scores, create_reward_breakdown
import json
import argparse
import importlib
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

import yaml

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_metric(metric_def: Dict[str, str], lang_cfg: Dict[str, Any]):
    """Dynamically load a metric class from module definition."""
    module_name = metric_def["module"]
    metric_name = metric_def["name"]

    # Import the module
    module = importlib.import_module(module_name)

    # Find the metric class - look for class name matching the metric name
    metric_class = None
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if hasattr(attr, '__bases__') and hasattr(attr, 'name'):
            # Check if it's a class and has a name attribute
            try:
                if hasattr(attr, 'name') and attr.name.lower() == metric_name.lower():
                    metric_class = attr
                    break
            except:
                continue

    if not metric_class:
        raise ValueError(
            f"Could not find metric class for {metric_name} in {module_name}")

    return metric_class(lang_cfg)


def score_text(text: str, metrics: List, weights: Dict[str, float], src: str = None):
    """Score a text using all metrics and return aggregated score."""
    component_scores = []

    for metric in metrics:
        try:
            score_result = metric.score(text, src)
            component_scores.append(score_result)
        except Exception as e:
            logger.error(f"Error in metric {metric.name}: {e}")
            # Add a failure score
            component_scores.append({
                "name": metric.name,
                "version": metric.version,
                "score": 0.0,
                "details": {"error": str(e)}
            })

    total_score = aggregate_scores(component_scores, weights)
    return total_score, component_scores


def load_generator(lang_cfg: Dict[str, Any]):
    """Load the appropriate generator based on configuration."""
    gen_kind = lang_cfg["generator"]["kind"]
    gen_params = lang_cfg["generator"]["params"]

    if gen_kind == "llm":
        # Try OpenAI first, fall back to mock
        try:
            from rlvr.generator.llm_openai import OpenAIGenerator
            return OpenAIGenerator(gen_params)
        except (ImportError, ValueError) as e:
            logger.warning(f"Could not load OpenAI generator: {e}")
            logger.info("Falling back to mock generator")
            from rlvr.generator.mock import MockGenerator
            return MockGenerator(gen_params)
    elif gen_kind == "mock":
        from rlvr.generator.mock import MockGenerator
        return MockGenerator(gen_params)
    else:
        raise ValueError(f"Unknown generator kind: {gen_kind}")


def main():
    parser = argparse.ArgumentParser(
        description="Run RLVR gym training/evaluation")
    parser.add_argument("--lang", default="haw", help="Language code")
    parser.add_argument("--dataset", default="gym/datasets/dev.jsonl",
                        help="Path to dataset file")
    parser.add_argument("--k", type=int, default=12,
                        help="Number of candidates to generate")
    parser.add_argument("--output", default=None,
                        help="Output file path (default: audit/runs/run_TIMESTAMP.jsonl)")
    parser.add_argument("--generator", choices=["llm", "mock"], default=None,
                        help="Override generator type")
    parser.add_argument("--epsilon", type=float, default=0.25,
                        help="Epsilon for bandit exploration")

    args = parser.parse_args()

    # Load language configuration
    lang_config_path = Path(f"lang/{args.lang}/{args.lang}.yaml")
    if not lang_config_path.exists():
        logger.error(f"Language config not found: {lang_config_path}")
        sys.exit(1)

    with open(lang_config_path, 'r', encoding='utf-8') as f:
        lang_cfg = yaml.safe_load(f)

    logger.info(f"Loaded language config for {lang_cfg['code']}")

    # Override generator if specified
    if args.generator:
        lang_cfg["generator"]["kind"] = args.generator

    # Load metrics
    metrics = []
    for metric_def in lang_cfg["metrics"]:
        metric = load_metric(metric_def, lang_cfg)
        metrics.append(metric)
        logger.info(f"Loaded metric: {metric.name} v{metric.version}")

    weights = lang_cfg["weights"]

    # Initialize prompt bandit
    base_prompt = lang_cfg["generator"]["params"]["prompt_template"]
    prompt_variants = [
        base_prompt,
        base_prompt + "\nBe very careful with diacritics, TAM particles, and articles.",
        base_prompt + "\nStrictly follow Hawaiian grammar rules, especially for negation.",
    ]

    bandit = EpsilonGreedyBandit(prompt_variants, epsilon=args.epsilon)
    logger.info(f"Initialized bandit with {len(prompt_variants)} prompts")

    # Load generator
    generator = load_generator(lang_cfg)
    logger.info(f"Loaded generator: {generator.__class__.__name__}")

    # Load dataset
    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        # Dataset path is already relative to rlvr directory
        pass

    if not dataset_path.exists():
        logger.error(f"Dataset not found: {args.dataset}")
        sys.exit(1)

    with open(dataset_path, 'r', encoding='utf-8') as f:
        examples = [json.loads(line) for line in f if line.strip()]

    logger.info(f"Loaded {len(examples)} examples from {dataset_path}")

    # Process examples
    results = []

    for i, example in enumerate(examples):
        logger.info(
            f"\nProcessing example {i+1}/{len(examples)}: {example['id']}")
        logger.info(f"Source: {example['src']}")

        # Select prompt
        prompt = bandit.pick()

        # Generate candidates
        candidates = generator.generate(
            example["src"],
            k=args.k,
            prompt=prompt,
            temperature=lang_cfg["generator"]["params"]["temperature"]
        )

        # Score each candidate
        scored_candidates = []
        for j, candidate_text in enumerate(candidates):
            total_score, component_scores = score_text(
                candidate_text,
                metrics,
                weights,
                src=example["src"]
            )

            scored_candidates.append({
                "id": f"c{j}",
                "text": candidate_text,
                "R": total_score,
                "breakdown": {ms["name"]: ms["score"] for ms in component_scores},
                "details": {ms["name"]: ms["details"] for ms in component_scores}
            })

        # Sort by score and get best
        scored_candidates.sort(key=lambda x: x["R"], reverse=True)
        best = scored_candidates[0]

        logger.info(f"Best translation: {best['text']} (R={best['R']:.3f})")

        # Update bandit
        bandit.update(prompt, best["R"])

        # Store result
        result = {
            "example_id": example["id"],
            "src": example["src"],
            "ref": example.get("ref"),
            "best": best,
            "candidates": scored_candidates,
            "prompt": prompt,
            "weights": weights,
            "timestamp": datetime.now().isoformat()
        }

        results.append(result)

    # Save results
    if args.output:
        output_path = Path(args.output)
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = Path(f"audit/runs/run_{timestamp}.jsonl")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        for result in results:
            f.write(json.dumps(result, ensure_ascii=False) + '\n')

    logger.info(f"\nResults saved to: {output_path}")

    # Print summary statistics
    logger.info("\n=== Summary ===")
    avg_score = sum(r["best"]["R"] for r in results) / len(results)
    logger.info(f"Average best score: {avg_score:.3f}")

    # Print bandit statistics
    stats = bandit.get_stats()
    logger.info("\n=== Prompt Performance ===")
    for prompt_stat in stats["prompts"]:
        logger.info(f"Value: {prompt_stat['value']:.3f} | "
                    f"Count: {prompt_stat['count']} | "
                    f"Prompt: {prompt_stat['prompt'][:50]}...")


if __name__ == "__main__":
    main()
