// RLVR Language Gym - Simple Subtitle Overlay
console.log('RLVR: Overlay content script loaded');

// ---- 1) Locate the <video> on each site ----
function findVideo() {
  // youtube.com/watch pages and tv.apple.com both expose <video> element
  return document.querySelector('video') || null;
}

// ---- 2) Create overlay once ----
let overlay = document.createElement('div');
overlay.id = 'overlay-subs';
document.documentElement.appendChild(overlay);

// ---- 3) Keep overlay perfectly on top of the video ----
function syncOverlayBox() {
  const v = findVideo();
  if (!v) {
    requestAnimationFrame(syncOverlayBox);
    return;
  }
  const r = v.getBoundingClientRect();
  overlay.style.left   = r.left + 'px';
  overlay.style.top    = r.top + 'px';
  overlay.style.width  = r.width + 'px';
  overlay.style.height = r.height + 'px';
  requestAnimationFrame(syncOverlayBox);
}
requestAnimationFrame(syncOverlayBox);

// ---- 4) Load captions from Parade (VTT or JSON) ----
let cues = [];
let paradeUrl = null;

// Listen for Parade URL from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setParadeUrl') {
    paradeUrl = request.url;
    loadSubtitlesFromParade(request.url);
    sendResponse({ success: true });
  }
  if (request.action === 'toggleOverlay') {
    toggleOverlay();
    sendResponse({ success: true });
  }
});

async function loadSubtitlesFromParade(url) {
  try {
    console.log('RLVR: Loading subtitles from Parade:', url);
    const res = await fetch(url, { 
      credentials: 'include',
      headers: {
        'Accept': 'text/vtt, application/json, text/plain'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const text = await res.text();
    
    // Try to parse as VTT first, then JSON
    if (text.includes('WEBVTT')) {
      cues = parseVTT(text);
    } else {
      // Try as JSON format
      try {
        const json = JSON.parse(text);
        cues = parseJSONSubtitles(json);
      } catch {
        console.error('RLVR: Could not parse subtitle format');
      }
    }
    
    console.log(`RLVR: Loaded ${cues.length} subtitle cues`);
  } catch (error) {
    console.error('RLVR: Error loading Parade subtitles:', error);
  }
}

// Tiny VTT parser (covers common cases)
function parseVTT(vtt) {
  const lines = vtt.split(/\r?\n/);
  const parsedCues = [];
  let i = 0;
  
  const toSec = t => {
    // "HH:MM:SS.mmm" or "MM:SS.mmm"
    const p = t.split(':').map(Number);
    let s = 0;
    if (p.length === 3) s = p[0]*3600 + p[1]*60 + p[2];
    else s = p[0]*60 + p[1];
    return s;
  };
  
  while (i < lines.length) {
    if (/\d+:\d+/.test(lines[i])) {
      const [a, b] = lines[i].split('-->').map(s => s.trim());
      i++;
      let text = '';
      while (i < lines.length && lines[i] && !/^\s*$/.test(lines[i])) {
        text += (text ? '\n' : '') + lines[i];
        i++;
      }
      parsedCues.push({ 
        start: toSec(a.replace(',', '.')), 
        end: toSec(b.replace(',', '.')), 
        text: text.trim()
      });
    }
    i++;
  }
  return parsedCues;
}

// Parse JSON format subtitles
function parseJSONSubtitles(json) {
  if (Array.isArray(json)) {
    return json.map(item => ({
      start: item.start || item.startTime || 0,
      end: item.end || item.endTime || 0,
      text: item.text || item.content || ''
    }));
  }
  return [];
}

// ---- 5) Time sync: read <video>.currentTime and render ----
function renderSub() {
  const v = findVideo();
  if (!v || !cues.length) {
    requestAnimationFrame(renderSub);
    return;
  }
  
  const t = v.currentTime;
  const cue = cues.find(c => t >= c.start && t <= c.end);
  
  overlay.innerHTML = '';
  if (cue) {
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = cue.text.replace(/\n/g, ' ');
    overlay.appendChild(div);
    
    // Send to RLVR for flashcard creation
    sendSubtitleToRLVR(cue.text, t);
  }
  
  requestAnimationFrame(renderSub);
}
requestAnimationFrame(renderSub);

// ---- 6) Handle route changes / player swaps ----
const mo = new MutationObserver(() => {
  // When DOM changes (YouTube SPA nav or Apple TV UI), re-size overlay next frame
  requestAnimationFrame(syncOverlayBox);
});
mo.observe(document.documentElement, { childList: true, subtree: true });

// ---- 7) RLVR Integration ----
let lastSentText = null;

function sendSubtitleToRLVR(text, timestamp) {
  // Avoid sending duplicate subtitles
  if (text === lastSentText) return;
  lastSentText = text;
  
  // Send to background script for RLVR processing
  chrome.runtime.sendMessage({
    action: 'processSubtitle',
    text: text,
    timestamp: timestamp,
    source: window.location.hostname.includes('apple') ? 'appletv' : 'youtube',
    url: window.location.href
  });
}

function toggleOverlay() {
  overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
}

// ---- 8) Auto-load demo subtitles for testing ----
// For demo purposes, load some test subtitles if no Parade URL is set
setTimeout(() => {
  if (!paradeUrl) {
    // Demo subtitles for testing
    cues = [
      { start: 1, end: 4, text: "Welcome to this amazing video!" },
      { start: 5, end: 8, text: "Today we're learning something new." },
      { start: 10, end: 13, text: "This subtitle overlay works perfectly." },
      { start: 15, end: 18, text: "Click the extension to connect Parade URL." }
    ];
    console.log('RLVR: Demo subtitles loaded');
  }
}, 2000);