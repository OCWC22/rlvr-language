# RLVR Framework - Getting Started Guide

## Overview

The RLVR (Reinforcement Learning with Verifiable Rewards) framework is now fully implemented and ready to use. This guide will help you get started quickly.

## Installation

```bash
cd rlvr
pip install -r requirements.txt
```

Or use the provided script:

```bash
./run.sh install
```

## Quick Demo

To see RLVR in action immediately:

```bash
./run.sh demo
```

This will translate a sample sentence and show you the scoring in action.

## Running the Full Test Suite

```bash
./run.sh test
```

This will test:

- Individual metrics (diacritics, TAM particles, articles)
- Full pipeline with mock data
- API endpoints (if server is running)

## Using the Gym

### With Mock Generator (No API Key Required)

```bash
./run.sh gym
```

Or manually:

```bash
python -m rlvr.gym.run --lang haw --generator mock --k 8
```

### With OpenAI LLM

First, set your API key:

```bash
export OPENAI_API_KEY='your-key-here'
```

Then run:

```bash
./run.sh gym-llm
```

## Starting the API Server

```bash
./run.sh server
```

The server will be available at:

- Main endpoint: http://localhost:8000
- API docs: http://localhost:8000/docs

### API Usage Example

```bash
curl -X POST "http://localhost:8000/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {"id": "1", "src": "Do not go there."}
    ],
    "src": "en",
    "tgt": "haw",
    "mode": "rlvr"
  }'
```

## Understanding the Output

When you run RLVR, you'll see output like:

```
Processing: 'Do not go there.'
Generated 4 candidates
  [0] 'Mai hele ʻoe i laila.' -> R=1.000
      Breakdown: {'diacritics': 1.0, 'tam_particles': 1.0, 'articles_ke_ka': 1.0}
  [1] 'Mai hele oe i laila.' -> R=0.600
      Breakdown: {'diacritics': 0.0, 'tam_particles': 1.0, 'articles_ke_ka': 1.0}
Best: 'Mai hele ʻoe i laila.' (R=1.000)
```

- **R**: Total reward score (0-1, higher is better)
- **Breakdown**: Individual metric scores
  - `diacritics`: Proper use of ʻokina and kahakō
  - `tam_particles`: Correct tense-aspect-mood particles
  - `articles_ke_ka`: Proper ke/ka article usage

## Key Features Demonstrated

1. **Verifiable Metrics**: Rule-based scoring for Hawaiian grammar
2. **Multiple Candidates**: Generates k variations and picks the best
3. **Prompt Optimization**: Learns which prompts produce better translations
4. **Audit Trail**: Complete logging for reproducibility

## Project Structure

```
rlvr/
├── lang/haw/           # Hawaiian language pack
│   ├── haw.yaml        # Configuration
│   ├── lex_diacritics.txt
│   ├── ke_exceptions.txt
│   └── regex_tam.json
├── metrics/            # Scoring implementations
├── generator/          # Translation generators
├── gym/               # Training runner
├── server/            # REST API
└── audit/runs/        # Experiment logs
```

## Next Steps

1. **Examine the audit logs** in `rlvr/audit/runs/` to see detailed scoring
2. **Modify weights** in `lang/haw/haw.yaml` to adjust metric importance
3. **Add more test sentences** to `gym/datasets/dev.jsonl`
4. **Create new metrics** by extending the `Metric` base class
5. **Add new languages** by creating new language packs

## Extending to New Languages

1. Create `lang/<code>/` directory
2. Add configuration file `<code>.yaml`
3. Provide resource files (lexicons, rules)
4. Implement language-specific metrics
5. Test with `python -m rlvr.gym.run --lang <code>`

## Troubleshooting

- **No module named 'rlvr'**: Make sure you're in the `rlvr` directory
- **API key errors**: Set `OPENAI_API_KEY` or use `--generator mock`
- **Server not running**: Start with `./run.sh server` before API tests

## Integration with Your Chrome Extension

The API is designed to integrate with your language learning extension:

```javascript
// In your extension
const response = await fetch("http://localhost:8000/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    segments: [{ id: "1", src: userText }],
    src: "en",
    tgt: "haw",
    mode: "rlvr",
  }),
});

const data = await response.json();
// Display data.results[0].best.tgt and breakdown
```

Happy translating! 🌺
