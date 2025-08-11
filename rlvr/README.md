# RLVR - Reinforcement Learning with Verifiable Rewards

A framework for improving language translation quality through verifiable, rule-based metrics.

## Overview

RLVR (Reinforcement Learning with Verifiable Rewards) is a system designed to enhance translation quality for low-resource languages by:

1. Generating multiple translation candidates
2. Scoring each candidate using verifiable, rule-based metrics
3. Selecting the best candidate based on weighted scores
4. Optimizing prompts through bandit algorithms

## Features

- **Language Packs**: Modular per-language configurations with rules, lexicons, and metrics
- **Verifiable Metrics**: Rule-based scoring for diacritics, TAM particles, articles, etc.
- **Candidate Generation**: Wrapper for LLMs or NMT models
- **Prompt Optimization**: Epsilon-greedy bandit for improving prompts over time
- **REST API**: Easy integration with Chrome extensions and PWAs
- **Audit Trail**: Complete logging for reproducibility

## Quick Start

```bash
# Install dependencies
cd rlvr
pip install -e .

# Run the gym on Hawaiian dataset
python -m rlvr.gym.run --lang haw --dataset gym/datasets/dev.jsonl --k 12

# Start the API server
uvicorn rlvr.server.api:app --reload
```

## Project Structure

```
rlvr/
├── lang/           # Language packs (configs, resources)
├── metrics/        # Verifiable metric implementations
├── generator/      # Candidate generation wrappers
├── optimizer/      # Prompt optimization algorithms
├── gym/            # Training/evaluation harness
├── server/         # REST API
└── audit/          # Logging and reproducibility
```

## Adding a New Language

1. Create `lang/<code>/<code>.yaml` configuration
2. Add lexicons and rule files
3. Implement language-specific metrics in `metrics/`
4. Add test sentences to `gym/datasets/`
5. Run the gym to verify functionality

## API Usage

```bash
POST /translate
{
  "segments": [{"id": "s1", "src": "Do not go there."}],
  "src": "en",
  "tgt": "haw",
  "mode": "rlvr"
}
```

Response includes the best translation, all candidates with scores, and metric breakdowns.
