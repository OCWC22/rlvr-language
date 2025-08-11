#!/bin/bash
# RLVR Framework Runner Script with Conda Support

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if conda environment is active
CONDA_ENV="rlvr-gpt5"

function check_conda_env() {
    if [[ "$CONDA_DEFAULT_ENV" != "$CONDA_ENV" ]]; then
        echo -e "${RED}Error: Please activate the conda environment first${NC}"
        echo -e "Run: ${GREEN}conda activate $CONDA_ENV${NC}"
        echo ""
        echo "Or use the wrapper script:"
        echo -e "${GREEN}conda run -n $CONDA_ENV ./run_conda.sh $1${NC}"
        exit 1
    fi
}

function print_usage() {
    echo "RLVR Framework Runner (Conda Version)"
    echo "====================================="
    echo ""
    echo "Usage: ./run_conda.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install     - Install Python dependencies"
    echo "  test        - Run test suite"
    echo "  gym         - Run the gym with mock generator"
    echo "  gym-llm     - Run the gym with LLM generator (requires OPENAI_API_KEY)"
    echo "  server      - Start the API server"
    echo "  demo        - Run a quick demo"
    echo ""
    echo "Note: Make sure you have activated the conda environment:"
    echo "  conda activate $CONDA_ENV"
    echo ""
}

function install_deps() {
    check_conda_env
    echo -e "${BLUE}Installing dependencies...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

function run_tests() {
    check_conda_env
    echo -e "${BLUE}Running tests...${NC}"
    PYTHONPATH=. python test_rlvr.py
}

function run_gym() {
    check_conda_env
    echo -e "${BLUE}Running gym with mock generator...${NC}"
    PYTHONPATH=. python -m rlvr.gym.run --lang haw --generator mock --k 8
}

function run_gym_llm() {
    check_conda_env
    echo -e "${BLUE}Running gym with LLM generator...${NC}"
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "Error: OPENAI_API_KEY environment variable not set"
        echo "Please set it with: export OPENAI_API_KEY='your-key-here'"
        exit 1
    fi
    PYTHONPATH=. python -m rlvr.gym.run --lang haw --generator llm --k 12
}

function run_server() {
    check_conda_env
    echo -e "${BLUE}Starting API server...${NC}"
    echo "Server will be available at http://localhost:8000"
    echo "API docs at http://localhost:8000/docs"
    echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
    PYTHONPATH=. uvicorn rlvr.server.api:app --reload
}

function run_demo() {
    check_conda_env
    echo -e "${BLUE}Running quick demo...${NC}"
    PYTHONPATH=. python -c "
from rlvr.metrics import Diacritics, TAMParticles, ArticlesKeKa
from rlvr.generator import MockGenerator
from rlvr.utils.scoring import aggregate_scores

# Setup
lang_cfg = {
    'resources': {
        'lex_diacritics': 'lang/haw/lex_diacritics.txt',
        'ke_exceptions': 'lang/haw/ke_exceptions.txt',
        'tam_regex': 'lang/haw/regex_tam.json'
    }
}

# Initialize
metrics = [Diacritics(lang_cfg), TAMParticles(lang_cfg), ArticlesKeKa(lang_cfg)]
weights = {'diacritics': 0.4, 'tam_particles': 0.4, 'articles_ke_ka': 0.2}
gen = MockGenerator({})

# Test
src = 'Do not go there.'
print(f'\\nTranslating: \"{src}\"')
candidates = gen.generate(src, k=4)

for i, cand in enumerate(candidates):
    scores = [m.score(cand) for m in metrics]
    total = aggregate_scores(scores, weights)
    print(f'  [{i}] {cand} -> R={total:.3f}')
    
print('\\n✓ Demo complete!')
"
}

# Main script logic
if [ $# -eq 0 ]; then
    print_usage
    exit 0
fi

case "$1" in
    install)
        install_deps
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
        run_server
        ;;
    demo)
        run_demo
        ;;
    *)
        echo "Unknown command: $1"
        print_usage
        exit 1
        ;;
esac 