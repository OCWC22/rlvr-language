// RLVR Language Gym - Simple Hawaiian Translation Interface
document.addEventListener('DOMContentLoaded', function() {
    // Hawaiian subtitles from Chief of War
    const hawaiianData = [
        { time: "21:38-21:41", hawaiian: "I mea aha kou kiʻi ʻana mai iā mākou?", english: "What does it mean that you are showing us (your image)?" },
        { time: "21:43-21:44", hawaiian: "Kū aʻe ka puʻu make no ke aupuni o mākou.", english: "The deadly hill rose up for our kingdom." },
        { time: "21:47-21:49", hawaiian: "Wānana maila nā kāula o mākou", english: "Then our stars foretold (our seers foresaw)" },
        { time: "21:50-21:53", hawaiian: "i ka hoʻokauā ʻia ihola o ko mākou poʻe", english: "When our people were finally summoned downward" },
        { time: "21:54-21:55", hawaiian: "ma lalo o ka noho aliʻi o Oʻahu.", english: "Below the royal seat of Oʻahu." }
    ];
    
    let currentIndex = 0;
    
    // Show first subtitle immediately
    showSubtitle(hawaiianData[currentIndex]);
    
    // Cycle through Hawaiian subtitles every 4 seconds
    setInterval(() => {
        currentIndex = (currentIndex + 1) % hawaiianData.length;
        showSubtitle(hawaiianData[currentIndex]);
    }, 4000);
    
    function showSubtitle(subtitle) {
        // Update header with Hawaiian word
        document.getElementById('currentWord').textContent = subtitle.hawaiian.split(' ')[0] + '...';
        document.getElementById('currentReading').textContent = subtitle.time;
        
        // Update stars based on text complexity
        const complexity = Math.min(5, Math.max(1, Math.ceil(subtitle.hawaiian.length / 20)));
        updateStars(complexity);
        
        // Update content with clean Hawaiian to English translation
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="context-sentence">
                <div class="japanese-text">${subtitle.hawaiian}</div>
                <div class="english-text">${subtitle.english}</div>
            </div>
            
            <div class="ai-explanation">
                <div class="explanation-text">
                    Hawaiian dialogue from Chief of War - ${subtitle.time}
                </div>
            </div>
        `;
    }
    
    function updateStars(difficulty) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.classList.toggle('filled', index < difficulty);
        });
    }
    
    function setupEventListeners() {
        // No interactive elements needed - auto-cycling Hawaiian subtitles
    }
});