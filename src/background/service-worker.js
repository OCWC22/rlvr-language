// RLVR Language Gym - Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('RLVR Language Gym installed');
  
  // Initialize storage
  chrome.storage.local.set({
    'cards': [],
    'settings': {
      'sourceLang': 'en',
      'targetLang': 'haw'
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    handleTranscriptExtraction(request.url, sendResponse);
    return true; // Keep message channel open
  }
  
  if (request.action === 'saveCard') {
    saveFlashcard(request.card, sendResponse);
    return true;
  }
  
  if (request.action === 'fetchParadeSubtitles') {
    fetchParadeSubtitles(request.url, sendResponse);
    return true;
  }
  
  if (request.action === 'processSubtitle') {
    processLiveSubtitle(request, sendResponse);
    return true;
  }
  
  if (request.action === 'createContextCard') {
    createContextCard(request.card, sendResponse);
    return true;
  }
});

async function handleTranscriptExtraction(url, sendResponse) {
  try {
    // Extract video ID from YouTube URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      sendResponse({ success: false, error: 'Invalid YouTube URL' });
      return;
    }
    
    console.log('Extracting transcript for video ID:', videoId);
    
    // Try to get real transcript from YouTube
    try {
      const transcript = await fetchYouTubeTranscript(videoId);
      if (transcript && transcript.length > 0) {
        sendResponse({ 
          success: true, 
          segments: transcript,
          message: `Extracted ${transcript.length} transcript segments`
        });
        return;
      }
    } catch (transcriptError) {
      console.log('Real transcript not available, using mock:', transcriptError.message);
    }
    
    // Fallback to mock transcript
    sendResponse({ 
      success: true, 
      segments: generateMockTranscript(videoId),
      message: 'Using mock transcript (real transcript not available)'
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function saveFlashcard(card, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['cards']);
    const cards = result.cards || [];
    
    const newCard = {
      id: Date.now().toString(),
      ...card,
      created: new Date().toISOString(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
      interval: 1,
      ease: 2.5,
      reviews: 0
    };
    
    cards.push(newCard);
    await chrome.storage.local.set({ cards });
    
    sendResponse({ success: true, card: newCard });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function createContextCard(card, sendResponse) {
  try {
    console.log('Creating context card:', card);
    
    // Check if connected to RLVR backend
    const storage = await chrome.storage.local.get(['rlvr_connected', 'cards']);
    const cards = storage.cards || [];
    
    const contextCard = {
      id: Date.now().toString(),
      ...card,
      created: new Date().toISOString(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      interval: 1,
      ease: 2.5,
      reviews: 0,
      type: 'context'
    };
    
    if (storage.rlvr_connected) {
      // Send to RLVR backend for enhanced processing
      try {
        const response = await fetch('http://localhost:8000/api/context-cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contextCard)
        });
        
        if (response.ok) {
          const processedCard = await response.json();
          contextCard.back = processedCard.translation || '';
          contextCard.contextAnalysis = processedCard.analysis || {};
        }
      } catch (error) {
        console.log('RLVR backend not available, saving locally');
      }
    }
    
    // Save locally
    cards.push(contextCard);
    await chrome.storage.local.set({ cards });
    
    console.log('Context card created successfully');
    if (sendResponse) sendResponse({ success: true, card: contextCard });
    
  } catch (error) {
    console.error('Context card creation error:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
}

function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function fetchParadeSubtitles(url, sendResponse) {
  try {
    console.log('Fetching subtitles from Parade website:', url);
    
    // Fetch subtitles from Parade website
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.text();
      
      // Parse subtitle data (assuming SRT or similar format)
      const subtitles = parseSubtitleData(data);
      
      sendResponse({ 
        success: true, 
        subtitles: subtitles,
        message: `Loaded ${subtitles.length} subtitles from Parade`
      });
    } else {
      sendResponse({ success: false, error: 'Failed to fetch from Parade website' });
    }
  } catch (error) {
    console.error('Parade subtitle fetch error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function processLiveSubtitle(request, sendResponse) {
  try {
    const { text, timestamp, source, url } = request;
    
    // Create flashcard from live subtitle
    const card = {
      front: text,
      back: '', // Will be filled by RLVR backend translation
      source: source,
      timestamp: timestamp,
      videoUrl: url,
      isLive: true
    };
    
    // Send to RLVR backend for translation if available
    const storage = await chrome.storage.local.get(['rlvr_connected']);
    if (storage.rlvr_connected) {
      // Send to RLVR backend for processing
      console.log('Sending live subtitle to RLVR backend:', text);
    }
    
    // Save locally
    await saveFlashcard(card, () => {});
    
    sendResponse({ success: true, processed: true });
  } catch (error) {
    console.error('Live subtitle processing error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function parseSubtitleData(data) {
  // Simple SRT parser for Parade subtitles
  const subtitles = [];
  const lines = data.split('\n');
  let currentSubtitle = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^\d+$/)) {
      // Subtitle number
      currentSubtitle.id = parseInt(line);
    } else if (line.match(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/)) {
      // Time range
      const [start, end] = line.split(' --> ');
      currentSubtitle.startTime = timeToSeconds(start);
      currentSubtitle.endTime = timeToSeconds(end);
    } else if (line && !line.match(/^\d+$/)) {
      // Subtitle text
      currentSubtitle.text = line;
      subtitles.push({ ...currentSubtitle });
      currentSubtitle = {};
    }
  }
  
  return subtitles;
}

function timeToSeconds(timeStr) {
  // Convert HH:MM:SS,mmm to seconds
  const [time, ms] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + (ms ? parseInt(ms) / 1000 : 0);
}

async function fetchYouTubeTranscript(videoId) {
  // Call our Python backend for real transcript extraction
  try {
    console.log('Calling backend for video ID:', videoId);
    
    const response = await fetch('http://localhost:8000/api/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.segments) {
      console.log(`Backend returned ${data.segments.length} transcript segments`);
      return data.segments;
    } else {
      throw new Error(data.error || 'Backend returned no segments');
    }
    
  } catch (error) {
    console.log('Backend transcript extraction failed:', error.message);
    
    // If backend is unavailable, show helpful error
    if (error.message.includes('fetch')) {
      throw new Error('Backend server not running. Start: python backend/app.py');
    }
    
    throw error;
  }
}

// Removed old transcript parsing functions - now handled by backend

function generateMockTranscript() {
  // Mock transcript fallback
  return [
    { id: 1, t: "00:01", src: "Welcome to this video", target: "Aloha i kēia wikiō", startTime: 1 },
    { id: 2, t: "00:05", src: "Today we're learning about language", target: "I kēia lā e a'o nei kākou e pili ana i ka 'ōlelo", startTime: 5 },
    { id: 3, t: "00:12", src: "This is very important", target: "He mea koʻikoʻi loa kēia", startTime: 12 },
    { id: 4, t: "00:18", src: "Let's get started", target: "E hoʻomaka kākou", startTime: 18 },
    { id: 5, t: "00:25", src: "Click the add card button to save this", target: "E kaomi i ka pihi hōʻiliʻili no ka mālama ʻana", startTime: 25 }
  ];
}