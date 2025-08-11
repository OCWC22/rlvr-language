// RLVR Simple Hawaiian Overlay - ONE BUTTON ONLY
class SimpleHawaiianOverlay {
    constructor() {
        // DEFINITIVE Hawaiian-English translations from "Chief of War" - DO NOT MODIFY
        this.hawaiianSubtitles = [
            { time: "21:38-21:41", start: 1318, end: 1321, hawaiian: "I mea aha kou kiʻi ʻana mai iā mākou?", english: "What does it mean that you are showing us (your image)?" },
            { time: "21:43-21:44", start: 1323, end: 1324, hawaiian: "Kū aʻe ka puʻu make no ke aupuni o mākou.", english: "The deadly hill rose up for our kingdom." },
            { time: "21:47-21:49", start: 1327, end: 1329, hawaiian: "Wānana maila nā kāula o mākou", english: "Then our stars foretold (our seers foresaw)" },
            { time: "21:50-21:53", start: 1330, end: 1333, hawaiian: "i ka hoʻokauā ʻia ihola o ko mākou poʻe", english: "When our people were finally summoned downward" },
            { time: "21:54-21:55", start: 1334, end: 1335, hawaiian: "ma lalo o ka noho aliʻi o Oʻahu.", english: "Below the royal seat of Oʻahu." },
            { time: "21:58-22:03", start: 1338, end: 1343, hawaiian: "A wahi a nā kiu, pālua paha ko lākou pūʻali koa i ko mākou.", english: "And according to the chiefs, their army may have been twice ours." },
            { time: "22:05-22:08", start: 1345, end: 1348, hawaiian: "No ke aha e holo mai ai ko Oʻahu e kaua mai iā ʻoukou?", english: "Why is it that Oʻahu is coming to wage war against you?" },
            { time: "22:10-22:12", start: 1350, end: 1352, hawaiian: "He ʻōpio ka mōʻī, ʻo Hahana.", english: "The king is young—it is Hahana." },
            { time: "22:13-22:16", start: 1353, end: 1356, hawaiian: "Ua kūpaʻa mau ʻo ia ma hope o ka Mōʻī Kahekili.", english: "He has remained steadfast following King Kahekili." },
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
        this.startTracking();
        this.setupMessageListener();
        console.log('🌺 Hawaiian subtitle overlay ready');
    }
    
    findVideo() {
        // ONLY activate on Chief of War Apple TV page
        const expectedUrl = 'https://tv.apple.com/us/show/chief-of-war/umc.cmc.6ag0zq020ielwv7m83v8r4dkw';
        if (!window.location.href.includes('chief-of-war/umc.cmc.6ag0zq020ielwv7m83v8r4dkw')) {
            console.log('🌺 Not on Chief of War page, overlay disabled');
            return;
        }
        
        // Find video on Apple TV Chief of War page
        this.video = document.querySelector('video');
        if (!this.video) {
            // Try again after a delay for Apple TV
            setTimeout(() => {
                this.video = document.querySelector('video');
                if (this.video) {
                    console.log('🎥 Chief of War video found - Hawaiian overlay active');
                }
            }, 2000);
        } else {
            console.log('🎥 Chief of War video found - Hawaiian overlay active');
        }
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
                font-size: clamp(18px, 3.5vw, 36px);
                line-height: 1.4;
                color: #fff;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                background: rgba(0,0,0,0.7);
                border-radius: 8px;
                padding: 12px 20px;
                margin-bottom: 3%;
                max-width: 85%;
                word-wrap: break-word;
                position: relative;
                backdrop-filter: blur(4px);
                border: 1px solid rgba(255,255,255,0.1);
            }

            #hawaiian-text {
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                text-align: center;
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
        // FASTEST METHOD: Direct video.currentTime access every 100ms
        setInterval(() => {
            // Get video element directly - works on ALL streaming sites
            const video = document.querySelector('video');
            if (video && !video.paused) {
                const currentTime = Math.floor(video.currentTime);
                
                // Match against our Hawaiian subtitles
                const subtitle = this.hawaiianSubtitles.find(sub => 
                    currentTime >= sub.start && currentTime <= sub.end
                );
                
                if (subtitle && subtitle !== this.currentSub) {
                    this.currentSub = subtitle;
                    this.updateSubtitleDisplay(subtitle);
                    console.log(`🌺 Video at ${currentTime}s - Showing: ${subtitle.time}`);
                } else if (!subtitle && this.currentSub) {
                    this.hideSubtitleDisplay();
                    this.currentSub = null;
                }
            }
        }, 100); // 100ms = fast and efficient
    }
    
    updateSubtitleDisplay(subtitle) {
        const hawaiianEl = document.getElementById('hawaiian-text');
        const englishEl = document.getElementById('english-text');
        
        if (hawaiianEl && englishEl) {
            hawaiianEl.innerHTML = `${subtitle.hawaiian}<br><span style="color: #cccccc; font-size: 0.85em;">${subtitle.english}</span>`;
            this.subtitleOverlay.style.display = 'block';
            this.subtitleOverlay.style.opacity = '1';
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
    
}

// Initialize ONLY on Chief of War Apple TV page
const chiefOfWarUrl = 'chief-of-war/umc.cmc.6ag0zq020ielwv7m83v8r4dkw';

if (window.location.href.includes(chiefOfWarUrl)) {
    let overlay = null;
    
    function initOverlay() {
        if (!overlay) {
            overlay = new SimpleHawaiianOverlay();
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
        initOverlay();
    }
    
    // Reinitialize if user navigates within the show
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl && window.location.href.includes(chiefOfWarUrl)) {
            lastUrl = window.location.href;
            console.log('🌺 Navigation detected - reinitializing overlay');
            if (overlay) {
                overlay.findVideo(); // Refresh video element
            }
        }
    }, 1000);
} else {
    console.log('🌺 Hawaiian overlay only active on Chief of War episodes');
}