#!/bin/bash

echo "🎯 Starting RLVR YouTube Transcript Backend"
echo "📍 Installing dependencies..."

cd backend/

# Check if pip is available
if ! command -v pip &> /dev/null; then
    echo "❌ pip not found. Please install Python and pip first."
    exit 1
fi

# Install dependencies
pip install -r requirements.txt

echo ""
echo "🚀 Starting Flask server..."
echo "📡 Server will run on http://localhost:8000"
echo "✅ CORS enabled for Chrome extensions"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Flask server
python app.py