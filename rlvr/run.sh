#!/bin/bash

# RLVR Framework Runner Script
# Provides convenient commands for common RLVR operations

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    echo "RLVR Framework Runner"
    echo "Usage: ./run.sh <command>"
    echo ""
    echo "Commands:"
    echo "  install     - Install Python dependencies"
    echo "  demo        - Run quick demo with mock data"
    echo "  showcase    - Run full showcase demonstration"
    echo "  test        - Run comprehensive test suite"
    echo "  gym         - Run gym with mock generator (no API key needed)"
    echo "  gym-llm     - Run gym with OpenAI LLM (requires OPENAI_API_KEY)"
    echo "  server      - Start FastAPI server"
    echo "  clean       - Clean up generated files"
    echo "  help        - Show this help message"
}

install_deps() {
    echo "Installing RLVR dependencies..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
}

run_demo() {
    echo "Running RLVR quick demo..."
    python -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'rlvr'))

from rlvr.generator.mock import MockGenerator
from rlvr.gym.run import load_metric, score_text
import yaml

# Load Hawaiian config
with open('lang/haw/haw.yaml', 'r') as f:
    lang_cfg = yaml.safe_load(f)

# Load metrics
metrics = []
for metric_def in lang_cfg['metrics']:
    metric = load_metric(metric_def, lang_cfg)
    metrics.append(metric)

# Create mock generator
generator = MockGenerator(lang_cfg)

# Test sentence
test_sentence = 'Do not go there.'
print(f'Input: {test_sentence}')

# Generate candidates
candidates = generator.generate(test_sentence, k=4)
print(f'Generated {len(candidates)} candidates:')

# Score each candidate
weights = lang_cfg['weights']
scored = []
for i, candidate in enumerate(candidates):
    total_score, component_scores = score_text(candidate, metrics, weights, src=test_sentence)
    print(f'  [{i}] \"{candidate}\" -> R={total_score:.3f}')
    breakdown = {ms[\"name\"]: ms[\"score\"] for ms in component_scores}
    print(f'      Breakdown: {breakdown}')
    scored.append((total_score, candidate))

# Show best
best_score, best_translation = max(scored)
print(f'')
print(f'🏆 Best: \"{best_translation}\" (R={best_score:.3f})')
"
}

run_showcase() {
    echo "Running RLVR Showcase Demonstration..."
    echo "This will show all hardcoded Hawaiian sentences with detailed analysis..."
    echo ""
    python test_showcase_demo.py
}

run_tests() {
    echo "Running RLVR test suite..."
    python test_rlvr.py
    echo "✅ All tests passed"
}

run_gym() {
    echo "Running RLVR gym with mock generator..."
    python -m rlvr.gym.run --lang haw --generator mock --k 8
}

run_gym_llm() {
    echo "Running RLVR gym with OpenAI LLM..."
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "❌ Error: OPENAI_API_KEY environment variable not set"
        echo "Set it with: export OPENAI_API_KEY='your-key-here'"
        exit 1
    fi
    python -m rlvr.gym.run --lang haw --generator llm_openai --k 8
}

start_server() {
    echo "Starting RLVR API server..."
    echo "Server will be available at:"
    echo "  - Main: http://localhost:8000"
    echo "  - Docs: http://localhost:8000/docs"
    echo ""
    python -m rlvr.server.api
}

clean_files() {
    echo "Cleaning up generated files..."
    find . -name "*.pyc" -delete
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    rm -rf .pytest_cache
    rm -rf audit/runs/*
    rm -rf gym/runs/*
    echo "✅ Cleanup complete"
}

# Main command handling
case "${1:-help}" in
    install)
        install_deps
        ;;
    demo)
        run_demo
        ;;
    showcase)
        run_showcase
        ;;
    test)
        run_tests
        ;;
    gym)
        run_gym
        ;;
    gym-llm)
        run_gym_llm
        ;;
    server)
        start_server
        ;;
    clean)
        clean_files
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 