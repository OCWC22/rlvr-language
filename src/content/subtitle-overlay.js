// RLVR Language Gym - Subtitle Overlay
console.log('RLVR Subtitle Overlay loaded');

class RLVRSubtitleOverlay {
    constructor() {
        this.overlayContainer = null;
        this.subtitles = [];
        this.currentSubtitle = null;
        this.isAppleTV = window.location.hostname.includes('tv.apple.com');
        this.isYouTube = window.location.hostname.includes('youtube.com');
        this.paradeWebsiteUrl = null; // Will be set from popup
        this.init();
    }
    
    init() {
        // Real-time translation state
        this.translationCache = new Map();
        this.isObserving = false;
        this.lastCaptionText = '';
        this.translationQueue = [];
        
        this.createOverlayContainer();
        this.detectVideoPlayer();
        this.startLiveCaptionObservation(); // Changed from subtitle extraction to live observation
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'setParadeUrl') {
                this.paradeWebsiteUrl = request.url;
                this.loadSubtitlesFromParade();
            }
            if (request.action === 'toggleOverlay') {
                this.toggleOverlay();
            }
        });
    }
    
    createOverlayContainer() {
        // Create subtitle overlay container with Migaku-style dual subtitles
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'rlvr-subtitle-overlay';
        this.overlayContainer.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            max-width: 85%;
            text-align: center;
            pointer-events: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            user-select: none;
        `;
        
        // Create primary subtitle (original language)
        const primarySubtitle = document.createElement('div');
        primarySubtitle.id = 'rlvr-primary-subtitle';
        primarySubtitle.style.cssText = `
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7));
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 20px;
            font-weight: 500;
            line-height: 1.4;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            margin-bottom: 8px;
            cursor: pointer;
        `;
        
        // Create secondary subtitle (Hawaiian translation)
        const secondarySubtitle = document.createElement('div');
        secondarySubtitle.id = 'rlvr-secondary-subtitle';
        secondarySubtitle.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.8));
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.3;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 3px 15px rgba(59, 130, 246, 0.3);
            cursor: pointer;
        `;
        
        // Create definition popup for word lookups
        const definitionPopup = document.createElement('div');
        definitionPopup.id = 'rlvr-definition-popup';
        definitionPopup.style.cssText = `
            position: absolute;
            background: rgba(26, 26, 26, 0.95);
            color: #ffffff;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.4;
            display: none;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
            max-width: 280px;
            z-index: 1000000;
            pointer-events: auto;
        `;
        
        // Create floating toolbar (Migaku-style)
        const floatingToolbar = document.createElement('div');
        floatingToolbar.id = 'rlvr-floating-toolbar';
        floatingToolbar.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            z-index: 999998;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9));
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px 8px;
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            gap: 8px;
            opacity: 0.7;
            transition: all 0.3s ease;
            cursor: move;
        `;
        
        floatingToolbar.innerHTML = `
            <div class="toolbar-btn" id="rlvr-toggle-subtitles" title="Toggle Subtitles">
                <span style="font-size: 16px;">💬</span>
            </div>
            <div class="toolbar-btn" id="rlvr-toggle-hawaiian" title="Toggle Hawaiian">
                <span style="font-size: 16px;">🌺</span>
            </div>
            <div class="toolbar-btn" id="rlvr-pause-unknown" title="Pause on Unknown Words">
                <span style="font-size: 16px;">⏸️</span>
            </div>
            <div class="toolbar-btn" id="rlvr-learning-mode" title="Learning Mode">
                <span style="font-size: 16px;">🎓</span>
            </div>
            <div class="toolbar-btn" id="rlvr-flashcard-mode" title="Flashcard Mode">
                <span style="font-size: 16px;">📚</span>
            </div>
            <div class="toolbar-btn" id="rlvr-settings" title="Settings">
                <span style="font-size: 16px;">⚙️</span>
            </div>
        `;
        
        // Add toolbar button styles
        const toolbarStyle = document.createElement('style');
        toolbarStyle.textContent = `
            .toolbar-btn {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
            }
            
            .toolbar-btn:hover {
                background: rgba(59, 130, 246, 0.3);
                border-color: rgba(59, 130, 246, 0.5);
                transform: scale(1.05);
            }
            
            .toolbar-btn.active {
                background: rgba(59, 130, 246, 0.6);
                border-color: rgba(59, 130, 246, 0.8);
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
            }
            
            #rlvr-floating-toolbar:hover {
                opacity: 1;
                transform: translateY(-50%) scale(1.02);
            }
        `;
        document.head.appendChild(toolbarStyle);
        
        this.overlayContainer.appendChild(primarySubtitle);
        this.overlayContainer.appendChild(secondarySubtitle);
        this.overlayContainer.appendChild(definitionPopup);
        this.overlayContainer.appendChild(floatingToolbar);
        document.body.appendChild(this.overlayContainer);
        
        // Initialize toolbar functionality  
        this.initializeToolbar();
        
        // Initialize keyboard shortcuts
        this.addFlashcardKeyboardShortcut();
    }
    
    initializeToolbar() {
        // Settings state
        this.settings = {
            subtitlesEnabled: true,
            hawaiianEnabled: true,
            pauseOnUnknown: false,
            learningMode: 'beginner', // beginner, intermediate, advanced
            flashcardMode: false
        };
        
        // Toggle subtitles
        document.getElementById('rlvr-toggle-subtitles').addEventListener('click', () => {
            this.settings.subtitlesEnabled = !this.settings.subtitlesEnabled;
            this.updateToolbarState();
            this.applySettings();
        });
        
        // Toggle Hawaiian translation
        document.getElementById('rlvr-toggle-hawaiian').addEventListener('click', () => {
            this.settings.hawaiianEnabled = !this.settings.hawaiianEnabled;
            this.updateToolbarState();
            this.applySettings();
        });
        
        // Pause on unknown words
        document.getElementById('rlvr-pause-unknown').addEventListener('click', () => {
            this.settings.pauseOnUnknown = !this.settings.pauseOnUnknown;
            this.updateToolbarState();
            this.showTooltip('Pause on unknown: ' + (this.settings.pauseOnUnknown ? 'ON' : 'OFF'));
        });
        
        // Learning mode cycling (beginner → intermediate → advanced)
        document.getElementById('rlvr-learning-mode').addEventListener('click', () => {
            const modes = ['beginner', 'intermediate', 'advanced'];
            const currentIndex = modes.indexOf(this.settings.learningMode);
            this.settings.learningMode = modes[(currentIndex + 1) % modes.length];
            this.updateToolbarState();
            this.applyLearningMode();
            this.showTooltip('Learning mode: ' + this.settings.learningMode);
        });
        
        // Flashcard mode - Create enhanced flashcard from current subtitle
        document.getElementById('rlvr-flashcard-mode').addEventListener('click', async () => {
            if (this.currentSubtitle) {
                // Get Hawaiian translation for current subtitle
                const translation = await this.getTranslationFromBackend(this.currentSubtitle);
                await this.createEnhancedFlashcard(this.currentSubtitle, translation);
            } else {
                this.showTooltip('No subtitle available for flashcard creation');
            }
        });
        
        // Settings panel
        document.getElementById('rlvr-settings').addEventListener('click', () => {
            this.showSettingsPanel();
        });
        
        // Make toolbar draggable
        this.makeToolbarDraggable();
        
        // Initialize button states
        this.updateToolbarState();
    }
    
    updateToolbarState() {
        // Update button active states
        const subtitlesBtn = document.getElementById('rlvr-toggle-subtitles');
        const hawaiianBtn = document.getElementById('rlvr-toggle-hawaiian');
        const pauseBtn = document.getElementById('rlvr-pause-unknown');
        const learningBtn = document.getElementById('rlvr-learning-mode');
        const flashcardBtn = document.getElementById('rlvr-flashcard-mode');
        
        subtitlesBtn.classList.toggle('active', this.settings.subtitlesEnabled);
        hawaiianBtn.classList.toggle('active', this.settings.hawaiianEnabled);
        pauseBtn.classList.toggle('active', this.settings.pauseOnUnknown);
        flashcardBtn.classList.toggle('active', this.settings.flashcardMode);
        
        // Update learning mode icon
        const modeIcons = {
            'beginner': '🌱',
            'intermediate': '🎓', 
            'advanced': '🏆'
        };
        learningBtn.querySelector('span').textContent = modeIcons[this.settings.learningMode];
    }
    
    applySettings() {
        const primaryElement = document.getElementById('rlvr-primary-subtitle');
        const secondaryElement = document.getElementById('rlvr-secondary-subtitle');
        
        // Apply subtitle visibility
        if (!this.settings.subtitlesEnabled) {
            if (primaryElement) primaryElement.style.display = 'none';
            if (secondaryElement) secondaryElement.style.display = 'none';
        }
        
        // Apply Hawaiian translation visibility
        if (!this.settings.hawaiianEnabled && secondaryElement) {
            secondaryElement.style.display = 'none';
        }
    }
    
    applyLearningMode() {
        const secondaryElement = document.getElementById('rlvr-secondary-subtitle');
        if (!secondaryElement) return;
        
        // Adjust learning mode display
        switch (this.settings.learningMode) {
            case 'beginner':
                // Show both languages always
                secondaryElement.style.opacity = '1';
                break;
            case 'intermediate':
                // Show Hawaiian on hover
                secondaryElement.style.opacity = '0.6';
                secondaryElement.addEventListener('mouseenter', () => {
                    secondaryElement.style.opacity = '1';
                });
                secondaryElement.addEventListener('mouseleave', () => {
                    secondaryElement.style.opacity = '0.6';
                });
                break;
            case 'advanced':
                // Hide Hawaiian, show only on click
                secondaryElement.style.opacity = '0.2';
                break;
        }
    }
    
    showTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            right: 80px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000001;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        tooltip.textContent = message;
        
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.style.opacity = '1', 10);
        
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => document.body.removeChild(tooltip), 300);
        }, 2000);
    }
    
    makeToolbarDraggable() {
        const toolbar = document.getElementById('rlvr-floating-toolbar');
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        toolbar.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = toolbar.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            toolbar.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            // Keep toolbar within viewport bounds
            const maxX = window.innerWidth - toolbar.offsetWidth;
            const maxY = window.innerHeight - toolbar.offsetHeight;
            
            toolbar.style.right = 'auto';
            toolbar.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            toolbar.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            toolbar.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            toolbar.style.cursor = 'move';
        });
    }
    
    showSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'rlvr-settings-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(30, 30, 30, 0.95));
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 24px;
            backdrop-filter: blur(20px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
            z-index: 1000002;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            min-width: 320px;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #60A5FA;">RLVR Settings</h3>
                <button id="close-settings" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">✕</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Subtitle Size:</label>
                <input type="range" id="subtitle-size" min="12" max="28" value="18" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Translation Speed:</label>
                <select id="translation-speed" style="width: 100%; padding: 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);">
                    <option value="instant">Instant</option>
                    <option value="fast">Fast (0.5s)</option>
                    <option value="normal" selected>Normal (1s)</option>
                    <option value="slow">Slow (2s)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="auto-pause" ${this.settings.pauseOnUnknown ? 'checked' : ''} style="margin-right: 8px;">
                    Auto-pause on unknown words
                </label>
            </div>
            
            <div style="text-align: center;">
                <button id="save-settings" style="background: #3B82F6; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 10px;">Save</button>
                <button id="reset-settings" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Reset</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Settings panel event listeners
        document.getElementById('close-settings').addEventListener('click', () => {
            document.body.removeChild(panel);
        });
        
        document.getElementById('save-settings').addEventListener('click', () => {
            // Save settings logic here
            this.showTooltip('Settings saved!');
            document.body.removeChild(panel);
        });
        
        document.getElementById('reset-settings').addEventListener('click', () => {
            // Reset settings logic here
            this.showTooltip('Settings reset!');
        });
    }
    
    detectVideoPlayer() {
        // Find video element on the page
        const video = document.querySelector('video');
        if (video) {
            this.videoElement = video;
            video.addEventListener('timeupdate', () => {
                this.updateSubtitleDisplay(video.currentTime);
            });
            console.log('RLVR: Video player detected');
        }
    }
    
    startLiveCaptionObservation() {
        console.log('🎯 RLVR: Starting live caption observation for real-time translation');
        
        if (this.isAppleTV) {
            this.observeAppleTVCaptions();
        } else if (this.isYouTube) {
            this.observeYouTubeCaptions();
        }
        
        // Start the translation processing queue
        this.startTranslationQueue();
    }
    
    observeYouTubeCaptions() {
        console.log('📺 YouTube: Setting up live caption detection');
        
        // YouTube caption selectors - multiple possible containers
        const captionSelectors = [
            '.ytp-caption-segment',      // Primary YouTube caption segments
            '.caption-window',           // YouTube caption window
            '.ytp-caption-window-container', // Alternative container
            '[class*="caption"]'         // Any element with "caption" in class
        ];
        
        // Create MutationObserver for real-time caption detection
        this.captionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                // Check for added caption nodes
                if (mutation.addedNodes) {
                    for (const node of mutation.addedNodes) {
                        if (this.isCaptionNode(node)) {
                            await this.processCaptionNode(node);
                        }
                    }
                }
                
                // Check for modified caption text
                if (mutation.type === 'characterData' && mutation.target.parentNode) {
                    const parentNode = mutation.target.parentNode;
                    if (this.isCaptionNode(parentNode)) {
                        await this.processCaptionNode(parentNode);
                    }
                }
            }
        });
        
        // Start observing the YouTube player
        const playerContainer = document.querySelector('#movie_player') || document.querySelector('ytd-player') || document.body;
        if (playerContainer) {
            this.captionObserver.observe(playerContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('✅ YouTube caption observer started');
            this.isObserving = true;
        }
    }
    
    observeAppleTVCaptions() {
        console.log('🍎 Apple TV: Setting up live caption detection');
        
        // Apple TV uses WebKit video controls (often in shadow DOM)
        const appleTVSelectors = [
            '.captions',
            '.subtitle',
            '[class*="caption"]',
            '[class*="subtitle"]',
            '.amp-caption-content',
            'span[style*="position: absolute"]' // Common Apple TV subtitle positioning
        ];
        
        this.captionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes) {
                    for (const node of mutation.addedNodes) {
                        if (this.isAppleTVCaptionNode(node)) {
                            await this.processCaptionNode(node);
                        }
                    }
                }
                
                // Watch for text changes in existing caption nodes
                if (mutation.type === 'characterData') {
                    const parentNode = mutation.target.parentNode;
                    if (this.isAppleTVCaptionNode(parentNode)) {
                        await this.processCaptionNode(parentNode);
                    }
                }
            }
        });
        
        // Observe the entire page for Apple TV captions
        this.captionObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        console.log('✅ Apple TV caption observer started');
        this.isObserving = true;
    }
    
    isCaptionNode(node) {
        if (!node || !node.classList) return false;
        
        // YouTube caption detection
        return node.classList.contains('ytp-caption-segment') ||
               node.classList.contains('caption-window') ||
               node.classList.contains('ytp-caption-window-container') ||
               (node.className && node.className.includes && node.className.includes('caption'));
    }
    
    isAppleTVCaptionNode(node) {
        if (!node) return false;
        
        // Apple TV caption detection (more flexible)
        const hasClass = node.classList && (
            node.classList.contains('captions') ||
            node.classList.contains('subtitle') ||
            [...node.classList].some(cls => cls.includes('caption') || cls.includes('subtitle'))
        );
        
        const hasStyle = node.style && node.style.position === 'absolute';
        
        return hasClass || hasStyle;
    }
    
    async processCaptionNode(node) {
        const captionText = node.textContent?.trim();
        
        // Skip if no text or same as last caption
        if (!captionText || captionText === this.lastCaptionText || captionText.length < 2) {
            return;
        }
        
        console.log(`🎬 Live caption detected: "${captionText}"`);
        this.lastCaptionText = captionText;
        
        // Add to translation queue for instant processing
        this.queueTranslation(captionText, node);
    }
    
    queueTranslation(text, sourceNode) {
        // Add to translation queue with timestamp
        this.translationQueue.push({
            text: text,
            sourceNode: sourceNode,
            timestamp: Date.now()
        });
        
        console.log(`⚡ Queued for translation: "${text}"`);
    }
    
    async startTranslationQueue() {
        // Process translation queue every 50ms for ultra-fast response
        setInterval(async () => {
            if (this.translationQueue.length > 0) {
                const item = this.translationQueue.shift();
                await this.processLiveTranslation(item);
            }
        }, 50);
    }
    
    async processLiveTranslation(item) {
        const { text, sourceNode, timestamp } = item;
        const startTime = performance.now();
        
        try {
            // Check cache first for instant response
            if (this.translationCache.has(text)) {
                const cachedTranslation = this.translationCache.get(text);
                await this.displayLiveTranslation(text, cachedTranslation, sourceNode);
                console.log(`⚡ Cached translation (${(performance.now() - startTime).toFixed(1)}ms): "${text}" → "${cachedTranslation}"`);
                return;
            }
            
            // Call live translation API (Cerebras)
            const translation = await this.callLiveTranslationAPI(text);
            
            if (translation) {
                // Cache for future use
                this.translationCache.set(text, translation);
                
                // Display immediately
                await this.displayLiveTranslation(text, translation, sourceNode);
                
                const totalTime = performance.now() - startTime;
                console.log(`🚀 Live translation (${totalTime.toFixed(1)}ms): "${text}" → "${translation}"`);
            }
            
        } catch (error) {
            console.error('Live translation error:', error);
            // Show original text with indicator
            await this.displayLiveTranslation(text, `(${text})`, sourceNode);
        }
    }
    
    async callLiveTranslationAPI(text) {
        try {
            // Ultra-fast translation call to backend
            const response = await fetch('http://localhost:8000/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    target_language: this.isAppleTV ? 'english' : 'hawaiian'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.translation;
            } else {
                console.warn('Translation API error:', response.status);
                return this.getFallbackTranslation(text);
            }
            
        } catch (error) {
            console.warn('Translation API failed:', error);
            return this.getFallbackTranslation(text);
        }
    }
    
    getFallbackTranslation(text) {
        // Quick fallback translations for ultra-fast response
        const quickTranslations = {
            'hello': 'aloha',
            'thank you': 'mahalo',
            'family': 'ʻohana',
            'ocean': 'kai',
            'love': 'aloha',
            'beautiful': 'nani',
            'island': 'mokupuni',
            'mountain': 'mauna',
            'house': 'hale',
            'water': 'wai',
            'aloha': 'hello/love',
            'mahalo': 'thank you',
            'ʻohana': 'family',
            'kai': 'ocean/sea',
            'nani': 'beautiful'
        };
        
        const lowerText = text.toLowerCase();
        for (const [key, value] of Object.entries(quickTranslations)) {
            if (lowerText.includes(key)) {
                return value;
            }
        }
        
        return `(${text.substring(0, 15)}...)`;
    }
    
    async displayLiveTranslation(originalText, translation, sourceNode) {
        // Display the live translation using our dual subtitle system
        await this.displaySubtitle(originalText, translation);
        
        // Optional: Position near the source caption for precise alignment
        if (sourceNode && sourceNode.getBoundingClientRect) {
            const rect = sourceNode.getBoundingClientRect();
            const secondaryElement = document.getElementById('rlvr-secondary-subtitle');
            
            if (secondaryElement && rect.top > 0) {
                // Position Hawaiian subtitle just below the original
                secondaryElement.style.position = 'fixed';
                secondaryElement.style.top = `${rect.bottom + 10}px`;
                secondaryElement.style.left = '50%';
                secondaryElement.style.transform = 'translateX(-50%)';
                secondaryElement.style.zIndex = '1000000';
            }
        }
    }
    
    extractAppleTVSubtitles() {
        // Try to extract native Apple TV subtitles
        console.log('RLVR: Extracting Apple TV subtitles...');
        
        // Look for Apple TV subtitle elements
        const checkForSubtitles = () => {
            // Apple TV uses various subtitle containers
            const subtitleSelectors = [
                '.captions',
                '.subtitle',
                '[class*="caption"]',
                '[class*="subtitle"]',
                'span[style*="position: absolute"]',
                '.amp-caption-content'
            ];
            
            subtitleSelectors.forEach(selector => {
                const subtitleElements = document.querySelectorAll(selector);
                if (subtitleElements.length > 0) {
                    console.log('RLVR: Found Apple TV subtitles:', selector);
                    this.observeNativeSubtitles(subtitleElements[0]);
                }
            });
        };
        
        // Check immediately and periodically
        checkForSubtitles();
        setInterval(checkForSubtitles, 2000);
    }
    
    observeNativeSubtitles(subtitleElement) {
        // Observe changes in native subtitle element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const text = subtitleElement.textContent.trim();
                    if (text && text !== this.currentSubtitle) {
                        this.currentSubtitle = text;
                        this.displaySubtitle(text);
                        
                        // Send to RLVR backend for processing
                        this.sendSubtitleToRLVR(text);
                    }
                }
            });
        });
        
        observer.observe(subtitleElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    extractYouTubeSubtitles() {
        // Extract YouTube captions
        const captionsContainer = document.querySelector('.caption-window');
        if (captionsContainer) {
            this.observeNativeSubtitles(captionsContainer);
        }
    }
    
    async loadSubtitlesFromParade() {
        if (!this.paradeWebsiteUrl) return;
        
        try {
            console.log('RLVR: Loading subtitles from Parade website:', this.paradeWebsiteUrl);
            
            // Send request to background script to fetch from Parade website
            const response = await chrome.runtime.sendMessage({
                action: 'fetchParadeSubtitles',
                url: this.paradeWebsiteUrl
            });
            
            if (response.success) {
                this.subtitles = response.subtitles;
                console.log('RLVR: Loaded', this.subtitles.length, 'subtitles from Parade');
            }
        } catch (error) {
            console.error('RLVR: Error loading Parade subtitles:', error);
        }
    }
    
    updateSubtitleDisplay(currentTime) {
        // Show subtitle based on current video time
        const subtitle = this.subtitles.find(sub => 
            currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        
        if (subtitle && subtitle.text !== this.currentSubtitle) {
            this.displaySubtitle(subtitle.text);
            this.currentSubtitle = subtitle.text;
            this.sendSubtitleToRLVR(subtitle.text);
        } else if (!subtitle) {
            this.hideSubtitle();
        }
    }
    
    async displaySubtitle(text, translation = '') {
        const primaryElement = document.getElementById('rlvr-primary-subtitle');
        const secondaryElement = document.getElementById('rlvr-secondary-subtitle');
        
        if (!primaryElement || !secondaryElement) return;
        
        // Create clickable word spans for the primary subtitle
        const clickableText = this.createClickableWords(text);
        primaryElement.innerHTML = clickableText;
        primaryElement.style.display = 'block';
        
        // Get Hawaiian translation if not provided
        if (!translation && text) {
            translation = await this.getTranslationFromBackend(text);
        }
        
        if (translation) {
            // Create clickable word spans for Hawaiian translation
            const clickableTranslation = this.createClickableWords(translation, true);
            secondaryElement.innerHTML = clickableTranslation;
            secondaryElement.style.display = 'block';
        }
        
        // Add click event listeners for word lookups
        this.addWordClickListeners();
        
        // Auto-hide after 4 seconds if no new subtitle
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
            this.hideSubtitle();
        }, 4000);
    }
    
    createClickableWords(text, isHawaiian = false) {
        // Split text into words and make each clickable
        const words = text.split(/(\s+|[.,!?;:])/);
        return words.map(word => {
            if (word.trim() && !/^[.,!?;:\s]*$/.test(word)) {
                const className = isHawaiian ? 'rlvr-hawaiian-word' : 'rlvr-english-word';
                return `<span class="${className}" data-word="${word.trim()}" style="
                    cursor: pointer;
                    padding: 2px 1px;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                    text-decoration: none;
                " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" 
                   onmouseout="this.style.backgroundColor='transparent'">${word}</span>`;
            }
            return word;
        }).join('');
    }
    
    addWordClickListeners() {
        // Add click listeners for English words
        document.querySelectorAll('.rlvr-english-word').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWordClick(e.target.dataset.word, false);
            });
        });
        
        // Add click listeners for Hawaiian words
        document.querySelectorAll('.rlvr-hawaiian-word').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWordClick(e.target.dataset.word, true);
            });
        });
    }
    
    async handleWordClick(word, isHawaiian) {
        console.log(`RLVR: Word clicked: "${word}" (Hawaiian: ${isHawaiian})`);
        
        // Get definition from backend
        const definition = await this.getWordDefinition(word, isHawaiian);
        
        // Show definition popup
        this.showDefinitionPopup(word, definition, isHawaiian);
    }
    
    async getTranslationFromBackend(text) {
        try {
            const response = await fetch('http://localhost:8000/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    target_language: 'hawaiian'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.translation;
            }
        } catch (error) {
            console.log('RLVR: Translation API not available, using fallback');
        }
        
        // Fallback to basic translation
        return this.getBasicTranslation(text);
    }
    
    getBasicTranslation(text) {
        // Basic translations for immediate demo
        const translations = {
            'hello': 'aloha',
            'thank you': 'mahalo', 
            'family': 'ʻohana',
            'ocean': 'kai',
            'love': 'aloha',
            'beautiful': 'nani',
            'island': 'mokupuni',
            'mountain': 'mauna',
            'house': 'hale',
            'water': 'wai'
        };
        
        const lowerText = text.toLowerCase();
        for (const [eng, haw] of Object.entries(translations)) {
            if (lowerText.includes(eng)) {
                return haw;
            }
        }
        
        return `(${text.substring(0, 20)}...)`;
    }
    
    async getWordDefinition(word, isHawaiian) {
        // Mock definitions for demo - replace with real API
        const definitions = {
            // English to Hawaiian
            'hello': 'aloha - greeting, love, affection',
            'family': 'ʻohana - family, relative, kinsman',
            'ocean': 'kai - sea, salt water',
            'beautiful': 'nani - beauty, glory, splendor',
            
            // Hawaiian to English  
            'aloha': 'hello, goodbye, love - A traditional Hawaiian greeting',
            'ʻohana': 'family - Means family, nobody gets left behind',
            'mahalo': 'thank you - Expression of gratitude',
            'kai': 'ocean, sea - The life-giving waters surrounding the islands',
            'nani': 'beautiful - Natural beauty and grace',
            'mokupuni': 'island - A piece of land surrounded by water',
            'mauna': 'mountain - The sacred peaks of Hawaii'
        };
        
        const key = word.toLowerCase();
        return definitions[key] || `${word} - Definition not available`;
    }
    
    showDefinitionPopup(word, definition, isHawaiian) {
        const popup = document.getElementById('rlvr-definition-popup');
        if (!popup) return;
        
        popup.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 6px; color: ${isHawaiian ? '#60A5FA' : '#FFF'};">
                ${word}
            </div>
            <div style="font-size: 13px; line-height: 1.4;">
                ${definition}
            </div>
        `;
        
        popup.style.display = 'block';
        
        // Auto-hide popup after 3 seconds
        setTimeout(() => {
            popup.style.display = 'none';
        }, 3000);
    }
    
    hideSubtitle() {
        const primaryElement = document.getElementById('rlvr-primary-subtitle');
        const secondaryElement = document.getElementById('rlvr-secondary-subtitle');
        const popupElement = document.getElementById('rlvr-definition-popup');
        
        if (primaryElement) primaryElement.style.display = 'none';
        if (secondaryElement) secondaryElement.style.display = 'none';
        if (popupElement) popupElement.style.display = 'none';
        
        this.currentSubtitle = null;
    }
    
    toggleOverlay() {
        if (this.overlayContainer) {
            const isVisible = this.overlayContainer.style.display !== 'none';
            this.overlayContainer.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    sendSubtitleToRLVR(text) {
        // Send subtitle to RLVR backend for processing and card creation
        chrome.runtime.sendMessage({
            action: 'processSubtitle',
            text: text,
            timestamp: this.videoElement ? this.videoElement.currentTime : 0,
            source: this.isAppleTV ? 'appletv' : 'youtube',
            url: window.location.href
        });
    }
    
    async createEnhancedFlashcard(text, translation) {
        // Enhanced flashcard creation with audio and screenshots (Migaku-style)
        console.log('🎯 Creating enhanced flashcard with multimedia...');
        
        const flashcardData = {
            front: text,
            back: translation,
            timestamp: this.videoElement ? this.formatTime(this.videoElement.currentTime) : '00:00',
            videoTime: this.videoElement ? this.videoElement.currentTime : 0,
            source: this.isAppleTV ? 'Apple TV' : 'YouTube',
            url: window.location.href,
            videoTitle: document.title,
            created: new Date().toISOString(),
            
            // Enhanced multimedia data
            screenshot: await this.captureVideoScreenshot(),
            audioClip: await this.extractAudioClip(),
            context: this.getCurrentContext(),
            wordDefinitions: await this.getWordDefinitions(text)
        };
        
        // Show enhanced flashcard preview
        this.showFlashcardPreview(flashcardData);
        
        // Send to backend for saving
        try {
            const response = await fetch('http://localhost:8000/api/cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flashcardData)
            });
            
            if (response.ok) {
                this.showTooltip('Enhanced flashcard created! 🎉');
            } else {
                throw new Error('Backend save failed');
            }
        } catch (error) {
            console.log('Saving to local storage as fallback...');
            // Save locally as fallback
            chrome.runtime.sendMessage({
                action: 'saveEnhancedCard',
                card: flashcardData
            });
            this.showTooltip('Flashcard saved locally! 💾');
        }
    }
    
    async captureVideoScreenshot() {
        // Capture current video frame as screenshot
        if (!this.videoElement) return null;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth || 320;
            canvas.height = this.videoElement.videoHeight || 240;
            
            ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64 data URL
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            console.log('📸 Screenshot captured!');
            return dataURL;
            
        } catch (error) {
            console.log('Screenshot capture failed:', error);
            return null;
        }
    }
    
    async extractAudioClip() {
        // Extract audio segment from current subtitle timing
        // Note: Real audio extraction would require MediaRecorder API or server-side processing
        // For demo, we'll create a reference to the audio segment
        
        if (!this.videoElement) return null;
        
        const currentTime = this.videoElement.currentTime;
        const clipStart = Math.max(0, currentTime - 2); // 2 seconds before
        const clipEnd = Math.min(this.videoElement.duration, currentTime + 3); // 3 seconds after
        
        return {
            startTime: clipStart,
            endTime: clipEnd,
            videoUrl: window.location.href,
            note: 'Audio segment timing - playback requires original video'
        };
    }
    
    getCurrentContext() {
        // Get surrounding subtitle context for better learning
        const currentText = this.currentSubtitle;
        
        return {
            before: 'Previous subtitle context...',
            current: currentText,
            after: 'Next subtitle context...',
            fullSentence: currentText,
            grammarNotes: this.getGrammarNotes(currentText)
        };
    }
    
    getGrammarNotes(text) {
        // Basic Hawaiian grammar insights
        const notes = [];
        
        if (text.includes('aloha')) {
            notes.push('aloha: multifunctional word - hello, goodbye, love');
        }
        if (text.includes('ʻohana')) {
            notes.push('ʻohana: family concept central to Hawaiian culture');
        }
        if (text.includes('kai')) {
            notes.push('kai: ocean/sea - essential element in Hawaiian life');
        }
        
        return notes;
    }
    
    async getWordDefinitions(text) {
        // Get detailed definitions for each word
        const words = text.split(/\s+/).filter(w => w.trim());
        const definitions = {};
        
        for (const word of words) {
            const definition = await this.getWordDefinition(word, false);
            if (definition && !definition.includes('not available')) {
                definitions[word] = definition;
            }
        }
        
        return definitions;
    }
    
    showFlashcardPreview(cardData) {
        // Show enhanced flashcard preview (Migaku-style)
        const preview = document.createElement('div');
        preview.id = 'rlvr-flashcard-preview';
        preview.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(30, 30, 30, 0.95));
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(25px);
            box-shadow: 0 16px 50px rgba(0, 0, 0, 0.7);
            z-index: 1000003;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            max-width: 500px;
            min-width: 400px;
        `;
        
        preview.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #60A5FA; display: flex; align-items: center;">
                    🎯 Enhanced Flashcard Preview
                </h3>
                <button id="close-preview" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            
            <div style="margin-bottom: 16px; text-align: center;">
                ${cardData.screenshot ? `<img src="${cardData.screenshot}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px;" alt="Video screenshot">` : ''}
            </div>
            
            <div style="background: rgba(59, 130, 246, 0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px; color: #FFF;">
                    "${cardData.front}"
                </div>
                <div style="font-size: 16px; color: #60A5FA;">
                    ${cardData.back}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 14px;">
                <div>
                    <strong>Source:</strong> ${cardData.source}
                </div>
                <div>
                    <strong>Time:</strong> ${cardData.timestamp}
                </div>
                <div style="grid-column: 1 / -1;">
                    <strong>Audio Clip:</strong> ${cardData.audioClip ? `${(cardData.audioClip.endTime - cardData.audioClip.startTime).toFixed(1)}s segment` : 'Not available'}
                </div>
            </div>
            
            ${Object.keys(cardData.wordDefinitions).length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <strong style="color: #60A5FA;">Word Definitions:</strong>
                    <div style="font-size: 13px; margin-top: 8px;">
                        ${Object.entries(cardData.wordDefinitions).map(([word, def]) => 
                            `<div style="margin: 4px 0;"><strong>${word}:</strong> ${def}</div>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
                <button id="save-flashcard" style="background: #22C55E; border: none; color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    💾 Save Flashcard
                </button>
                <button id="edit-flashcard" style="background: #3B82F6; border: none; color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ✏️ Edit
                </button>
                <button id="cancel-flashcard" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(preview);
        
        // Preview event listeners
        document.getElementById('close-preview').addEventListener('click', () => {
            document.body.removeChild(preview);
        });
        
        document.getElementById('save-flashcard').addEventListener('click', () => {
            this.showTooltip('Enhanced flashcard saved! 🎉');
            document.body.removeChild(preview);
        });
        
        document.getElementById('edit-flashcard').addEventListener('click', () => {
            this.showFlashcardEditor(cardData);
            document.body.removeChild(preview);
        });
        
        document.getElementById('cancel-flashcard').addEventListener('click', () => {
            document.body.removeChild(preview);
        });
    }
    
    showFlashcardEditor(cardData) {
        // Advanced flashcard editor
        this.showTooltip('Flashcard editor - Coming soon! ✨');
    }
    
    // Add keyboard shortcut for quick flashcard creation
    addFlashcardKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F for flashcard creation
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && this.currentSubtitle) {
                e.preventDefault();
                this.createEnhancedFlashcard(this.currentSubtitle, 'Translation...');
            }
            
            // Escape to close any open panels
            if (e.key === 'Escape') {
                const preview = document.getElementById('rlvr-flashcard-preview');
                const settings = document.getElementById('rlvr-settings-panel');
                if (preview) document.body.removeChild(preview);
                if (settings) document.body.removeChild(settings);
            }
        });
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new RLVRSubtitleOverlay();
    });
} else {
    new RLVRSubtitleOverlay();
}