# RLVR YouTube Transcript Backend

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend/
   pip install -r requirements.txt
   ```

2. **Start server:**
   ```bash
   python app.py
   ```

3. **Server runs on:** `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Extract Transcript
```
POST /api/transcript
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

### Get Transcript by ID
```
GET /api/transcript/VIDEO_ID
```

## Response Format
```json
{
  "success": true,
  "segments": [
    {
      "id": 1,
      "t": "00:01",
      "src": "Welcome to this video",
      "target": "",
      "startTime": 1.0,
      "duration": 2.5
    }
  ],
  "video_id": "VIDEO_ID",
  "language": "English",
  "is_generated": false,
  "message": "Extracted 25 segments"
}
```

## Features

- ✅ Real YouTube transcript extraction
- ✅ Manual captions preferred over auto-generated
- ✅ Multiple language support
- ✅ CORS enabled for Chrome extensions
- ✅ Proper error handling
- ✅ Formatted time stamps