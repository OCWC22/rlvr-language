# 🌺 RLVR Framework Demo

A React TypeScript demo application showcasing the RLVR (Reinforcement Learning with Verifiable Rewards) framework for AI translation with linguistic intelligence.

## Features

- **🎯 Real-time Translation**: English ↔ Hawaiian translation with multiple AI candidates
- **📊 Quality Metrics**: Visual breakdown of translation quality with rule-based scoring
- **🏆 Best Candidate Selection**: Automatically ranks translations by verifiable metrics
- **🎨 Modern UI**: Dark theme with glassmorphic design following RLVR style guide
- **🎭 Demo Mode**: Mock data for presentations when API isn't available
- **⚡ Smooth Animations**: Framer Motion animations for enhanced UX

## What RLVR Demonstrates

### Applied AI Innovation

- **Multiple Candidate Generation**: Shows 4-5 translation options from AI models
- **Verifiable Quality Scoring**: Rule-based metrics vs. black-box scores
- **Linguistic Intelligence**: Enforces Hawaiian language rules (diacritics, TAM particles, articles)
- **Real-time Learning**: Bandit algorithm optimization

### Hawaiian Language Metrics

- **Diacritics**: Proper ʻokina and kahakō usage
- **TAM Particles**: Tense-aspect-mood validation (especially ʻAʻole patterns)
- **Articles**: Ke/ka usage following KEAO rule
- **Cultural Preservation**: Maintains linguistic accuracy for indigenous language

## Quick Start

### Option 1: Demo Mode (No Backend Required)

```bash
npm install
npm start
```

1. Open http://localhost:3000
2. Check "Demo Mode" checkbox
3. Try example sentences or enter your own text
4. Watch the translation candidates compete with scoring breakdown

### Option 2: Full RLVR Backend

```bash
# Terminal 1: Start RLVR API server
cd ../rlvr
./run.sh server

# Terminal 2: Start React demo
npm install
npm start
```

## Demo Flow for Hackathon

### Opening Hook (30 seconds)

1. Start with demo mode enabled
2. Show traditional translation vs RLVR side-by-side
3. Input: "Do not go there"
4. Point out missing diacritics in candidate #2

### Core Demo (2 minutes)

1. Show multiple candidates competing
2. Explain quality breakdown:
   - **100% Diacritics**: ʻoe correctly uses ʻokina
   - **100% TAM Particles**: Proper negation with "Mai"
   - **100% Articles**: No articles needed, KEAO compliance
3. Try language swap (Hawaiian → English)
4. Show different metrics for English (spelling, grammar, punctuation)

### Technical Deep-dive (1 minute)

1. Mention verifiable vs. black-box scoring
2. Show prompt displayed in demo mode
3. Explain modular architecture: "Works for any language with rules"

## Project Structure

```
src/
├── App.tsx          # Main demo component
├── App.css          # RLVR style guide implementation
└── index.tsx        # React entry point
```

## Key Technologies

- **React 18** + **TypeScript** - Component framework
- **Framer Motion** - Smooth animations
- **Axios** - API communication
- **CSS Variables** - RLVR design system

## API Integration

The demo connects to the RLVR backend API:

```typescript
POST http://localhost:8000/translate
{
  "segments": [{"id": "1", "src": "Do not go there."}],
  "src": "en",
  "tgt": "haw",
  "mode": "rlvr"
}
```

Response includes candidates with quality breakdowns:

```typescript
{
  "results": [{
    "best": {"tgt": "Mai hele ʻoe i laila."},
    "candidates": [
      {
        "tgt": "Mai hele ʻoe i laila.",
        "R": 0.94,
        "breakdown": {
          "diacritics": 1.0,
          "tam_particles": 1.0,
          "articles_ke_ka": 1.0
        }
      }
    ]
  }]
}
```

## Hackathon Appeal

**Applied AI Angle:**

- "We're not just using AI, we're **teaching it linguistics**"
- Verifiable quality metrics for cultural preservation
- Real-time reinforcement learning with rule-based rewards

**Social Impact:**

- Indigenous language preservation through technology
- Educational tool for Hawaiian language learners
- Explainable AI maintaining cultural context

## Development

```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
```

Built with ❤️ for Hawaiian language preservation and AI innovation.
