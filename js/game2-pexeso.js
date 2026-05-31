import { changeScreen } from './app.js';
import { checkAndConsumeCredit } from './credit-system.js';

// --- JAZYKOVÉ MAPY PRO VALIDACI SEKVENCOVÁNÍ ---
const languageMaps = {
    'cs-CZ': { 1: ['1', 'jeden', 'jedna'], 2: ['2', 'dva'], 3: ['3', 'tři'], 4: ['4', 'čtyři'], 5: ['5', 'pět'], 6: ['6', 'šest'], 7: ['7', 'sedm'], 8: ['8', 'osm'], 9: ['9', 'devět'], 10: ['10', 'deset'] },
    'en-US': { 1: ['1', 'one'], 2: ['2', 'two'], 3: ['3', 'three'], 4: ['4', 'four'], 5: ['5', 'five'], 6: ['6', 'six'], 7: ['7', 'seven'], 8: ['8', 'eight'], 9: ['9', 'nine'], 10: ['10', 'ten'] },
    'de-DE': { 1: ['1', 'eins', 'eine'], 2: ['2', 'zwei'], 3: ['3', 'drei'], 4: ['4', 'vier'], 5: ['5', 'fünf'], 6: ['6', 'sechs'], 7: ['7', 'sieben'], 8: ['8', 'acht'], 9: ['9', 'neun'], 10: ['10', 'zehn'] },
    'fr-FR': { 1: ['1', 'un', 'une'], 2: ['2', 'deux'], 3: ['3', 'trois'], 4: ['4', 'quatre'], 5: ['5', 'cinq'], 6: ['6', 'six'], 7: ['7', 'sept'], 8: ['8', 'huit'], 9: ['9', 'neuf'], 10: ['10', 'dix'] },
    'es-ES': { 1: ['1', 'uno'], 2: ['2', 'dos'], 3: ['3', 'tres'], 4: ['4', 'cuatro'], 5: ['5', 'cinco'], 6: ['6', 'seis'], 7: ['7', 'siete'], 8: ['8', 'ocho'], 9: ['9', 'nueve'], 10: ['10', 'diez'] },
    'fi-FI': { 1: ['1', 'yksi'], 2: ['2', 'kaksi'], 3: ['3', 'kolme'], 4: ['4', 'neljä'], 5: ['5', 'viisi'], 6: ['6', 'kuusi'], 7: ['7', 'seitsemän'], 8: ['8', 'kahdeksan'], 9: ['9', 'yhdeksän'], 10: ['10', 'kymmenen'] }
};

const languageWords = {
    'cs-CZ': ["", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět", "deset"],
    'en-US': ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
    'de-DE': ["", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn"],
    'fr-FR': ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"],
    'es-ES': ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"],
    'fi-FI': ["", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "seitsemän", "kahdeksan", "yhdeksän", "kymmenen"]
};

// --- HERNÍ STAV ---
let gameActive = false;
let gameState = 'setup'; 
let difficulty = 'medium'; 
let langA = 'en-US';
let langB = 'fi-FI';

let targetSequence = [];
let accumulatedTranscript = "";
let lives = 3;
let maxLives = 3; 
let score = 0;
let roundNumber = 1;

let visualCracks = 0; 
let coins = 12; 
let upgrades = { scarf: false, gloves: false, hat: false };
let topScores = [];
let jumpAnimationProgress = 0;

// LINEÁRNÍ SCROLLING ZLEVA DOPRAVA
const FLOE_X_SPACING = 350; 
const FLOE_Y_PERSPECTIVE_Y = 220; 
const PLAYER_X_BASE = 400; 
const PLAYER_Y_BASE = 195; 
const JUMP_HEIGHT = 50; 

let cameraX = 0; 

// --- CANVAS KONFIGURACE ---
let canvas = null;
let ctx = null;

// Hlasové rozhraní
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let silenceTimeout = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
        if (!gameActive || gameState !== 'listening') return;
        
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
                accumulatedTranscript += " " + e.results[i][0].transcript;
            } else {
                interim += " " + e.results[i][0].transcript;
            }
        }
        
        updateStatusDisplay(accumulatedTranscript + interim);
        
        if (silenceTimeout) clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
            evaluateUserAnswer();
        }, 1800);
    };

    recognition.onend = () => {
        if (gameActive && gameState === 'listening') {
            try { recognition.start(); } catch(e){}
        }
    };
}

// --- INICIALIZACE POMOCÍ DELEGOVÁNÍ ---
document.addEventListener('DOMContentLoaded', () => {
    populateLanguageSelects();

    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = window.speechSynthesis.getVoices;
    }

    const startBtn = document.getElementById('game2-start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame2);
    }

    const quitBtn = document.getElementById('game2-quit-btn');
    if (quitBtn) {
        quitBtn.addEventListener('click', terminateGame);
    }
});

// GLOBÁLNÍ ODCHYTÁVÁNÍ KLIKNUTÍ A KLÁVES
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'game2-canvas') {
        handleCanvasClick(e);
    }
});

document.addEventListener('keydown', (e) => {
    handleKeyDown(e);
});

function populateLanguageSelects() {
    const selects = ['game2-lang-a', 'game2-lang-b'];
    const langs = [
        { code: 'cs-CZ', label: 'Čeština' },
        { code: 'en-US', label: 'English' },
        { code: 'de-DE', label: 'Deutsch' },
        { code: 'fr-FR', label: 'Français' },
        { code: 'es-ES', label: 'Español' },
        { code: 'fi-FI', label: 'Suomi' }
    ];

    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = "";
            langs.forEach(l => {
                let opt = document.createElement('option');
                opt.value = l.code;
                opt.textContent = l.label;
                if (id === 'game2-lang-b' && l.code === 'fi-FI') opt.selected = true;
                if (id === 'game2-lang-a' && l.code === 'en-US') opt.selected = true;
                select.appendChild(opt);
            });
        }
    });
}

// --- LOGIKA HRY ---
async function startGame2() {
    const creditCheck = await checkAndConsumeCredit();
    if (!creditCheck.allowed) {
        alert("Vyčerpali jste volné kredity pro dnešní den.");
        changeScreen('screen-main');
        return;
    }

    canvas = document.getElementById('game2-canvas');
    ctx = canvas ? canvas.getContext('2d') : null;

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const wakeupUtterance = new SpeechSynthesisUtterance(" ");
        wakeupUtterance.volume = 0;
        window.speechSynthesis.speak(wakeupUtterance);
    }

    difficulty = document.getElementById('game2-difficulty').value || 'medium';
    langA = document.getElementById('game2-lang-a').value;
    langB = document.getElementById('game2-lang-b').value;

    maxLives = 3; 
    lives = 3;
    score = 0;
    roundNumber = 1;
    visualCracks = 0;
    upgrades = { scarf: false, gloves: false, hat: false };
    cameraX = 0;
    gameActive = true;

    changeScreen('screen-game2-play');
    
    const statusEl = document.getElementById('game2-status');
    const bubbleEl = document.getElementById('game2-bubble-display');
    if (statusEl) { statusEl.textContent = "❄️ Připrav se, první kra připlouvá..."; statusEl.style.display = 'block'; }
    if (bubbleEl) { bubbleEl.textContent = "Pozor, poslouchej..."; bubbleEl.style.display = 'block'; }

    requestAnimationFrame(gameRenderLoop);

    setTimeout(() => {
        if (gameActive) startNewRound();
    }, 2500);
}

function startNewRound() {
    gameState = 'playing_sequence';
    accumulatedTranscript = "";
    
    const statusEl = document.getElementById('game2-status');
    const bubbleEl = document.getElementById('game2-bubble-display');
    if (statusEl) statusEl.style.display = 'block';
    if (bubbleEl) bubbleEl.style.display = 'block';

    let seqLength = 4;
    if (difficulty === 'easy') seqLength = 3;
    if (difficulty === 'hard') seqLength = 5;

    let maxNumber = 10;
    if (roundNumber > 9) maxNumber = 100;
    else if (roundNumber > 6) maxNumber = 50;
    else if (roundNumber > 3) maxNumber = 20;

    targetSequence = [];
    for (let i = 0; i < seqLength; i++) {
        targetSequence.push(Math.floor(Math.random() * maxNumber) + 1);
    }

    playAuditorySequence();
}

async function playAuditorySequence() {
    if (!gameActive) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const statusEl = document.getElementById('game2-status');
    const bubbleEl = document.getElementById('game2-bubble-display');

    for (let i = 0; i < targetSequence.length; i++) {
        if (!gameActive) return;
        let num = targetSequence[i];
        
        if (statusEl) statusEl.textContent = `🔊 Poslouchej sekvenci... (${i + 1}/${targetSequence.length})`;
        if (bubbleEl) bubbleEl.textContent = "🎵 ???";

        await speakNumberPromise(num, langA);
        await delay(350); 
    }

    if (!gameActive) return;
    gameState = 'listening';
    if (statusEl) statusEl.textContent = "🎤 Teď ty! Zopakuj sekvenci ve správném pořadí...";
    if (bubbleEl) bubbleEl.textContent = "Mluvte...";

    if (recognition) {
        recognition.lang = langB;
        try { recognition.start(); } catch(e){}
    }

    if (silenceTimeout) clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(() => {
        evaluateUserAnswer();
    }, 8000);
}

function speakNumberPromise(num, lang) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve();
        let word = (num <= 10 && languageWords[lang]) ? languageWords[lang][num] : num.toString();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.85;

        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(voice => 
            voice.lang === lang || voice.lang.startsWith(lang.split('-')[0])
        );
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
}

function updateStatusDisplay(text) {
    const bubbleEl = document.getElementById('game2-bubble-display');
    if (bubbleEl && text.trim() && gameState === 'listening') {
        bubbleEl.textContent = `Slyším: "${text.trim()}"`;
    }
}

function evaluateUserAnswer() {
    if (gameState !== 'listening') return;
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (recognition) { try { recognition.stop(); } catch(e){} }

    let text = accumulatedTranscript.toLowerCase().replace(/[.,?!]/g, '').trim();
    let lastIndex = 0;
    let sequenceCorrect = true;

    for (let num of targetSequence) {
        let variants = (languageMaps[langB] && languageMaps[langB][num]) ? languageMaps[langB][num] : [num.toString()];
        let foundIndex = -1;

        for (let v of variants) {
            let idx = text.indexOf(v, lastIndex);
            if (idx !== -1) {
                foundIndex = idx;
                break;
            }
        }

        if (foundIndex !== -1) {
            lastIndex = foundIndex + 1;
        } else {
            sequenceCorrect = false;
            break;
        }
    }

    const bubbleEl = document.getElementById('game2-bubble-display');
    const statusEl = document.getElementById('game2-status');

    if (sequenceCorrect) {
        score += targetSequence.length;
        coins += targetSequence.length;
        
        if (lives < maxLives) {
            lives++;
        }

        if (bubbleEl) bubbleEl.textContent = "✨ SPRÁVNĚ! Skáčeš na další kru! ✨";
        
        gameState = 'jumping';
        jumpAnimationProgress = 0;

        setTimeout(() => {
            visualCracks = 0;
            roundNumber++;
            
            if ((roundNumber - 1) % 3 === 0) {
                gameState = 'shop';
                if (statusEl) { statusEl.textContent = ""; statusEl.style.display = 'none'; }
                if (bubbleEl) { bubbleEl.textContent = ""; bubbleEl.style.display = 'none'; }
                if (recognition) { try { recognition.stop(); } catch(e){} }
            } else {
                if (gameActive) startNewRound();
            }
        }, 1600);
    } else {
        lives--;
        visualCracks++;
        if (bubbleEl) bubbleEl.textContent = "💥 CHYBA! Kra praská!";
        
        if (lives <= 0) {
            gameState = 'game_over';
            handleGameEnd();
        } else {
            gameState = 'setup';
            setTimeout(() => {
                if (gameActive) startNewRound();
            }, 2500);
        }
    }
}

function handleGameEnd() {
    gameActive = false;
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (recognition) { try { recognition.stop(); } catch(e){} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    let playerName = "Anonymní tučňák";
    if (window.currentUser && window.currentUser.name) {
        playerName = window.currentUser.name;
    } else {
        let inputName = prompt(`Konec hry! Dosáhl jsi ${roundNumber}. kola se skóre ${score} bodů.\nZadej své jméno pro uložení do TOP 10 Síně slávy:`, "");
        if (inputName && inputName.trim()) {
            playerName = inputName.trim();
        }
    }

    let highscores = JSON.parse(localStorage.getItem('game2_highscores') || '[]');
    highscores.push({ name: playerName, score: score, round: roundNumber, date: new Date().toLocaleDateString() });
    highscores.sort((a, b) => b.score - a.score);
    topScores = highscores.slice(0, 10);
    localStorage.setItem('game2_highscores', JSON.stringify(topScores));

    gameState = 'highscore';
    gameActive = true; 
}

function handleKeyDown(e) {
    if (!gameActive || gameState !== 'shop') return;

    const key = e.key.toLowerCase();
    const items = [
        { id: 'scarf', cost: 5 },
        { id: 'gloves', cost: 5 },
        { id: 'hat', cost: 10 }
    ];

    let targetIdx = -1;
    if (key === 'a') targetIdx = 0; // Levý předmět (Šála)
    if (key === 'w') targetIdx = 1; // Prostřední předmět (Rukavice)
    if (key === 'd') targetIdx = 2; // Pravý předmět (Čepice)

    // Pokud stiskl platnou klávesu pro nákup
    if (targetIdx !== -1) {
        let item = items[targetIdx];
        if (!upgrades[item.id] && coins >= item.cost) {
            coins -= item.cost;
            upgrades[item.id] = true;
            maxLives++; 
            lives++; 
            
            gameState = 'setup';
            startNewRound();
        }
    }

    // Mezerník nebo Enter pro pokračování dál bez nákupu
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); // Zabrání scrollování stránky mezerníkem
        gameState = 'setup';
        startNewRound();
    }

    // Escape pro opuštění hry
    if (e.key === 'Escape') {
        terminateGame();
    }
}

function handleCanvasClick(e) {
    const activeCanvas = e.target;
    if (!activeCanvas) return;
    
    const rect = activeCanvas.getBoundingClientRect();
    const scaleX = activeCanvas.width / rect.width;
    const scaleY = activeCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (gameState === 'shop') {
        const cardWidth = 140;
        const cardHeight = 110;
        const cardY = activeCanvas.height / 2 - 50; 
        const spacing = (activeCanvas.width - (3 * cardWidth)) / 4;

        const items = [
            { id: 'scarf', cost: 5 },
            { id: 'gloves', cost: 5 },
            { id: 'hat', cost: 10 }
        ];

        let successfullyPurchased = false;

        items.forEach((item, idx) => {
            let itemX = spacing + idx * (cardWidth + spacing);
            if (mouseX >= itemX && mouseX <= itemX + cardWidth &&
                mouseY >= cardY && mouseY <= cardY + cardHeight) {
                
                if (!upgrades[item.id] && coins >= item.cost) {
                    coins -= item.cost;
                    upgrades[item.id] = true;
                    maxLives++; 
                    lives++; 
                    successfullyPurchased = true;
                }
            }
        });

        if (successfullyPurchased) {
            gameState = 'setup';
            startNewRound();
            return;
        }

        let nextBtnW = 240; let nextBtnH = 38;
        let nextBtnX = activeCanvas.width / 2 - nextBtnW / 2;
        let nextBtnY = cardY + cardHeight + 20;
        if (mouseX >= nextBtnX && mouseX <= nextBtnX + nextBtnW && mouseY >= nextBtnY && mouseY <= nextBtnY + nextBtnH) {
            gameState = 'setup';
            startNewRound();
            return;
        }

        let quitBtnW = 240; let quitBtnH = 38;
        let quitBtnX = activeCanvas.width / 2 - quitBtnW / 2;
        let quitBtnY = nextBtnY + nextBtnH + 12;
        if (mouseX >= quitBtnX && mouseX <= quitBtnX + quitBtnW && mouseY >= quitBtnY && mouseY <= quitBtnY + quitBtnH) {
            terminateGame();
            return;
        }
    }

    if (gameState === 'highscore') {
        let btnW = 220; let btnH = 40;
        let btnX = activeCanvas.width / 2 - btnW / 2;
        let btnY = activeCanvas.height - 50;
        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
            terminateGame();
        }
    }
}

function terminateGame() {
    gameActive = false;
    gameState = 'setup';
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (recognition) { try { recognition.stop(); } catch(e){} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    changeScreen('screen-main');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- CANVAS VYKRESLOVÁNÍ ---
function gameRenderLoop() {
    if (!ctx || !canvas || !gameActive) return;

    // OPRAVA: Naplánujeme další snímek ihned na začátku. 
    // Pokud stavy níže zavolají 'return;', smyčka se už nezastaví.
    requestAnimationFrame(gameRenderLoop);

    // --- SÍŇ SLÁVY ---
    if (gameState === 'highscore') {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#f3f4f6";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏆 SÍŇ SLÁVY - TOP 10 🏆", canvas.width / 2, 45);

        let startY = 95;
        let rowH = 24;

        if (topScores.length === 0) {
            topScores = JSON.parse(localStorage.getItem('game2_highscores') || '[]').slice(0, 10);
        }

        topScores.forEach((entry, idx) => {
            let yPos = startY + idx * rowH;
            ctx.font = "14px sans-serif";
            ctx.fillStyle = idx === 0 ? "#f1c40f" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#cd7f32" : "#ffffff";
            
            ctx.textAlign = "left";
            ctx.fillText(`${idx + 1}. ${entry.name}`, canvas.width / 2 - 160, yPos);
            ctx.textAlign = "right";
            ctx.fillText(`${entry.score} b. (Kolo ${entry.round})`, canvas.width / 2 + 160, yPos);
        });

        let btnW = 220; let btnH = 40;
        let btnX = canvas.width / 2 - btnW / 2;
        let btnY = canvas.height - 50;
        ctx.fillStyle = "#3498db";
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Zpět do hlavního menu", canvas.width / 2, btnY + 25);
        return;
    }

    // --- SEZÓNNÍ OBCHOD ---
    if (gameState === 'shop') {
        ctx.fillStyle = "#1a202c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("❄️ POLÁRNÍ OBCHOD - VYBAV SE! ❄️", canvas.width / 2, 35);
        
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f1c40f";
        ctx.fillText(`Tvoje peněženka: 🪙 ${coins} mincí`, canvas.width / 2, 62);

        const cardWidth = 140;
        const cardHeight = 110;
        const cardY = canvas.height / 2 - 50; 
        const spacing = (canvas.width - (3 * cardWidth)) / 4;

        const items = [
            { id: 'scarf', name: 'Hřejivá šála (+1 ❤️ MAX)', cost: 5, icon: '🧣' },
            { id: 'gloves', name: 'Rukavice (+1 ❤️ MAX)', cost: 5, icon: '🧤' },
            { id: 'hat', name: 'Polární čepice (+1 ❤️ MAX)', cost: 10, icon: '👑' }
        ];

        items.forEach((item, idx) => {
            let itemX = spacing + idx * (cardWidth + spacing);
            
            // Vizuální nápověda klávesy nad kartou
            if (!upgrades[item.id]) {
                ctx.fillStyle = "#cbd5e1";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                const keysHint = ["Klávesa [A]", "Klávesa [W]", "Klávesa [D]"];
                ctx.fillText(keysHint[idx], itemX + cardWidth / 2, cardY - 8);
            }

            ctx.fillStyle = upgrades[item.id] ? "#4a5568" : "#2d3748";
            ctx.strokeStyle = upgrades[item.id] ? "#a0aec0" : "#3182ce";
            ctx.lineWidth = 2;
            ctx.fillRect(itemX, cardY, cardWidth, cardHeight);
            ctx.strokeRect(itemX, cardY, cardWidth, cardHeight);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(item.name, itemX + cardWidth / 2, cardY + 22);
            ctx.font = "26px sans-serif";
            ctx.fillText(item.icon, itemX + cardWidth / 2, cardY + 60);

            ctx.font = "12px sans-serif";
            if (upgrades[item.id]) {
                ctx.fillStyle = "#48bb78";
                ctx.fillText("Zakoupeno ✔️", itemX + cardWidth / 2, cardY + 95);
            } else {
                ctx.fillStyle = coins >= item.cost ? "#f6e05e" : "#e53e3e";
                ctx.fillText(`Cena: 🪙 ${item.cost}`, itemX + cardWidth / 2, cardY + 95);
            }
        });

        // Tlačítko 1: Vstoupit na novou kru (Zelené)
        let nextBtnW = 240; let nextBtnH = 38;
        let nextBtnX = canvas.width / 2 - nextBtnW / 2;
        let nextBtnY = cardY + cardHeight + 20;
        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH, 6) : ctx.fillRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Vstoupit na novou kru [Mezerník] ➔", canvas.width / 2, nextBtnY + 24);

        // Tlačítko 2: Opustit hru (Červené)
        let quitBtnW = 240; let quitBtnH = 38;
        let quitBtnX = canvas.width / 2 - quitBtnW / 2;
        let quitBtnY = nextBtnY + nextBtnH + 12;
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(quitBtnX, quitBtnY, quitBtnW, quitBtnH, 6) : ctx.fillRect(quitBtnX, quitBtnY, quitBtnW, quitBtnH);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("Opustit hru [Esc]", canvas.width / 2, quitBtnY + 24);
        return;
    }

    // --- STANDARDNÍ SCÉNA (SKÁKÁNÍ ZLEVA DOPRAVA) ---
    ctx.fillStyle = "#1a365d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2a4365";
    ctx.fillRect(0, 0, canvas.width, 60);

    let centerX = PLAYER_X_BASE;
    let baseY = FLOE_Y_PERSPECTIVE_Y;

    if (gameState === 'jumping') {
        jumpAnimationProgress += 0.035; 
        if (jumpAnimationProgress > 1) jumpAnimationProgress = 1;
        
        let currentCameraX = (roundNumber - 1) * FLOE_X_SPACING + (jumpAnimationProgress * FLOE_X_SPACING);
        
        for (let i = roundNumber - 1; i < roundNumber + 3; i++) {
            let targetX = i * FLOE_X_SPACING + centerX;
            let drawX = targetX - currentCameraX;
            let cracksForThisFloe = (i === roundNumber - 1) ? visualCracks : 0;
            
            ctx.save();
            ctx.translate(drawX, baseY);
            drawFloeIce(cracksForThisFloe);
            drawFloeSignpost(i); 
            ctx.restore();
        }

        let jumpArcY = -Math.sin(jumpAnimationProgress * Math.PI) * JUMP_HEIGHT;
        let pY = PLAYER_Y_BASE + jumpArcY;
        drawPlayer(PLAYER_X_BASE, pY);
    } else {
        for (let i = roundNumber - 1; i < roundNumber + 3; i++) {
            let targetX = i * FLOE_X_SPACING + centerX;
            let currentCameraX = (roundNumber - 1) * FLOE_X_SPACING;
            let drawX = targetX - currentCameraX;
            let cracksForThisFloe = (i === roundNumber - 1) ? visualCracks : 0;
            
            ctx.save();
            ctx.translate(drawX, baseY);
            drawFloeIce(cracksForThisFloe);
            drawFloeSignpost(i); 
            ctx.restore();
        }

        let bobbing = Math.sin(Date.now() * 0.004) * 3;
        drawPlayer(PLAYER_X_BASE, PLAYER_Y_BASE + bobbing);
    }

    // --- HUD TEXTY ---
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`🪙 Mince: ${coins}`, 15, 25);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Kolo: ${roundNumber}`, 115, 25);
    ctx.fillText(`Skóre: ${score} b.`, 115, 45);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right"; 
    const flagMap = { 'cs-CZ': '🇨🇿 CZ', 'en-US': '🇺🇸 EN', 'de-DE': '🇩🇪 DE', 'fr-FR': '🇫🇷 FR', 'es-ES': '🇪🇸 ES', 'fi-FI': '🇫🇮 FI' };
    ctx.fillText(`🎧 ${flagMap[langA] || langA}  ➔  🗣️ ${flagMap[langB] || langB}`, canvas.width - 15, 65); 

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    let hearts = lives > 0 ? "❤️".repeat(lives) + "🖤".repeat(maxLives - lives) : "💀 UTOPEN";
    ctx.fillText(`Stabilita kry: ${hearts}`, canvas.width - 15, 25);

    let currentLimit = roundNumber > 9 ? 100 : roundNumber > 6 ? 50 : roundNumber > 3 ? 20 : 10;
    ctx.fillText(`Rozsah čísel: 1 - ${currentLimit}`, canvas.width - 15, 45);
}

// --- POMOCNÉ VYKRESLOCACÍ FUNKCE ---
function drawFloeIce(cracks) {
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#90cdf4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-110, -40);
    ctx.lineTo(100, -45);
    ctx.lineTo(140, 40);
    ctx.lineTo(-130, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (cracks >= 1) {
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-60, -30);
        ctx.lineTo(-20, 10);
        ctx.lineTo(-40, 45);
        ctx.stroke();
    }
    if (cracks >= 2) {
        ctx.beginPath();
        ctx.moveTo(80, -35);
        ctx.lineTo(30, -5);
        ctx.lineTo(50, 40);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 10);
        ctx.lineTo(30, -5);
        ctx.stroke();
    }
}

function drawFloeSignpost(floeIdx) {
    ctx.save();
    ctx.translate(55, -20); 
    ctx.fillStyle = "#795548"; 
    ctx.fillRect(-3, 0, 6, 22);
    ctx.fillStyle = "#ffffff"; 
    ctx.strokeStyle = "#334155"; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(-32, -18, 64, 18, 4); } else { ctx.fillRect(-32, -18, 64, 18); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1e293b"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`KRA ${floeIdx + 1}`, 0, -9);
    ctx.restore();
}

function drawPlayer(pX, pY) {
    if (gameState === 'game_over' || lives <= 0) {
        ctx.fillStyle = "#3182ce"; ctx.beginPath(); ctx.arc(PLAYER_X_BASE, PLAYER_Y_BASE + 25, 25, 0, Math.PI, true); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("SPLOUCH!", PLAYER_X_BASE, PLAYER_Y_BASE + 15);
        return;
    }
    ctx.fillStyle = "#e53e3e"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pX - 12, pY - 5, 24, 26, 6) : ctx.fillRect(pX - 12, pY - 5, 24, 26); ctx.fill();
    if (upgrades.gloves) { ctx.fillStyle = "#2d3748"; ctx.beginPath(); ctx.arc(pX - 15, pY + 10, 4, 0, Math.PI * 2); ctx.arc(pX + 15, pY + 10, 4, 0, Math.PI * 2); ctx.fill(); }
    if (upgrades.scarf) { ctx.fillStyle = "#31bafc"; ctx.fillRect(pX - 11, pY - 2, 22, 5); ctx.fillStyle = "#1d8cf8"; ctx.fillRect(pX + 4, pY + 3, 5, 11); }
    if (upgrades.hat) { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(pX, pY - 12, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#9b59b6"; ctx.beginPath(); ctx.moveTo(pX - 9, pY - 14); ctx.lineTo(pX - 5, pY - 22); ctx.lineTo(pX, pY - 16); ctx.lineTo(pX + 5, pY - 22); ctx.lineTo(pX + 9, pY - 14); ctx.closePath(); ctx.fill(); } else { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(pX, pY - 12, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#000000"; ctx.fillRect(pX - 4, pY - 15, 2, 3); ctx.fillRect(pX + 2, pY - 15, 2, 3);
}