// RLVR Language Gym - YouTube Content Script
console.log('RLVR Language Gym: YouTube content script loaded');

// Simple YouTube transcript extractor
class YouTubeTranscriptExtractor {
    constructor() {
        this.init();
    }
    
    init() {
        // Add RLVR button to YouTube interface
        this.addRLVRButton();
        
        // Listen for navigation changes (YouTube is SPA)
        this.observeNavigation();
    }
    
    addRLVRButton() {
        // Wait for YouTube to load
        setTimeout(() => {
            const controls = document.querySelector('.ytp-right-controls');
            if (controls && !document.querySelector('#rlvr-btn')) {
                const rlvrBtn = document.createElement('button');
                rlvrBtn.id = 'rlvr-btn';
                rlvrBtn.innerHTML = '🎯';
                rlvrBtn.title = 'RLVR Language Gym';
                rlvrBtn.style.cssText = `
                    background: #3B82F6;
                    border: none;
                    color: white;
                    padding: 8px;
                    margin: 0 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                
                rlvrBtn.addEventListener('click', () => {
                    this.openRLVRPopup();
                });
                
                controls.insertBefore(rlvrBtn, controls.firstChild);
            }
        }, 2000);
    }
    
    openRLVRPopup() {
        // Send message to background to open popup or extract transcript
        chrome.runtime.sendMessage({
            action: 'openRLVR',
            url: window.location.href
        });
    }
    
    observeNavigation() {
        // Observer for YouTube SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => this.addRLVRButton(), 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }
    
    // Try to extract existing captions/transcript
    async extractTranscript() {
        try {
            // Look for transcript button
            const transcriptBtn = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
            if (transcriptBtn) {
                transcriptBtn.click();
                
                // Wait for transcript panel to load
                await this.sleep(1000);
                
                const transcriptPanel = document.querySelector('[data-target-id="transcript-scrollbox"]');
                if (transcriptPanel) {
                    return this.parseTranscriptPanel(transcriptPanel);
                }
            }
            
            return null;
        } catch (error) {
            console.error('Transcript extraction error:', error);
            return null;
        }
    }
    
    parseTranscriptPanel(panel) {
        const segments = [];
        const items = panel.querySelectorAll('[data-params*="transcript"]');
        
        items.forEach((item, index) => {
            const timeElement = item.querySelector('[data-params*="seekTo"]');
            const textElement = item.querySelector('.ytd-transcript-segment-renderer');
            
            if (timeElement && textElement) {
                segments.push({
                    id: index,
                    t: timeElement.textContent.trim(),
                    src: textElement.textContent.trim(),
                    target: '', // Would be filled by RLVR backend translation
                    startTime: this.timeToSeconds(timeElement.textContent)
                });
            }
        });
        
        return segments;
    }
    
    timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new YouTubeTranscriptExtractor();
    });
} else {
    new YouTubeTranscriptExtractor();
}

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractFromPage') {
        const extractor = new YouTubeTranscriptExtractor();
        extractor.extractTranscript().then(transcript => {
            sendResponse({ success: true, transcript });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});