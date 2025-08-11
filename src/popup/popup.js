// RLVR Language Gym - Modern Learning Interface
document.addEventListener('DOMContentLoaded', async function() {
    let learningData = {};
    let currentWord = 'aloha';
    
    // Load learning data
    await loadLearningData();
    
    // Initialize interface
    updateDisplay();
    setupEventListeners();
    
    async function loadLearningData() {
        try {
            const response = await fetch('../data/learning-data.json');
            learningData = await response.json();
        } catch (error) {
            // Fallback Hawaiian vocabulary data
            learningData = {
                vocabulary: {
                    'aloha': {
                        hawaiian: 'Aloha',
                        pronunciation: 'ah-loh-hah',
                        english: 'hello/goodbye/love',
                        difficulty: 2,
                        status: 'unknown',
                        context: 'Aloha kakahiaka! How are you today?',
                        translation: 'Good morning! How are you today?',
                        ai_explanation: '"Aloha" is a Hawaiian word that means both "hello" and "goodbye," but it carries much deeper meaning. It represents love, peace, and compassion - the spirit of living in harmony with others and nature.'
                    }
                }
            };
        }
    }
    
    function updateDisplay() {
        const wordData = learningData.vocabulary[currentWord];
        if (!wordData) return;
        
        // Update header
        document.getElementById('currentWord').textContent = wordData.hawaiian;
        document.getElementById('currentReading').textContent = wordData.pronunciation;
        
        // Update difficulty stars
        updateStars(wordData.difficulty);
        
        // Update content
        updateContent(wordData);
        
        // Update status buttons
        updateStatusButtons(wordData.status);
    }
    
    function updateStars(difficulty) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.classList.toggle('filled', index < difficulty);
        });
    }
    
    function updateContent(wordData) {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class=\"context-sentence\">
                <div class=\"japanese-text\">${wordData.context}</div>
                <div class=\"english-text\">${wordData.translation}</div>
            </div>
            
            <div class=\"ai-explanation\">
                What does this word mean in context?
                <div class=\"explanation-text\">
                    ${wordData.ai_explanation || 'Click for AI explanation...'}
                </div>
            </div>
        `;
    }
    
    function updateStatusButtons(status) {
        document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        
        if (status === 'track') document.getElementById('trackBtn').classList.add('active');
        else if (status === 'learning') document.getElementById('learningBtn').classList.add('active');
        else document.getElementById('unknownBtn').classList.add('active');
    }
    
    function setupEventListeners() {
        // Simple translate button
        document.getElementById('translateBtn').addEventListener('click', requestTranslation);
        
        // Icon bar
        document.getElementById('textIcon').addEventListener('click', () => switchMode('text'));
        document.getElementById('chatIcon').addEventListener('click', () => switchMode('chat'));
    }
    
    function setStatus(status) {
        learningData.vocabulary[currentWord].status = status;
        updateStatusButtons(status);
        saveData();
    }
    
    async function requestTranslation() {
        try {
            // Get current tab and request current subtitle from content script
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getCurrentTime'
            });
            
            if (response && response.currentSub) {
                // Update display with current subtitle info
                document.getElementById('currentWord').textContent = response.currentSub.hawaiian.split(' ')[0] + '...';
                document.getElementById('currentReading').textContent = response.currentSub.time;
                
                // Update content with translation
                const contentArea = document.getElementById('contentArea');
                contentArea.innerHTML = `
                    <div class="context-sentence">
                        <div class="japanese-text">${response.currentSub.hawaiian}</div>
                        <div class="english-text">${response.currentSub.english}</div>
                    </div>
                `;
                
                // Visual feedback
                const btn = document.getElementById('translateBtn');
                btn.textContent = 'TRANSLATED!';
                btn.style.background = '#00d4aa';
                setTimeout(() => {
                    btn.textContent = 'TRANSLATE';
                    btn.style.background = '';
                }, 2000);
            } else {
                // No current subtitle
                const btn = document.getElementById('translateBtn');
                btn.textContent = 'NO SUBTITLE';
                setTimeout(() => {
                    btn.textContent = 'TRANSLATE';
                }, 2000);
            }
        } catch (error) {
            console.error('Translation request failed:', error);
        }
    }
    
    function clearSelection() {
        setStatus('unknown');
        // Reset to default state
        updateDisplay();
    }
    
    function switchMode(mode) {
        document.querySelectorAll('.icon').forEach(icon => icon.classList.remove('active'));
        document.getElementById(mode + 'Icon').classList.add('active');
        
        if (mode === 'chat') {
            showAIExplanation();
        }
    }
    
    function showAIExplanation() {
        const wordData = learningData.vocabulary[currentWord];
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class=\"ai-chat\">
                <div class=\"question\">Explain with ChatGPT</div>
                <div class=\"chat-response\">
                    <strong>What does this word mean in context?</strong><br><br>
                    ${wordData.ai_explanation}
                </div>
            </div>
        `;
    }
    
    function saveData() {
        chrome.storage.local.set({ learningData });
    }
});