# Adding New Languages to RLVR

This guide walks you through the complete process of extending the RLVR (Reinforcement Learning with Verifiable Rewards) framework to support a new language. The framework is designed to be language-agnostic and modular, making language addition straightforward through configuration and metric definition.

## 📋 Overview

The RLVR framework uses a **Language Pack system** where each language is completely self-contained. Adding a new language involves:

1. **Creating language-specific metrics** that capture important linguistic features
2. **Defining resource files** with linguistic rules and exceptions
3. **Configuring the language pack** with weights and generator settings
4. **Creating evaluation datasets** for testing and training
5. **Testing and validation** to ensure proper integration

## 🏗️ Architecture Overview

```
lang/<language_code>/
├── <lang>.yaml              # Main configuration
├── <resource_files>         # Language-specific rules/lexicons
└── ...

rlvr/metrics/
├── <lang_metric1>.py        # Custom metrics for the language
├── <lang_metric2>.py
└── ...

gym/datasets/
├── <lang>_dev.jsonl         # Development/test dataset
└── <lang>_train.jsonl       # Training dataset (optional)
```

## 🚀 Step-by-Step Implementation

### Step 1: Define Language-Specific Metrics

Identify the key linguistic features that are important for your target language. These will become your verifiable metrics.

**Example linguistic features by language family:**

- **Tonal languages** (Chinese, Vietnamese, Thai): Tone markers, tone sandhi rules
- **Agglutinative** (Turkish, Finnish): Morphological suffixes, vowel harmony
- **Inflectional** (German, Russian): Case agreement, gender agreement
- **Isolating** (Vietnamese): Word order, classifier usage
- **Polysynthetic** (Inuktitut): Complex morphology, incorporation

#### Create Metric Classes

Each metric must inherit from the base `Metric` class:

```python
# rlvr/metrics/<your_language>_<feature>.py
from .base import Metric
from typing import Dict, Any, Optional

class YourLanguageFeature(Metric):
    name = "feature_name"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        # Load language-specific resources
        resource_path = lang_cfg["resources"]["feature_resource"]
        with open(resource_path) as f:
            self.rules = self._load_rules(f)

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        # Implement scoring logic
        score_value = self._calculate_score(text)

        return {
            "name": self.name,
            "version": self.version,
            "score": score_value,  # 0.0 to 1.0
            "details": {
                "checked": num_applicable,
                "correct": num_correct,
                "errors": specific_errors
            }
        }

    def _calculate_score(self, text: str) -> float:
        # Your scoring implementation
        pass
```

### Step 2: Create Resource Files

Language-specific resources contain the rules, exceptions, and patterns your metrics need.

**Common resource file types:**

- **Lexicons**: Words requiring special treatment (`.txt` files)
- **Rules**: Grammar patterns, regex definitions (`.json` files)
- **Mappings**: Character/phoneme correspondences (`.json` files)
- **Exceptions**: Rule exceptions and special cases (`.txt` files)

**Example resource files:**

```
lang/your_lang/
├── tone_markers.txt         # Required tone diacritics
├── grammar_patterns.json    # Valid grammar structures
├── romanization_map.json    # Script conversion rules
└── exceptions.txt           # Rule exceptions
```

### Step 3: Configure the Language Pack

Create the main configuration file that ties everything together:

```yaml
# lang/<code>/<code>.yaml
code: <iso_language_code>
name: "<Language Name>"
direction: target # or source, or both

# Define which metrics to use and their weights
metrics:
  - name: <metric1_name>
    module: metrics.<metric1_module>
  - name: <metric2_name>
    module: metrics.<metric2_module>

# Weights must sum to 1.0
weights:
  <metric1_name>: 0.4
  <metric2_name>: 0.6

# Resource file paths (relative to project root)
resources:
  <resource1_name>: lang/<code>/<resource1_file>
  <resource2_name>: lang/<code>/<resource2_file>

# Generator configuration
generator:
  kind: llm # or nmt
  params:
    temperature: 0.8
    top_p: 0.9
    k_samples: 8
    prompt_template: |
      Translate to <Language> using proper <writing_system>.
      Follow <important_rule1> and <important_rule2>.

      <Source Language>: "{src}"
      <Target Language>:
```

### Step 4: Create Evaluation Datasets

Create development and test datasets in JSONL format:

```json
{"id":"1","src":"Hello world","ref":"<translation>","meta":{"difficulty":"basic"}}
{"id":"2","src":"How are you?","ref":"<translation>","meta":{"features":["particles"]}}
```

**Dataset guidelines:**

- Start with 20-50 examples for development
- Include diverse linguistic phenomena
- Add metadata for feature tracking
- Use natural, conversational language

### Step 5: Register the Language

Update the metrics module to include your new metrics:

```python
# rlvr/metrics/__init__.py
from .base import Metric
from .your_language_metric1 import YourLanguageMetric1
from .your_language_metric2 import YourLanguageMetric2

__all__ = [
    'Metric', 'YourLanguageMetric1', 'YourLanguageMetric2',
    # ... existing metrics
]
```

### Step 6: Test and Validate

#### Basic Functionality Test

```bash
# Test metric loading
PYTHONPATH=. python -c "
from rlvr.gym.run import load_language_config, load_metric
cfg = load_language_config('your_lang')
for m in cfg['metrics']:
    metric = load_metric(m, cfg)
    print(f'{metric.name}: loaded successfully')
"

# Test with sample text
PYTHONPATH=. python -c "
from rlvr.gym.run import *
cfg = load_language_config('your_lang')
metrics = [load_metric(m, cfg) for m in cfg['metrics']]
result = score_text('sample text', metrics, cfg['weights'])
print(f'Score: {result}')
"
```

#### Run the Gym

```bash
# Test translation gym
PYTHONPATH=. python run_gym_final.py --lang your_lang --k 3

# Test API (if server is running)
curl -X POST localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"segments":[{"src":"Hello"}], "src":"en", "tgt":"your_lang"}'
```

## 📁 Complete Example Structure

Here's what your language pack should look like when complete:

```
lang/hok/                              # Hokkien example
├── hok.yaml                          # Main config
├── tone_markers.txt                  # Tone diacritics: â ê î ô û
├── particle_patterns.json            # {assertive: [啊, lah], question: [bô]}
└── romanization_map.json             # POJ/Tâi-lô mappings

rlvr/metrics/
├── hokkien_tones.py                  # Tone accuracy metric
├── hokkien_particles.py              # Sentence particle usage
└── hokkien_reduplication.py          # Reduplication patterns

gym/datasets/
├── hok_dev.jsonl                     # Development set
└── hok_train.jsonl                   # Training set (optional)
```

## 🎯 Best Practices

### Metric Design

- **Start simple**: Begin with 2-3 core metrics, add complexity later
- **Be verifiable**: Metrics should be rule-based, not subjective
- **Handle edge cases**: Return `1.0` (perfect) when metric doesn't apply
- **Provide details**: Include specific error information for debugging

### Resource Files

- **Keep them minimal**: Start with essential rules, expand based on testing
- **Use clear formats**: Prefer JSON for structured data, plain text for lists
- **Document sources**: Include comments about where rules came from
- **Version control**: Track changes to linguistic resources

### Testing Strategy

- **Incremental testing**: Test each metric independently before integration
- **Error cases**: Include deliberate errors in test data
- **Cultural review**: Have native speakers validate examples
- **Performance testing**: Ensure metrics scale with text length

## 🔧 Troubleshooting

### Common Issues

**Metric Loading Errors**

```
ImportError: cannot import name 'YourMetric'
```

- Check metric class name matches file import
- Verify `__all__` list in `__init__.py`
- Ensure proper inheritance from `Metric` base class

**Resource File Not Found**

```
FileNotFoundError: [Errno 2] No such file or directory: 'lang/...'
```

- Verify paths in YAML config are relative to project root
- Check file permissions and existence
- Use forward slashes in paths (works on all platforms)

**Scoring Issues**

```
All scores are 1.0 or 0.0
```

- Check metric logic for edge cases
- Verify test data actually contains features being measured
- Add debug prints to understand scoring flow

### Debugging Tools

**Test Individual Metrics**

```python
# debug_your_language.py
from rlvr.gym.run import load_language_config, load_metric

cfg = load_language_config('your_lang')
metric = load_metric(cfg['metrics'][0], cfg)

# Test with sample text
test_text = "Your test sentence here"
result = metric.score(test_text)
print(f"Score: {result['score']}")
print(f"Details: {result['details']}")
```

**Validate Language Pack**

```python
# validate_language_pack.py
import yaml
from pathlib import Path

def validate_language_pack(lang_code):
    config_path = f"lang/{lang_code}/{lang_code}.yaml"

    # Check config exists and is valid YAML
    with open(config_path) as f:
        cfg = yaml.safe_load(f)

    # Check required fields
    required = ['code', 'metrics', 'weights', 'resources', 'generator']
    for field in required:
        assert field in cfg, f"Missing required field: {field}"

    # Check resource files exist
    for name, path in cfg['resources'].items():
        assert Path(path).exists(), f"Resource file not found: {path}"

    # Check weights sum to 1.0
    total_weight = sum(cfg['weights'].values())
    assert abs(total_weight - 1.0) < 0.001, f"Weights sum to {total_weight}, not 1.0"

    print(f"✅ Language pack '{lang_code}' is valid!")

# Usage
validate_language_pack('your_lang')
```

## 🚀 Ready to Deploy

Once your language pack is complete and tested:

1. **Create sample datasets** for demonstration
2. **Document language-specific features** in README
3. **Test bidirectional translation** if applicable
4. **Update main documentation** with your language
5. **Run performance benchmarks** with typical workloads

Your new language is now ready to use with the full RLVR framework - gym training, API endpoints, and verifiable translation quality scoring!

## 📚 Additional Resources

- [Metric Development Guide](metric-development.md)
- [Language Resource Creation](resource-creation.md)
- [Testing and Validation](testing-validation.md)
- [Example: Hokkien Implementation](../examples/hokkien-complete-example.md)
- [Troubleshooting Common Issues](troubleshooting.md)
