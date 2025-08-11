"""
FastAPI server for RLVR translation service.
Provides REST endpoints for Chrome extension and PWA integration.
"""

from rlvr.optimizer.bandit import EpsilonGreedyBandit
from rlvr.gym.run import load_metric, score_text, load_generator
from rlvr.generator.bidirectional import BiDirectionalGenerator
from rlvr.generator.showcase import ShowcaseGenerator
import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yaml

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class Segment(BaseModel):
    id: str
    src: str
    meta: Optional[Dict[str, Any]] = None


class TranslateRequest(BaseModel):
    segments: List[Segment]
    src: str = "en"
    tgt: str = "haw"
    mode: str = "standard"  # "standard", "rlvr", or "showcase"


class CandidateResponse(BaseModel):
    id: str
    tgt: str
    R: float
    breakdown: Dict[str, float]


class TranslationResult(BaseModel):
    id: str
    best: Dict[str, str]  # {"tgt": "translation"}
    candidates: List[CandidateResponse]
    prompt: str
    weights: Dict[str, float]
    process_log: Optional[Dict[str, Any]] = None  # Added for showcase mode


class TranslateResponse(BaseModel):
    results: List[TranslationResult]


class ShowcaseSentence(BaseModel):
    hawaiian: str
    english: str
    primary_metrics: List[str]
    description: str


class ShowcaseListResponse(BaseModel):
    sentences: List[ShowcaseSentence]


# Global state (initialized on startup)
LANG_CONFIGS = {}
METRICS = {}
GENERATORS = {}
BANDITS = {}
BIDIRECTIONAL_GENERATOR = None  # Will be initialized on startup
SHOWCASE_GENERATOR = None  # Will be initialized on startup


app = FastAPI(
    title="RLVR Translation API",
    description="Reinforcement Learning with Verifiable Rewards for language translation",
    version="0.1.0"
)

# Configure CORS for browser extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def initialize_language(lang_code: str):
    """Initialize language resources if not already loaded."""
    if lang_code in LANG_CONFIGS:
        return

    # Load language config
    config_path = Path(f"lang/{lang_code}/{lang_code}.yaml")
    if not config_path.exists():
        raise ValueError(f"Language pack not found for {lang_code}")

    with open(config_path, 'r', encoding='utf-8') as f:
        lang_cfg = yaml.safe_load(f)

    LANG_CONFIGS[lang_code] = lang_cfg

    # Load metrics
    metrics = []
    for metric_def in lang_cfg["metrics"]:
        metric = load_metric(metric_def, lang_cfg)
        metrics.append(metric)

    METRICS[lang_code] = metrics

    # Load generator
    GENERATORS[lang_code] = load_generator(lang_cfg)

    # Initialize bandit
    base_prompt = lang_cfg["generator"]["params"]["prompt_template"]
    prompt_variants = [
        base_prompt,
        base_prompt + "\nBe very careful with diacritics, TAM particles, and articles.",
        base_prompt + "\nStrictly follow Hawaiian grammar rules, especially for negation.",
    ]

    BANDITS[lang_code] = EpsilonGreedyBandit(prompt_variants, epsilon=0.2)

    logger.info(f"Initialized language: {lang_code}")


@app.on_event("startup")
async def startup_event():
    """Initialize default languages on startup."""
    global BIDIRECTIONAL_GENERATOR, SHOWCASE_GENERATOR

    try:
        # Initialize Hawaiian language pack
        initialize_language("haw")

        # Initialize English language pack
        initialize_language("en")

        # Create bidirectional generator
        haw_config = LANG_CONFIGS["haw"]
        en_config = LANG_CONFIGS["en"]

        # Create bidirectional generator with both configs
        BIDIRECTIONAL_GENERATOR = BiDirectionalGenerator(haw_config)
        # Set the Hawaiian->English prompt from English config
        if "generator" in en_config and "params" in en_config["generator"]:
            haw_to_en_prompt = en_config["generator"]["params"].get(
                "prompt_template", "")
            BIDIRECTIONAL_GENERATOR.set_prompt_for_direction(
                "haw_to_en", haw_to_en_prompt)

        # Create showcase generator
        SHOWCASE_GENERATOR = ShowcaseGenerator(haw_config)

        logger.info(
            "RLVR API server started successfully with bidirectional and showcase support")
    except Exception as e:
        logger.error(f"Failed to initialize language packs: {e}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "RLVR Translation API",
        "languages": list(LANG_CONFIGS.keys()),
        "modes": ["standard", "rlvr", "showcase"]
    }


@app.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """
    Main translation endpoint.

    Supports three modes:
    - standard: Single translation using base prompt
    - rlvr: Multiple candidates with scoring and reranking  
    - showcase: Hardcoded demo sentences with detailed process logs

    Supports bidirectional translation:
    - en -> haw (English to Hawaiian)
    - haw -> en (Hawaiian to English)
    """
    try:
        # Initialize languages if needed
        if request.src not in LANG_CONFIGS:
            initialize_language(request.src)
        if request.tgt not in LANG_CONFIGS:
            initialize_language(request.tgt)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Determine translation direction
    direction = f"{request.src}_to_{request.tgt}"

    # Get target language config and metrics (for scoring output)
    lang_cfg = LANG_CONFIGS[request.tgt]
    metrics = METRICS[request.tgt]
    weights = lang_cfg["weights"]

    # Choose generator based on mode
    if request.mode == "showcase":
        generator = SHOWCASE_GENERATOR
    elif BIDIRECTIONAL_GENERATOR and direction in ["en_to_haw", "haw_to_en"]:
        generator = BIDIRECTIONAL_GENERATOR
    else:
        generator = GENERATORS[request.tgt]

    # Get appropriate bandit for the target language
    bandit = BANDITS[request.tgt]

    results = []

    for segment in request.segments:
        process_log = None

        if request.mode == "showcase":
            # Get detailed process log for showcase mode
            process_log = SHOWCASE_GENERATOR.get_process_log(segment.src)

            # Generate showcase candidates
            prompt = "Showcase mode - curated demonstration"
            k = lang_cfg["generator"]["params"]["k_samples"]
            candidates = generator.generate(segment.src, k=k)

        elif request.mode == "rlvr":
            # RLVR mode: generate multiple candidates and score
            prompt = bandit.pick()
            k = lang_cfg["generator"]["params"]["k_samples"]

            # Generate candidates
            if isinstance(generator, BiDirectionalGenerator):
                candidates = generator.generate(
                    segment.src,
                    k=k,
                    direction=direction,
                    prompt=prompt,
                    temperature=lang_cfg["generator"]["params"]["temperature"]
                )
            else:
                candidates = generator.generate(
                    segment.src,
                    k=k,
                    prompt=prompt,
                    temperature=lang_cfg["generator"]["params"]["temperature"]
                )
        else:
            # Standard mode: single translation
            prompt = lang_cfg["generator"]["params"]["prompt_template"]
            if isinstance(generator, BiDirectionalGenerator):
                translation = generator.translate(
                    segment.src, direction=direction, prompt=prompt)
                candidates = [translation]
            else:
                translation = generator.translate(segment.src, prompt=prompt)
                candidates = [translation]

        # Score each candidate
        scored_candidates = []
        for i, candidate_text in enumerate(candidates):
            total_score, component_scores = score_text(
                candidate_text,
                metrics,
                weights,
                src=segment.src
            )

            scored_candidates.append({
                "id": f"c{i}",
                "tgt": candidate_text,
                "R": total_score,
                "breakdown": {ms["name"]: ms["score"] for ms in component_scores}
            })

        # Sort by score
        scored_candidates.sort(key=lambda x: x["R"], reverse=True)
        best = scored_candidates[0]

        # Update bandit (except in showcase mode)
        if request.mode != "showcase":
            bandit.update(prompt, best["R"])

        result = TranslationResult(
            id=segment.id,
            best={"tgt": best["tgt"]},
            candidates=[CandidateResponse(**c) for c in scored_candidates],
            prompt=prompt,
            weights=weights,
            process_log=process_log
        )

        results.append(result)

    return TranslateResponse(results=results)


@app.get("/showcase/sentences", response_model=ShowcaseListResponse)
async def list_showcase_sentences():
    """Get list of available showcase sentences."""
    if not SHOWCASE_GENERATOR:
        raise HTTPException(
            status_code=503, detail="Showcase generator not initialized")

    sentences = SHOWCASE_GENERATOR.get_showcase_sentences()
    return ShowcaseListResponse(
        sentences=[ShowcaseSentence(**s) for s in sentences]
    )


@app.get("/showcase/log/{sentence}")
async def get_showcase_log(sentence: str):
    """Get detailed process log for a showcase sentence."""
    if not SHOWCASE_GENERATOR:
        raise HTTPException(
            status_code=503, detail="Showcase generator not initialized")

    # URL decode the sentence
    import urllib.parse
    decoded_sentence = urllib.parse.unquote(sentence)

    log = SHOWCASE_GENERATOR.get_process_log(decoded_sentence)
    return log


@app.get("/languages")
async def list_languages():
    """List available language packs."""
    lang_dir = Path("lang")
    languages = []

    for lang_path in lang_dir.iterdir():
        if lang_path.is_dir():
            config_file = lang_path / f"{lang_path.name}.yaml"
            if config_file.exists():
                with open(config_file, 'r') as f:
                    cfg = yaml.safe_load(f)
                    languages.append({
                        "code": cfg["code"],
                        "name": cfg.get("name", cfg["code"]),
                        "metrics": [m["name"] for m in cfg["metrics"]]
                    })

    return {"languages": languages}


@app.get("/stats/{lang_code}")
async def get_language_stats(lang_code: str):
    """Get statistics for a language's bandit/prompts."""
    if lang_code not in BANDITS:
        raise HTTPException(
            status_code=404, detail=f"Language {lang_code} not initialized")

    bandit = BANDITS[lang_code]
    return bandit.get_stats()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
