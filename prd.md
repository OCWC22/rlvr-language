Great question. Here’s the **minimum you need** to train/run the RLVR gym for **Hawaiian (haw)**, plus the exact **input/output shapes** so you can wire it up fast.

# What you need (data + configs)

**A) Tiny corpora (day-1)**

- **Seed parallel pairs (EN↔HAW):** 100–500 sentences (sales-y, everyday). Used for quick eval and sanity checks (optional for RL if you only rerank).
- **Monolingual Hawaiian lines:** 500–2k sentences for stress-testing metrics (optional).
- **Dev set:** 20–50 English inputs with either references or hand-checked “good” Hawaiian.

**B) Verifiable resources (rule lists)**

- `lex_diacritics.txt`: \~200–500 Hawaiian wordforms that **require** ʻokina/kahakō (e.g., _Hawaiʻi, ʻōlelo, ʻāina, kū, pāʻina_).
- `ke_exceptions.txt`: 15–50 nouns that take **ke** despite not starting with K/E/A/O (and vice versa if you include).
- `regex_tam.json`: regex/FSM snippets describing valid TAM patterns (affirmative vs after **ʻAʻole**).
- (Later) `possessive_class.csv`: A/O-class nouns (for post-hackathon metric).

**C) Config**

- `lang/haw/haw.yaml`: metric list + weights, generator params, resource file paths.

**D) A base generator**

- Any translator that can output Hawaiian: LLM or NMT. For hackathon, LLM is fine. RLVR treats it as a black box.

---

# RLVR “training” vs “use”

You’re not doing heavy model training. You’re **searching/reranking**:

1. Generate K candidates from the base model.
2. Score each with **verifiable metrics** (diacritics, TAM, ke/ka).
3. Pick best; optionally update a **prompt bandit** (tiny policy).

---

# Input/Output (files + APIs)

## 1) Dataset files (for the gym)

**`gym/datasets/dev.jsonl`**

```json
{"id":"ex1","src":"We already finished the report.","ref":"Ua pau kēlā hōʻike."}
{"id":"ex2","src":"Do not go there.","ref":"Mai hele ʻoe i laila."}
{"id":"ex3","src":"It is not raining.","ref":"ʻAʻole e ua ana."}
```

Fields:

- `src` (required): English source.
- `ref` (optional): a good Hawaiian reference (used only for reporting).

## 2) Language pack (excerpt)

**`lang/haw/haw.yaml`**

```yaml
code: haw
metrics:
  - { name: diacritics, module: metrics.diacritics }
  - { name: tam_particles, module: metrics.tam_particles }
  - { name: articles_ke_ka, module: metrics.articles_ke_ka }
weights: { diacritics: 0.4, tam_particles: 0.4, articles_ke_ka: 0.2 }
resources:
  lex_diacritics: lang/haw/lex_diacritics.txt
  ke_exceptions: lang/haw/ke_exceptions.txt
  tam_regex: lang/haw/regex_tam.json
generator:
  kind: llm
  params: { temperature: 0.9, top_p: 0.95, k_samples: 12 }
```

## 3) Server API (hooked to your PWA)

**Request**

```json
POST /translate
{
  "segments": [{"id":"ex1","src":"We already finished the report."}],
  "src": "en",
  "tgt": "haw",
  "mode": "rlvr"
}
```

**Response**

```json
{
  "results": [
    {
      "id": "ex1",
      "best": { "tgt": "Ua pau ka hōʻike." },
      "candidates": [
        {
          "id": "c0",
          "tgt": "Ua pau ka hoike.",
          "R": 0.63,
          "breakdown": {
            "diacritics": 0.33,
            "tam_particles": 1.0,
            "articles_ke_ka": 0.6
          }
        },
        {
          "id": "c1",
          "tgt": "Ua pau ke hōʻike.",
          "R": 0.88,
          "breakdown": {
            "diacritics": 1.0,
            "tam_particles": 1.0,
            "articles_ke_ka": 0.65
          }
        }
      ],
      "prompt": "…active prompt template…",
      "weights": {
        "diacritics": 0.4,
        "tam_particles": 0.4,
        "articles_ke_ka": 0.2
      }
    }
  ]
}
```

---

# Minimal inputs to the RLVR loop (in memory)

**Inputs**

- `src_text`: English string.
- `k`: number of candidates (e.g., 12).
- `prompt`: current prompt template (bandit-chosen).
- `lang_cfg`: paths + rules + weights (from `haw.yaml`).
- (optional) `ref`: only for reporting BLEU/COMET later.

**Outputs**

- `best_candidate`: the Hawaiian string with the highest **R_total**.
- `candidates[]`: each with `R_total` and metric breakdown.
- `prompt_used`: so you can update the bandit and log.
- `audit`: seeds, model params, metric versions.

---

# Optional extras (if you have time)

- **Synthetic diacritic perturbations:** auto-generate negative samples by stripping ʻokina/kahakō to stress-test `diacritics`.
- **Pivot mode:** EN→pivot→HAW still works; you score on the **final Hawaiian**.
- **QE plug-in:** add a `qe_score` metric (reference-free), weight it lightly (e.g., 0.1).

---

# TL;DR

To run Hawaiian today you need:

- A small **dev.jsonl** with English lines (+ optional refs),
- Three rule resources (**lex_diacritics**, **ke_exceptions**, **tam_regex**),
- A **haw\.yaml** config,
- A base generator (LLM/NMT) to produce **K** candidates,
- The RLVR scorer to output **R_total** + breakdown.

Drop those in, and your gym can train (i.e., prompt-bandit tune) on Hawaiian now and generalize to new languages by swapping the language pack.

great q — here’s how the RLVR “verifiable-output” system gets **consumed** in real life, from product UX to APIs, batch jobs, and SDKs.

# 1) In your Chrome Extension + PWA (from your PRD)

- **Flow:** Paste → Parse → Pick → Practice.
- When user taps **Translate** with target=Hawaiian, the UI calls:

```http
POST /translate
{ "segments":[{"id":"s1","src":"Do not go there."}],
  "src":"en","tgt":"haw","mode":"rlvr" }
```

- **Response** includes `best.tgt`, `candidates[]`, and `reward breakdown` (diacritics/TAM/articles).
- UI shows:

  - “**RLVR ON**” pill (scarce language),
  - 3 **bars** for the metric scores + **total**,
  - **Best translation** pre-filled, one-tap **Add card** → SRS queue.

- Offline PWA still works for review since cards store the **final text** plus the **metric snapshot** for that attempt.

# 2) As a thin SDK for apps/bots

- Provide a tiny client so any service can use it:

```ts
import { rlvrTranslate } from "@rlvr/sdk";

const res = await rlvrTranslate({
  segments: [{ id: "1", src: "We already finished." }],
  src: "en",
  tgt: "haw",
  mode: "rlvr",
});
console.log(res.results[0].best.tgt); // final text
console.log(res.results[0].candidates[0].breakdown); // metrics
```

- Use in: sales enablement tools, messaging copilots, internal knowledge bases, or call-center QA.

# 3) Batch jobs (content mining → cards at scale)

- Nightly job pulls team Google Docs / YouTube captions, hits `/translate?mode=rlvr`, and **auto-generates decks** ranked by `R_total`.
- Output lands in a folder (JSONL) your app reads to pre-seed the **Review Queue** for each SDR.

# 4) CLI / Gym consumption (training & demos)

- For research or demos:

```
python -m rlvr.gym.run --lang haw --dataset gym/datasets/dev.jsonl --k 12
# writes audit/runs/run.jsonl with per-candidate scores
```

- Devs read the artifacts to tune **metric weights**, **prompt variants**, or to add a new **Language Pack**.

# 5) Webhooks & “verify-first” guards

- For production guardrails, enable a **webhook mode**:

  - Incoming text → RLVR verifies with metrics → if `R_total ≥ threshold`, forward; else return **suggested fix** and **which rules failed** (e.g., “missing ʻokina in Hawaiʻi; TAM invalid after ʻAʻole”).

# 6) Analytics & coaching

- Store `reward_breakdown` per card.
- Dashboards show **team progress**: diacritics accuracy ↑, TAM violations ↓.
- Coaches click into the **details** list (which tokens failed) to assign micro-drills.

# 7) Extensibility to other languages

- Swap `lang/<code>.yaml` and metric set.
- Same API contract; front-end keeps rendering bars, just with different labels (e.g., English _a/an_, aux-verb agreement, punctuation).

# 8) Failure & fallback behavior

- If target model can’t produce Hawaiian reliably:

  - Fall back to **pivot** (EN→X→HAW) or **constrained prompt**.
  - RLVR still **scores** the final Hawaiian string; UI still shows bars.

- If metrics can’t evaluate (no articles in the sentence), the metric returns **1.0 (not-applicable)** and the UI shows a **“skipped”** badge.

---

## Minimal consumption contracts (recap)

**Request**

```json
{
  "segments": [{ "id": "s1", "src": "It is not raining." }],
  "src": "en",
  "tgt": "haw",
  "mode": "rlvr"
}
```

**Response**

```json
{
  "results": [
    {
      "id": "s1",
      "best": { "tgt": "ʻAʻole e ua ana." },
      "candidates": [
        {
          "id": "c0",
          "tgt": "Aole e ua ana.",
          "R": 0.67,
          "breakdown": {
            "diacritics": 0.33,
            "tam_particles": 1.0,
            "articles_ke_ka": 1.0
          }
        },
        {
          "id": "c1",
          "tgt": "ʻAʻole e ua ana.",
          "R": 1.0,
          "breakdown": {
            "diacritics": 1.0,
            "tam_particles": 1.0,
            "articles_ke_ka": 1.0
          }
        }
      ],
      "weights": {
        "diacritics": 0.4,
        "tam_particles": 0.4,
        "articles_ke_ka": 0.2
      },
      "prompt": "…active template…"
    }
  ]
}
```

That’s it: the **product** consumes a clean API/SDK; the **team** consumes audit logs and CLI; and **learners** consume translations as flashcards with transparent, verifiable grammar feedback.

awesome — here’s a **clean, code-ready architecture** for a _verifiable-output_ RLVR system you can drop into your “Language Gym” and extend to any language later.

# Overview

Goal: given `src` text → generate **K candidates** → **score** each with **verifiable metrics** (rule/list-based) → **select/rerank/optimize prompts** → return **best candidate + reward breakdown** and **persist** runs so you can show improvements over time.

# High-level components

1. **Language Packs**

   - Per-language config: tokenization, lexicons, regex rules, exception tables, metric set, weights.

2. **Candidate Generator (CG)**

   - Wraps a base translator (LLM or NMT). Produces K diverse candidates per input.

3. **Metric Registry (MR)**

   - Pluggable, pure functions `metric(x) -> [0..1], details`. All **verifiable** (no human labels).

4. **Scorer & Aggregator (SA)**

   - Combines metric scores with weights; returns `R_total` + breakdown.

5. **Prompt/Policy Optimizer (PO)**

   - Simple bandit or prompt search (e.g., OPRO/DSPy/GEPA). Uses `R_total` as the objective.

6. **Gym Runner (GR)**

   - CLI + Python harness: load dataset, run CG→SA→PO loops, compute eval stats, write artifacts.

7. **Audit & Repro Layer (ARL)**

   - Logs inputs, candidates, scores, seeds, model/temperature, metric versions.

8. **Service API (SAI)**

   - Minimal REST to plug into your Chrome Ext/PWA: `/translate?mode=rlvr` etc.

# Data contracts (typed JSON)

```ts
// core
type Segment = { id: string; src: string; meta?: any };

type Candidate = {
  id: string;
  text: string;
  prompt_id: string;
  seed: number;
  meta?: any;
};

type MetricScore = {
  name: string;
  score: number; // 0..1
  details?: any; // e.g., which tokens failed
  version: string;
};

type RewardBreakdown = {
  total: number;
  components: MetricScore[];
  weights: Record<string, number>; // e.g., {dia:0.4,tam:0.4,art:0.2}
};

type RLVRResult = {
  best: Candidate;
  candidates: Array<Candidate & { reward: RewardBreakdown }>;
  prompt: string; // chosen/optimized prompt
  language: string; // e.g., "haw"
  meta?: any; // runtime info, elapsed ms, model
};
```

# Directory layout

```
rlvr/
  lang/
    haw/
      haw.yaml                # weights, tokenizer, metric list
      lex_diacritics.txt      # words requiring ʻokina/kahakō
      ke_exceptions.txt       # article exceptions
      regex_tam.json          # TAM patterns
    en/  ...                  # future languages
  metrics/
    __init__.py
    diacritics.py
    tam_particles.py
    articles_ke_ka.py
    morphology_plural.py
    word_coverage.py
    // english_a_an.py, aux_verb_agreement.py  (future)
  generator/
    base.py                   # interface
    llm_openai.py             # or any provider
    nllb.py                   # if using MT checkpoints
  optimizer/
    bandit.py                 # epsilon-greedy over prompts
    opro.py                   # optional: prompt search
    dspy_mipro.py            # optional: if you have DSPy
  gym/
    run.py                    # CLI entrypoint
    datasets/
      dev.jsonl               # {src, ref?} small set
      demo.jsonl
  server/
    api.py                    # FastAPI/Flask
  ui_bridge/
    contracts.py              # shared schema with your PWA
  audit/
    logger.py
    runs/                     # .jsonl artifacts per run
  utils/
    tokenize.py
    normalize.py
    scoring.py
  pyproject.toml
  README.md
```

# Language Pack (example `lang/haw/haw.yaml`)

```yaml
code: haw
tokenizer: "basic" # or custom rules
metrics:
  - name: diacritics
    module: metrics.diacritics
  - name: tam_particles
    module: metrics.tam_particles
  - name: articles_ke_ka
    module: metrics.articles_ke_ka
weights:
  diacritics: 0.4
  tam_particles: 0.4
  articles_ke_ka: 0.2
resources:
  lex_diacritics: lang/haw/lex_diacritics.txt
  ke_exceptions: lang/haw/ke_exceptions.txt
  tam_regex: lang/haw/regex_tam.json
generator:
  kind: "llm"
  params:
    temperature: 0.9
    top_p: 0.95
    k_samples: 12
    prompt_template: |
      Translate to Hawaiian with correct diacritics, valid TAM after ʻAʻole,
      and correct ke/ka articles. Input: "{src}"
```

# Metric interface (plug-in)

```python
# metrics/__init__.py
from typing import Dict, Any

class Metric:
    name: str
    version: str
    def __init__(self, lang_cfg: Dict[str, Any]): ...
    def score(self, text: str, src: str | None = None) -> Dict[str, Any]:
        """
        returns: {"name":..., "version":..., "score": float, "details": {...}}
        """
```

## Minimal metric implementations

**1) Diacritics**

```python
# metrics/diacritics.py
from . import Metric

class Diacritics(Metric):
    name, version = "diacritics", "1.0"
    def __init__(self, lang_cfg):
        with open(lang_cfg["resources"]["lex_diacritics"]) as f:
            self.forms = set(w.strip() for w in f if w.strip())
    def score(self, text, src=None):
        toks = text.split()
        needed = [w for w in toks if w.lower().strip(",.!?;:") in self.forms]
        correct = sum(1 for w in needed if w in self.forms)  # assumes forms include diacritics exactly
        return {"name": self.name, "version": self.version,
                "score": (correct/len(needed)) if needed else 1.0,
                "details": {"checked": len(needed), "correct": correct}}
```

**2) TAM particles (regex FSM)**

```python
# metrics/tam_particles.py
import re, json
from . import Metric

class TAMParticles(Metric):
    name, version = "tam_particles", "1.0"
    def __init__(self, lang_cfg):
        with open(lang_cfg["resources"]["tam_regex"]) as f:
            self.rgx = json.load(f)
        # e.g., self.rgx = {"neg": {"marker": "ʻAʻole", "valid": ["\\bi\\s+VERB", "\\be\\s+\\w+\\s+nei"]},
        #                   "aff": {"valid": ["\\bua\\s+VERB", "\\bke\\s+\\w+\\s+nei", "\\be\\s+\\w+\\s+ana"]}}
    def score(self, text, src=None):
        neg = re.search(self.rgx["neg"]["marker"], text, flags=re.I)
        verb_stub = r"[A-Za-zʻ’\-āēīōū]+"  # naive
        valid_patterns = self.rgx["neg"]["valid"] if neg else self.rgx["aff"]["valid"]
        valids = sum(bool(re.search(p.replace("VERB", verb_stub), text)) for p in valid_patterns)
        invalid_combo = int(bool(re.search(r"\bʻAʻole\s+ua\b", text)))  # example hard rule
        score = min(1.0, max(0.0, (1 if valids>0 else 0) - 0.3*invalid_combo))
        return {"name": self.name, "version": self.version, "score": score,
                "details": {"neg": bool(neg), "matched": valids, "invalid_combo": bool(invalid_combo)}}
```

**3) Article ke/ka**

```python
# metrics/articles_ke_ka.py
from . import Metric

class ArticlesKeKa(Metric):
    name, version = "articles_ke_ka", "1.0"
    def __init__(self, lang_cfg):
        with open(lang_cfg["resources"]["ke_exceptions"]) as f:
            self.exceptions = set(w.strip().lower() for w in f if w.strip())
    def score(self, text, src=None):
        toks = text.split()
        pairs, correct = 0, 0
        for i,t in enumerate(toks[:-1]):
            if t.lower() in ("ke","ka"):
                nextw = toks[i+1].lower().strip(",.!?;:")
                pairs += 1
                starts = nextw[:1]
                want_ke = (nextw in self.exceptions) or (starts in ("k","e","a","o"))
                if (want_ke and t.lower()=="ke") or ((not want_ke) and t.lower()=="ka"):
                    correct += 1
        return {"name": self.name, "version": self.version,
                "score": (correct/pairs) if pairs else 1.0,
                "details": {"checked": pairs, "correct": correct}}
```

# Scoring & aggregation

```python
# utils/scoring.py
def aggregate(component_scores, weights):
    total = 0.0
    for ms in component_scores:
        w = weights.get(ms["name"], 0.0)
        total += w * ms["score"]
    return total
```

# Candidate generation & reranking

```python
# generator/base.py
from typing import List
class CandidateGenerator:
    def generate(self, src:str, k:int, prompt:str, **kw) -> List[str]:
        raise NotImplementedError

# optimizer/bandit.py
import random
class EpsGreedyPromptBandit:
    def __init__(self, prompts:list[str], eps=0.2):
        self.prompts = prompts; self.value = {p:0 for p in prompts}; self.count={p:0 for p in prompts}; self.eps=eps
    def pick(self):
        return random.choice(self.prompts) if random.random()<self.eps else max(self.prompts, key=lambda p:self.value[p])
    def update(self, prompt:str, reward:float):
        self.count[prompt]+=1
        n = self.count[prompt]; v = self.value[prompt]
        self.value[prompt] = v + (reward - v)/n
```

# Gym runner (CLI)

```python
# gym/run.py
import json, argparse, importlib
from pathlib import Path
from utils.scoring import aggregate

def load_metric(mdef, lang_cfg):
    mod = importlib.import_module(mdef["module"])
    cls = [getattr(mod, n) for n in dir(mod) if hasattr(getattr(mod,n), "__bases__") and mdef["name"] in n.lower()][0]
    return cls(lang_cfg)

def score_text(text, metrics, weights, src=None):
    comps = [m.score(text, src) for m in metrics]
    return aggregate(comps, weights), comps

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="haw")
    ap.add_argument("--dataset", default="gym/datasets/dev.jsonl")
    ap.add_argument("--k", type=int, default=12)
    args = ap.parse_args()

    # load lang cfg
    import yaml; lang_cfg = yaml.safe_load(open(f"lang/{args.lang}/{args.lang}.yaml"))
    metrics = [load_metric(m, lang_cfg) for m in lang_cfg["metrics"]]
    weights = lang_cfg["weights"]

    # simple bandit over prompts
    prompts = [lang_cfg["generator"]["params"]["prompt_template"],  # base
               lang_cfg["generator"]["params"]["prompt_template"] + "\nStrictly follow KEAO and TAM rules."]  # variant

    from optimizer.bandit import EpsGreedyPromptBandit
    bandit = EpsGreedyPromptBandit(prompts, eps=0.25)

    from generator.llm_openai import LLMCandGen  # or your provider
    gen = LLMCandGen(model="...", temp=0.9, top_p=0.95)

    runs = []
    for line in open(args.dataset):
        ex = json.loads(line)
        prompt = bandit.pick()
        cands = [gen.translate(ex["src"], prompt=prompt) for _ in range(args.k)]
        scored = []
        for i,txt in enumerate(cands):
            R, comps = score_text(txt, metrics, weights, src=ex["src"])
            scored.append({"id": f"c{i}", "text": txt, "R": R, "breakdown": comps})
        best = max(scored, key=lambda c: c["R"])
        bandit.update(prompt, best["R"])
        runs.append({"src": ex["src"], "best": best, "prompt": prompt, "all": scored})

    outp = Path("audit/runs/run.jsonl"); outp.parent.mkdir(parents=True, exist_ok=True)
    with open(outp, "w") as f:
        for r in runs: f.write(json.dumps(r, ensure_ascii=False)+"\n")
    print("wrote", str(outp))

if __name__ == "__main__":
    main()
```

# Minimal API for your PWA/Extension

```python
# server/api.py (FastAPI-style)
from fastapi import FastAPI
from pydantic import BaseModel
from gym.run import score_text  # reuse
# ... load lang cfg, metrics, weights, generator, bandit (singleton)

class TranslateReq(BaseModel):
  segments: list[dict]  # [{id,src}]
  src: str; tgt: str; mode: str = "standard"

app = FastAPI()

@app.post("/translate")
def translate(req: TranslateReq):
    results = []
    for seg in req.segments:
        prompt = bandit.pick() if req.mode=="rlvr" else base_prompt
        cands = gen.generate(seg["src"], k=lang_cfg["generator"]["params"]["k_samples"], prompt=prompt)
        scored = []
        for i,txt in enumerate(cands):
            R, comps = score_text(txt, METRICS, WEIGHTS, src=seg["src"])
            scored.append({"id": f"c{i}", "tgt": txt,
                           "R": R,
                           "breakdown": {m['name']: m['score'] for m in comps}})
        best = max(scored, key=lambda c: c["R"])
        results.append({"id": seg["id"], "best": {"tgt": best["tgt"]},
                        "candidates": scored, "prompt": prompt})
    return {"results": results}
```

# Evaluation & reporting (verifiable outputs)

- **Per-metric histograms**: see where learners/models fail (e.g., TAM violations).
- **Before/After RLVR**: average `R_total` improvement on a held-out set.
- **Failure lists**: surface specific tokens missing diacritics; article misuses.

# Extensibility checklist (new language)

1. Create `lang/<code>/<code>.yaml`.
2. Provide minimal lexicons/rules for 2–3 high-leverage metrics.
3. Register metrics in `metrics/`.
4. Reuse generator; tune prompt templates.
5. Add 20–50 dev sentences to `gym/datasets/`.
6. Run:

   ```
   python -m gym.run --lang haw --dataset gym/datasets/dev.jsonl --k 12
   uvicorn server.api:app --reload
   ```

7. Front-end: call `/translate?mode=rlvr` and render the **reward breakdown bars**.

# What you’ll demo

- Paste an English line → **baseline** translation vs **RLVR-optimized**.
- UI shows bars for **Diacritics / TAM / Article** and a **total score**.
- Click “Optimize” to run the bandit/prompt search; watch the score tick up.
- Show `audit/runs/run.jsonl` proving repeatability (seed, prompt, scores).

If you want, I can also generate the starter repo skeleton exactly in this shape so your team can start filling in the metric files and the prompt templates immediately.
