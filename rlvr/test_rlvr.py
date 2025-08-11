#!/usr/bin/env python3
"""
Test script for RLVR framework.
Tests metrics, generator, and full pipeline with mock data.
"""

from rlvr.audit import AuditLogger
from rlvr.utils.scoring import aggregate_scores
from rlvr.optimizer import EpsilonGreedyBandit
from rlvr.generator import MockGenerator
from rlvr.metrics import Diacritics, TAMParticles, ArticlesKeKa
import sys
from pathlib import Path

# Add rlvr to path
sys.path.insert(0, str(Path(__file__).parent))


def test_metrics():
    """Test individual metrics with known examples."""
    print("\n=== Testing Metrics ===")

    # Load test language config
    lang_cfg = {
        "resources": {
            "lex_diacritics": "lang/haw/lex_diacritics.txt",
            "ke_exceptions": "lang/haw/ke_exceptions.txt",
            "tam_regex": "lang/haw/regex_tam.json"
        }
    }

    # Test diacritics metric
    print("\n1. Testing Diacritics Metric:")
    diacritics = Diacritics(lang_cfg)

    test_cases = [
        ("Ua pau ka hōʻike.", 1.0, "Correct diacritics"),
        ("Ua pau ka hoike.", 0.0, "Missing diacritics"),
        ("E komo mai i Hawaiʻi.", 1.0, "Correct diacritics"),
        ("E komo mai i Hawaii.", 0.0, "Missing ʻokina in Hawaiʻi"),
    ]

    for text, expected_score, description in test_cases:
        result = diacritics.score(text)
        print(f"  {description}: '{text}'")
        print(f"    Score: {result['score']:.2f} (expected: {expected_score})")
        print(f"    Details: {result['details']}")

    # Test TAM particles metric
    print("\n2. Testing TAM Particles Metric:")
    tam = TAMParticles(lang_cfg)

    test_cases = [
        ("ʻAʻole e ua ana.", 1.0, "Valid negative TAM"),
        ("ʻAʻole ua.", 0.0, "Invalid ʻAʻole + ua"),
        ("Ua hele ʻo ia.", 1.0, "Valid affirmative TAM"),
        ("Ke pāʻani nei nā keiki.", 1.0, "Valid progressive"),
    ]

    for text, expected_score, description in test_cases:
        result = tam.score(text)
        print(f"  {description}: '{text}'")
        print(f"    Score: {result['score']:.2f} (expected: {expected_score})")
        print(f"    Details: {result['details']}")

    # Test articles metric
    print("\n3. Testing Articles ke/ka Metric:")
    articles = ArticlesKeKa(lang_cfg)

    test_cases = [
        ("Ua pau ka hōʻike.", 1.0, "Correct ka before h"),
        ("Ua pau ke hōʻike.", 0.0, "Wrong article - should be ka"),
        ("Ke pāʻani nei ke keiki.", 1.0, "Correct ke before k"),
        ("Ka pāʻani nei ka keiki.", 0.0, "Wrong articles"),
    ]

    for text, expected_score, description in test_cases:
        result = articles.score(text)
        print(f"  {description}: '{text}'")
        print(f"    Score: {result['score']:.2f} (expected: {expected_score})")
        print(f"    Details: {result['details']}")


def test_full_pipeline():
    """Test the full RLVR pipeline with mock data."""
    print("\n\n=== Testing Full Pipeline ===")

    # Setup
    lang_cfg = {
        "resources": {
            "lex_diacritics": "lang/haw/lex_diacritics.txt",
            "ke_exceptions": "lang/haw/ke_exceptions.txt",
            "tam_regex": "lang/haw/regex_tam.json"
        }
    }

    # Initialize components
    metrics = [
        Diacritics(lang_cfg),
        TAMParticles(lang_cfg),
        ArticlesKeKa(lang_cfg)
    ]

    weights = {
        "diacritics": 0.4,
        "tam_particles": 0.4,
        "articles_ke_ka": 0.2
    }

    generator = MockGenerator({})

    prompts = [
        "Translate to Hawaiian:",
        "Translate to Hawaiian with proper grammar:"
    ]
    bandit = EpsilonGreedyBandit(prompts, epsilon=0.3)

    # Initialize audit logger
    logger = AuditLogger()
    logger.log_config({
        "metrics": [m.name for m in metrics],
        "weights": weights,
        "generator": "MockGenerator"
    })

    # Test examples
    test_examples = [
        "We already finished the report.",
        "Do not go there.",
        "It is not raining.",
        "The children are playing."
    ]

    for src in test_examples:
        print(f"\nProcessing: '{src}'")

        # Select prompt
        prompt = bandit.pick()

        # Generate candidates
        candidates = generator.generate(src, k=4, prompt=prompt)
        print(f"Generated {len(candidates)} candidates")

        # Score each candidate
        scored_candidates = []
        for i, candidate in enumerate(candidates):
            component_scores = []
            for metric in metrics:
                score_result = metric.score(candidate, src)
                component_scores.append(score_result)

            total_score = aggregate_scores(component_scores, weights)

            scored_candidates.append({
                "text": candidate,
                "total": total_score,
                "breakdown": {s["name"]: s["score"] for s in component_scores}
            })

            print(f"  [{i}] '{candidate}' -> R={total_score:.3f}")
            print(f"      Breakdown: {scored_candidates[-1]['breakdown']}")

        # Select best
        best_idx = max(range(len(scored_candidates)),
                       key=lambda i: scored_candidates[i]["total"])
        best = scored_candidates[best_idx]

        print(f"Best: '{best['text']}' (R={best['total']:.3f})")

        # Update bandit
        bandit.update(prompt, best["total"])

        # Log to audit
        logger.log_translation(
            src=src,
            candidates=[c["text"] for c in scored_candidates],
            scores=scored_candidates,
            best_idx=best_idx,
            prompt=prompt
        )

    # Print bandit stats
    print("\n=== Bandit Statistics ===")
    stats = bandit.get_stats()
    for prompt_stat in stats["prompts"]:
        print(f"Prompt: '{prompt_stat['prompt'][:40]}...'")
        print(f"  Value: {prompt_stat['value']:.3f}")
        print(f"  Count: {prompt_stat['count']}")

    # Finalize audit log
    logger.finalize({"examples_processed": len(test_examples)})
    print(f"\nAudit log saved to: {logger.get_log_path()}")


def test_api():
    """Test the REST API (requires server to be running)."""
    print("\n\n=== Testing API ===")

    try:
        import httpx
    except ImportError:
        print("httpx not installed, skipping API test")
        return

    # Check if server is running
    try:
        response = httpx.get("http://localhost:8000/")
        print(f"Server status: {response.json()}")
    except Exception as e:
        print(f"API server not running: {e}")
        print("Start the server with: uvicorn rlvr.server.api:app --reload")
        return

    # Test translation endpoint
    request_data = {
        "segments": [
            {"id": "1", "src": "Do not go there."},
            {"id": "2", "src": "We already finished."}
        ],
        "src": "en",
        "tgt": "haw",
        "mode": "rlvr"
    }

    try:
        response = httpx.post(
            "http://localhost:8000/translate", json=request_data)
        result = response.json()

        print("\nTranslation results:")
        for res in result["results"]:
            print(f"\nSegment {res['id']}:")
            print(f"  Best: {res['best']['tgt']}")
            print(f"  Candidates: {len(res['candidates'])}")
            print(f"  Top score: {res['candidates'][0]['R']:.3f}")

    except Exception as e:
        print(f"Error calling API: {e}")


if __name__ == "__main__":
    print("RLVR Framework Test Suite")
    print("=" * 50)

    # Run tests
    test_metrics()
    test_full_pipeline()
    test_api()

    print("\n\nTests completed!")
    print("\nTo run the full gym:")
    print("  python -m rlvr.gym.run --lang haw --generator mock")
    print("\nTo start the API server:")
    print("  uvicorn rlvr.server.api:app --reload")
