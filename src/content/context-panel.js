// RLVR Language Gym - Context Panel (Matching Screenshot)
console.log('RLVR: Context panel script loaded');

class RLVRContextPanel {
    constructor() {
        this.panel = null;
        this.subtitleBuffer = [];
        this.currentSelection = null;
        this.selectedText = '';
        this.showInContext = true;
        this.isYouTube = window.location.hostname.includes('youtube.com');
        this.isAppleTV = window.location.hostname.includes('tv.apple.com');
        this.video = null;
        
        this.init();
    }
    
    init() {
        this.findVideoElement();
        this.createContextPanel();
        this.startSubtitleTracking();
        this.setupEventListeners();
    }
    
    findVideoElement() {
        this.video = document.querySelector('video');
        if (this.video) {
            console.log('RLVR Context: Video element found');
        }
    }
    
    createContextPanel() {
        // Create main context panel container
        this.panel = document.createElement('div');
        this.panel.id = 'rlvr-context-panel';
        this.panel.innerHTML = `
            <div class="panel-header">
                <div class="header-title">RLVR Context</div>
                <div class="context-toggle">
                    <label>
                        <input type="checkbox" id="show-in-context" checked> 
                        Show in context
                    </label>
                </div>
            </div>
            
            <div class="subtitle-list" id="subtitle-context-list">
                <div class="loading-message">Loading subtitles...</div>
            </div>
            
            <div class="panel-actions">
                <button id="create-flashcard" class="create-btn" disabled>CREATE FLASHCARD</button>
                <button id="clear-selection" class="clear-btn">CLEAR SELECTION</button>
            </div>
            
            <div class="panel-drag-handle">⋮⋮</div>
        `;
        
        // Add panel to page
        document.body.appendChild(this.panel);
        
        // Make panel draggable
        this.makeDraggable();
    }
    
    makeDraggable() {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        const dragHandle = this.panel.querySelector('.panel-drag-handle');
        const header = this.panel.querySelector('.panel-header');
        
        [dragHandle, header].forEach(element => {
            element.addEventListener('mousedown', (e) => {
                isDragging = true;
                const rect = this.panel.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
                this.panel.style.userSelect = 'none';
            });
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            // Keep panel within viewport
            const maxX = window.innerWidth - this.panel.offsetWidth;
            const maxY = window.innerHeight - this.panel.offsetHeight;
            
            this.panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            this.panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            this.panel.style.right = 'auto'; // Remove right positioning when dragging
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.panel.style.userSelect = '';
        });
    }
    
    setupEventListeners() {
        // Show in context toggle
        const contextToggle = this.panel.querySelector('#show-in-context');
        contextToggle.addEventListener('change', (e) => {
            this.showInContext = e.target.checked;
            this.updateContextDisplay();
        });
        
        // Create flashcard button
        const createBtn = this.panel.querySelector('#create-flashcard');
        createBtn.addEventListener('click', () => {
            this.createFlashcardFromSelection();
        });
        
        // Clear selection button
        const clearBtn = this.panel.querySelector('#clear-selection');
        clearBtn.addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Listen for text selection in subtitle list
        const subtitleList = this.panel.querySelector('#subtitle-context-list');
        subtitleList.addEventListener('mouseup', () => {
            this.handleTextSelection();
        });
        
        // Handle panel visibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePanel();
            }
        });
    }
    
    startSubtitleTracking() {
        if (!this.video) {
            setTimeout(() => this.startSubtitleTracking(), 1000);
            return;
        }
        
        // Track video time and update context
        const updateContext = () => {
            if (this.video && !this.video.paused) {
                this.updateSubtitleContext(this.video.currentTime);
            }
        };
        
        setInterval(updateContext, 500);
        
        // Load demo subtitles for testing
        this.loadDemoSubtitles();
    }
    
    loadDemoSubtitles() {
        // Demo subtitles matching screenshot format
        this.subtitleBuffer = [
            { id: 1, start: 30, end: 35, text: "宇宙は神秘に", timestamp: "00:30-00:35", romaji: "uchuu wa shinpi ni" },
            { id: 2, start: 35, end: 38, text: "満ちている", timestamp: "00:35-00:38", romaji: "michiteiru" },
            { id: 3, start: 39, end: 41, text: "いっぱいきらら", timestamp: "00:39-00:41", romaji: "ippai kirara" },
            { id: 4, start: 41, end: 44, text: "お星さまがある", timestamp: "00:41-00:44", romaji: "ohoshi-sama ga aru" },
            { id: 5, start: 45, end: 48, text: "そんなもんて", timestamp: "00:45-00:48", romaji: "sonna monte" },
            { id: 6, start: 48, end: 51, text: "ダークマター", timestamp: "00:48-00:51", romaji: "daaku mataa" },
            { id: 7, start: 52, end: 55, text: "言葉にできない", timestamp: "00:52-00:55", romaji: "kotoba ni dekinai" }
        ];
        
        this.updateContextDisplay();
    }
    
    updateSubtitleContext(currentTime) {
        if (this.subtitleBuffer.length === 0) return;
        
        // Find current subtitle and surrounding context
        const currentIndex = this.subtitleBuffer.findIndex(sub => 
            currentTime >= sub.start && currentTime <= sub.end
        );
        
        if (currentIndex >= 0) {
            this.currentSubtitle = this.subtitleBuffer[currentIndex];
            this.updateContextDisplay();
        }
    }
    
    updateContextDisplay() {
        const subtitleList = this.panel.querySelector('#subtitle-context-list');
        
        if (this.subtitleBuffer.length === 0) {
            subtitleList.innerHTML = '<div class="loading-message">No subtitles available</div>';
            return;
        }
        
        let displaySubtitles = this.subtitleBuffer;
        
        // If "Show in context" is disabled, only show current subtitle
        if (!this.showInContext && this.currentSubtitle) {
            displaySubtitles = [this.currentSubtitle];
        }
        
        // Generate subtitle entries HTML
        const subtitleHTML = displaySubtitles.map(subtitle => `
            <div class="subtitle-entry ${subtitle === this.currentSubtitle ? 'current' : ''}" 
                 data-id="${subtitle.id}">
                <div class="timestamp">${subtitle.timestamp}</div>
                <div class="subtitle-text" data-selectable="true">${subtitle.text}</div>
                ${subtitle.romaji ? `<div class="romaji">${subtitle.romaji}</div>` : ''}
            </div>
        `).join('');
        
        subtitleList.innerHTML = subtitleHTML;
        
        // Scroll current subtitle into view
        if (this.currentSubtitle) {
            const currentEntry = subtitleList.querySelector('.subtitle-entry.current');
            if (currentEntry) {
                currentEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && this.panel.contains(selection.anchorNode)) {
            this.selectedText = selectedText;
            this.highlightSelection();
            this.updateCreateButton();
        }
    }
    
    highlightSelection() {
        // Add selection highlight class to selected text
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (this.panel.contains(range.commonAncestorContainer)) {
                // Visual feedback for selection
                const createBtn = this.panel.querySelector('#create-flashcard');
                createBtn.style.background = '#3B82F6';
                createBtn.style.color = 'white';
            }
        }
    }
    
    updateCreateButton() {
        const createBtn = this.panel.querySelector('#create-flashcard');
        if (this.selectedText) {
            createBtn.disabled = false;
            createBtn.textContent = `CREATE FLASHCARD (${this.selectedText.length} chars)`;
        } else {
            createBtn.disabled = true;
            createBtn.textContent = 'CREATE FLASHCARD';
        }
    }
    
    clearSelection() {
        window.getSelection().removeAllRanges();
        this.selectedText = '';
        this.updateCreateButton();
        
        const createBtn = this.panel.querySelector('#create-flashcard');
        createBtn.style.background = '';
        createBtn.style.color = '';
    }
    
    createFlashcardFromSelection() {
        if (!this.selectedText) return;
        
        // Get surrounding context
        const contextBefore = this.getContextBefore();
        const contextAfter = this.getContextAfter();
        
        // Create context card
        const contextCard = {
            front: this.selectedText,
            back: '', // Will be filled by RLVR backend translation
            context: {
                before: contextBefore,
                after: contextAfter,
                videoTitle: document.title,
                timestamp: this.currentSubtitle?.timestamp || '',
                source: this.isYouTube ? 'youtube' : 'appletv'
            },
            mediaUrl: window.location.href,
            isContext: true
        };
        
        // Send to RLVR backend
        chrome.runtime.sendMessage({
            action: 'createContextCard',
            card: contextCard
        });
        
        // Visual feedback
        const createBtn = this.panel.querySelector('#create-flashcard');
        const originalText = createBtn.textContent;
        createBtn.textContent = 'CARD CREATED! ✓';
        createBtn.style.background = '#22C55E';
        
        setTimeout(() => {
            createBtn.textContent = originalText;
            createBtn.style.background = '';
            this.clearSelection();
        }, 2000);
    }
    
    getContextBefore() {
        if (!this.currentSubtitle) return [];
        
        const currentIndex = this.subtitleBuffer.findIndex(sub => sub.id === this.currentSubtitle.id);
        return this.subtitleBuffer.slice(Math.max(0, currentIndex - 2), currentIndex)
            .map(sub => ({ text: sub.text, timestamp: sub.timestamp }));
    }
    
    getContextAfter() {
        if (!this.currentSubtitle) return [];
        
        const currentIndex = this.subtitleBuffer.findIndex(sub => sub.id === this.currentSubtitle.id);
        return this.subtitleBuffer.slice(currentIndex + 1, currentIndex + 3)
            .map(sub => ({ text: sub.text, timestamp: sub.timestamp }));
    }
    
    togglePanel() {
        this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
    }
    
    // Listen for messages from popup
    handleMessage(request, sender, sendResponse) {
        if (request.action === 'toggleContextPanel') {
            this.togglePanel();
            sendResponse({ success: true });
        }
        if (request.action === 'updateSubtitles') {
            this.subtitleBuffer = request.subtitles;
            this.updateContextDisplay();
            sendResponse({ success: true });
        }
    }
}

// Initialize context panel when page loads
let contextPanel = null;

function initContextPanel() {
    if (!contextPanel && (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('tv.apple.com'))) {
        contextPanel = new RLVRContextPanel();
        
        // Listen for messages
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            contextPanel.handleMessage(request, sender, sendResponse);
        });
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContextPanel);
} else {
    initContextPanel();
}