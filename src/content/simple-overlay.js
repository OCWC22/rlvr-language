// RLVR Simple Hawaiian Overlay - ONE BUTTON ONLY
class SimpleHawaiianOverlay {
    constructor() {
        this.hawaiianSubtitles = [
            { time: "21:38-21:41", start: 1318, end: 1321, hawaiian: "I mea aha kou ki'i 'ana mai iā mākou?", english: "What does it mean that you are showing us (your image)?" },
            { time: "21:43-21:44", start: 1323, end: 1324, hawaiian: "Kū a'ela ka pu'u make no ke aupuni o mākou.", english: "The deadly hill rose up for our kingdom." },
            { time: "21:47-21:49", start: 1327, end: 1329, hawaiian: "Wānana maila nā kāula o mākou", english: "Then our stars foretold (our seers foresaw)." },
            { time: "21:50-21:53", start: 1330, end: 1333, hawaiian: "i ka ho'okauā 'ia ihola o ko mākou po'e", english: "When our people were finally summoned downward." },
            { time: "21:54-21:55", start: 1334, end: 1335, hawaiian: "ma lalo o ka noho ali'i o O'ahu.", english: "Below the royal seat of O'ahu." },
            { time: "21:58-22:03", start: 1338, end: 1343, hawaiian: "A wahi a nā kiu, pālua paha ko lākou pū'ali koa i ko mākou.", english: "And according to the chiefs, their army may have been twice ours." },
            { time: "22:05-22:08", start: 1345, end: 1348, hawaiian: "No ke aha e holo mai ai ko O'ahu e kaua mai iā 'oukou?", english: "Why is it that O'ahu is coming to wage war against you?" },
            { time: "22:10-22:12", start: 1350, end: 1352, hawaiian: "He 'ōpio ka mō'ī, 'o Hahana.", english: "The king is young—it is Hahana." },
            { time: "22:13-22:16", start: 1353, end: 1356, hawaiian: "Ua kūpa'a mau 'o ia ma hope o ka Mō'ī Kahekili.", english: "He has remained steadfast following King Kahekili." },
            { time: "22:17-22:20", start: 1357, end: 1360, hawaiian: "A ua waiho wale akula ko Maui i ko ia ala aupuni.", english: "And Maui abandoned his throne on that course of rule." }
        ];
        
        this.currentSub = null;
        this.video = null;
        this.button = null;
        
        this.init();
    }
    
    init() {
        this.findVideo();
        this.createSubtitleOverlay();
        this.createButton();
        this.startTracking();
        this.setupMessageListener();
        console.log('🌺 Simple Hawaiian overlay ready');
    }
    
    findVideo() {
        // Find video on Apple TV page
        this.video = document.querySelector('video');
        if (!this.video) {
            // Try again after a delay for Apple TV
            setTimeout(() => {
                this.video = document.querySelector('video');
                if (this.video) {
                    console.log('🎥 Apple TV video found');
                }
            }, 2000);
        }
    }
    
    createButton() {
        // Remove any existing button
        const existing = document.getElementById('hawaiian-explain-btn');
        if (existing) existing.remove();
        
        // Create ONE simple button
        this.button = document.createElement('button');
        this.button.id = 'hawaiian-explain-btn';
        this.button.textContent = 'Translate';
        this.button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: none;
        `;
        
        // Click handler - just show simple translation
        this.button.addEventListener('click', () => {
            this.showTranslation();
        });
        
        document.body.appendChild(this.button);
    }
    
    createSubtitleOverlay() {
        // Remove any existing overlay
        const existing = document.getElementById('hawaiian-subtitle-overlay');
        if (existing) existing.remove();
        
        // Create subtitle overlay positioned over video
        this.subtitleOverlay = document.createElement('div');
        this.subtitleOverlay.id = 'hawaiian-subtitle-overlay';
        this.subtitleOverlay.style.cssText = `
            position: fixed;
            bottom: 15%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999998;
            text-align: center;
            pointer-events: none;
            max-width: 80%;
            display: none;
        `;
        
        this.subtitleOverlay.innerHTML = `
            <div id="hawaiian-line" class="line">
                <div id="hawaiian-text"></div>
                <div id="english-text"></div>
            </div>
        `;
        
        // Add RLVR subtitle styling
        const style = document.createElement('style');
        style.textContent = `
            /* RLVR Language Gym - Subtitle Overlay Styles */
            #hawaiian-subtitle-overlay {
                position: fixed;
                pointer-events: none;
                z-index: 2147483647;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding: 0 4%;
                text-align: center;
            }

            #hawaiian-line.line {
                font-size: clamp(16px, 3.2vw, 34px);
                line-height: 1.35;
                color: #fff;
                text-shadow: 0 0 3px #000, 0 0 6px #000;
                background: rgba(0,0,0,0.25);
                border-radius: 6px;
                padding: .25em .5em;
                margin-bottom: 3%;
                max-width: 80%;
                word-wrap: break-word;
                position: relative;
            }

            #hawaiian-text {
                font-weight: bold;
                margin-bottom: 4px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }

            #english-text {
                font-size: 0.8em;
                color: #cccccc;
                font-weight: 400;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }

            /* RLVR branding */
            #hawaiian-line.line::after {
                content: '';
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                background: #3B82F6;
                border-radius: 50%;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.subtitleOverlay);
    }
    
    startTracking() {
        setInterval(() => {
            if (this.video) {
                const currentTime = Math.floor(this.video.currentTime);
                const subtitle = this.hawaiianSubtitles.find(sub => 
                    currentTime >= sub.start && currentTime <= sub.end
                );
                
                if (subtitle) {
                    if (subtitle !== this.currentSub) {
                        this.currentSub = subtitle;
                        this.updateSubtitleDisplay(subtitle);
                        this.button.style.display = 'block';
                        this.button.textContent = `${subtitle.time}`;
                    }
                } else {
                    this.hideSubtitleDisplay();
                    this.button.style.display = 'none';
                    this.currentSub = null;
                }
            }
        }, 100);
    }
    
    updateSubtitleDisplay(subtitle) {
        const hawaiianEl = document.getElementById('hawaiian-text');
        const englishEl = document.getElementById('english-text');
        
        if (hawaiianEl && englishEl) {
            hawaiianEl.textContent = subtitle.hawaiian;
            englishEl.textContent = subtitle.english;
            this.subtitleOverlay.style.display = 'block';
        }
    }
    
    hideSubtitleDisplay() {
        if (this.subtitleOverlay) {
            this.subtitleOverlay.style.display = 'none';
        }
    }
    
    setupMessageListener() {
        // Listen for messages from popup requesting current time/subtitle
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getCurrentTime') {
                if (this.video) {
                    sendResponse({
                        currentTime: this.video.currentTime,
                        currentSub: this.currentSub
                    });
                } else {
                    sendResponse({ currentTime: null, currentSub: null });
                }
                return true;
            }
        });
    }
    
    showTranslation() {
        if (!this.currentSub) return;
        
        // Remove existing popup
        const existing = document.getElementById('hawaiian-popup');
        if (existing) existing.remove();
        
        // Create simple translation popup
        const popup = document.createElement('div');
        popup.id = 'hawaiian-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            max-width: 320px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #3b82f6;
        `;
        
        popup.innerHTML = `
            <div style="text-align: right; margin-bottom: 12px;">
                <span style="color: #3b82f6; font-size: 12px; font-weight: 600;">${this.currentSub.time}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; margin-left: 8px;">✕</button>
            </div>
            <div style="margin-bottom: 12px;">
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 6px;">${this.currentSub.hawaiian}</div>
                <div style="font-size: 14px; color: #ccc;">${this.currentSub.english}</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (popup.parentNode) popup.remove();
        }, 5000);
    }
}

// Start simple overlay
new SimpleHawaiianOverlay();