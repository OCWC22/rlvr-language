# RLVR Language Gym - Chrome Extension

A Chrome extension for language learning through YouTube transcripts with spaced repetition.

## Quick Setup (MVP)

### 1. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this folder (`rlvr-language`)

### 2. Configure RLVR Backend Connection
1. Open the extension popup by clicking the RLVR icon
2. Click "Connect to RLVR Backen


3. Update the backend URL in `src/popup/popup.js` line 11:
   ```javascript
   let rlvrBackendUrl = 'YOUR_ACTUAL_BACKEND_URL';
   ```

### 3. Usage
1. Go to any YouTube video
2. Copy the URL and paste it in the extension popup
3. Click "Extract Transcript"
4. Click "+ Add Card" on any transcript segment
5. Cards are saved to your RLVR backend or locally

## Features
- ✅ YouTube transcript extraction (mock data for MVP)
- ✅ Flashcard creation
- ✅ RLVR backend integration
- ✅ Local storage fallback
- ✅ YouTube page integration
- 🚧 Real transcript API (needs implementation)
- 🚧 Spaced repetition system
- 🚧 PWA functionality

## RLVR Backend Integration
The extension expects these endpoints:
- `GET /api/health` - Health check
- `POST /api/cards` - Create flashcard
- `GET /api/cards` - Get user's cards

## Development
```bash
npm run build  # Copy files to dist/
npm run dev    # Build and show instructions
```

## Files
- `manifest.json` - Chrome extension configuration
- `src/popup/` - Extension popup interface
- `src/background/` - Service worker
- `src/content/` - YouTube content script integration
- `main.js` - Original React prototype

## Next Steps
1. Integrate with real YouTube Transcript API
2. Add Gemini 2.5 Flash for missing transcripts  
3. Implement proper spaced repetition algorithm
4. Add PWA functionality
5. Polish UI/UX