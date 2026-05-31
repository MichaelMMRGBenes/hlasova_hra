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
let upgrades = { scarf: false, gloves: false, hat: false, boots: false, coat: false, pet: false, snowman: false, igloo: false, aurora: false };
let topScores = [];
let jumpAnimationProgress = 0;
let healEffectTimer = 0; // Časovač efektu uzdravení

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

// --- INICIALIZACE ---
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

// --- DYNAMICKÝ OBCHOD (Vždy přesně 3 položky) ---
function getAvailableShopItems() {
    const allItems = [
        { id: 'scarf', name: 'Hřejivá šála (+1 ❤️ MAX)', cost: 5, icon: '🧣' },
        { id: 'gloves', name: 'Rukavice (+1 ❤️ MAX)', cost: 5, icon: '🧤' },
        { id: 'hat', name: 'Zimní čepice (+1 ❤️ MAX)', cost: 10, icon: '🧢' },
        { id: 'boots', name: 'Zimní boty (+1 ❤️ MAX)', cost: 8, icon: '🥾' },
        { id: 'coat', name: 'Teplý kabát (+2 ❤️ MAX)', cost: 15, icon: '🧥' },
        { id: 'pet', name: 'Tučňák (Pomocník nápovědy)', cost: 25, icon: '🐧' },
        { id: 'snowman', name: 'Sněhulák na kře (Okrasa)', cost: 12, icon: '☃️' },
        { id: 'igloo', name: 'Ledové Iglú (Okrasa)', cost: 18, icon: '⛺' },
        { id: 'aurora', name: 'Polární záře (Magické nebe)', cost: 30, icon: '🌌' }
    ];

    let available = allItems.filter(item => !upgrades[item.id]);
    return available.slice(0, 3);
}

function exitShopToNewRound() {
    gameState = 'setup';
    if (window.speechSynthesis) window.speechSynthesis.cancel(); 

    const statusEl = document.getElementById('game2-status');
    const bubbleEl = document.getElementById('game2-bubble-display');
    if (statusEl) { statusEl.textContent = "❄️ Připrav se na další kru..."; statusEl.style.display = 'block'; }
    if (bubbleEl) { bubbleEl.textContent = "Soustřeď se, poslech začíná..."; bubbleEl.style.display = 'block'; }
    
    setTimeout(() => {
        if (gameActive) startNewRound();
    }, 2400); // Dostatečná pauza, aby se vyčistila audio pipeline
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
    healEffectTimer = 0;
    upgrades = { scarf: false, gloves: false, hat: false, boots: false, coat: false, pet: false, snowman: false, igloo: false, aurora: false };
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

    if (roundNumber > 9) {
        let extraNumbers = Math.floor((roundNumber - 9) / 5) + 1;
        seqLength += extraNumbers;
    }

    let maxNumber = 10;
    if (roundNumber > 18) maxNumber = 999;
    else if (roundNumber > 15) maxNumber = 500;
    else if (roundNumber > 12) maxNumber = 250;
    else if (roundNumber > 9) maxNumber = 100;
    else if (roundNumber > 6) maxNumber = 50;
    else if (roundNumber > 3) maxNumber = 20;

    targetSequence = [];
    for (let i = 0; i < seqLength; i++) {
        let num;
        do {
            num = Math.floor(Math.random() * maxNumber) + 1;
        } while (i > 0 && num === targetSequence[i - 1]);
        targetSequence.push(num);
    }

    playAuditorySequence();
}

async function playAuditorySequence() {
    if (!gameActive) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // 🚨 FIX: Klíčová bezpečnostní pauza, aby měl prohlížeč čas zaregistrovat audio kanál po zavření obchodu
    await delay(800); 

    const statusEl = document.getElementById('game2-status');
    const bubbleEl = document.getElementById('game2-bubble-display');

    // VÝPOČET DYNAMICKÉHO ZRYCHLENÍ DIKTOVÁNÍ
    let threshold = difficulty === 'easy' ? 7 : (difficulty === 'hard' ? 9 : 8);
    let targetSpeed = 0.82;
    if (targetSequence.length >= threshold) {
        targetSpeed += (targetSequence.length - threshold) * 0.08;
        if (targetSpeed > 1.40) targetSpeed = 1.40; // Horní strop zrychlení
    }

    for (let i = 0; i < targetSequence.length; i++) {
        if (!gameActive) return;
        let num = targetSequence[i];
        
        let speedNotice = targetSpeed > 0.82 ? "⚡ Zrychleno! " : "";
        if (statusEl) statusEl.textContent = `🔊 ${speedNotice}Poslouchej sekvenci... (${i + 1}/${targetSequence.length})`;
        if (bubbleEl) bubbleEl.textContent = "🎵 ???";

        await speakNumberPromise(num, langA, targetSpeed);
        await delay(600); 
    }

    if (!gameActive) return;
    gameState = 'listening';
    if (statusEl) statusEl.textContent = "🎤 Teď ty! Zopakuj sekvenci ve správném pořadí...";
    
    if (bubbleEl) {
        if (upgrades.pet) {
            bubbleEl.textContent = `Mluvte... 🐧 Tučňák ti napovídá 1. číslo: ${targetSequence[0]}`;
        } else {
            bubbleEl.textContent = "Mluvte...";
        }
    }

    if (recognition) {
        recognition.lang = langB;
        try { recognition.start(); } catch(e){}
    }

    if (silenceTimeout) clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(() => {
        evaluateUserAnswer();
    }, 8000);
}

function speakNumberPromise(num, lang, speedRate) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve();
        let word = (num <= 10 && languageWords[lang]) ? languageWords[lang][num] : num.toString();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = speedRate;

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
        let petHint = upgrades.pet ? `🐧 (Nápověda: 1. je ${targetSequence[0]}) | ` : "";
        bubbleEl.textContent = `${petHint}Slyším: "${text.trim()}"`;
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
        
        // REGENERACE ŽIVOTA KAŽDOU DRUHOU KRU + VIZUÁLNÍ EFEKT
        if (roundNumber % 2 === 0) {
            if (lives < maxLives) {
                lives++;
                healEffectTimer = 90; // Trvání animace v počtu framů
            }
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
        let inputName = prompt(`Konec hry! Dosáhl jsi ${roundNumber}. kola se skóre ${score} bodů.\nZadej své jméno pro uložení do TOP 10:`, "");
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
    const currentShopItems = getAvailableShopItems();

    let targetIdx = -1;
    if (key === 'a') targetIdx = 0; 
    if (key === 'w') targetIdx = 1; 
    if (key === 'd') targetIdx = 2; 

    if (targetIdx !== -1 && targetIdx < currentShopItems.length) {
        let item = currentShopItems[targetIdx];
        if (coins >= item.cost) {
            coins -= item.cost;
            upgrades[item.id] = true;
            
            if (item.id === 'coat') {
                maxLives += 2; lives += 2;
            } else if (item.id !== 'pet' && item.id !== 'snowman' && item.id !== 'igloo' && item.id !== 'aurora') {
                maxLives++; lives++;
            }
            exitShopToNewRound();
        }
    }

    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); 
        exitShopToNewRound();
    }

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
        const currentShopItems = getAvailableShopItems();
        const cardWidth = 140;
        const cardHeight = 110;
        const cardY = activeCanvas.height / 2 - 50; 
        const totalCards = currentShopItems.length;
        const spacing = totalCards > 0 ? (activeCanvas.width - (totalCards * cardWidth)) / (totalCards + 1) : activeCanvas.width / 2;

        let successfullyPurchased = false;

        currentShopItems.forEach((item, idx) => {
            let itemX = spacing + idx * (cardWidth + spacing);
            if (mouseX >= itemX && mouseX <= itemX + cardWidth &&
                mouseY >= cardY && mouseY <= cardY + cardHeight) {
                
                if (coins >= item.cost) {
                    coins -= item.cost;
                    upgrades[item.id] = true;
                    
                    if (item.id === 'coat') {
                        maxLives += 2; lives += 2;
                    } else if (item.id !== 'pet' && item.id !== 'snowman' && item.id !== 'igloo' && item.id !== 'aurora') {
                        maxLives++; lives++;
                    }
                    successfullyPurchased = true;
                }
            }
        });

        if (successfullyPurchased) {
            exitShopToNewRound();
            return;
        }

        let nextBtnW = 240; let nextBtnH = 38;
        let nextBtnX = activeCanvas.width / 2 - nextBtnW / 2;
        let nextBtnY = cardY + cardHeight + 20;
        if (mouseX >= nextBtnX && mouseX <= nextBtnX + nextBtnW && mouseY >= nextBtnY && mouseY <= nextBtnY + nextBtnH) {
            exitShopToNewRound();
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

    requestAnimationFrame(gameRenderLoop);

    if (gameState === 'highscore') {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f1c40f"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "rgba(241, 196, 15, 0.3)"; ctx.shadowBlur = 8;
        ctx.fillText("🏆 SÍŇ SLÁVY - TOP 10 🏆", canvas.width / 2, 45);
        ctx.shadowBlur = 0; // Reset stínu

        let startY = 100; let rowH = 26;
        if (topScores.length === 0) {
            topScores = JSON.parse(localStorage.getItem('game2_highscores') || '[]').slice(0, 10);
        }
        topScores.forEach((entry, idx) => {
            let yPos = startY + idx * rowH;
            ctx.font = "15px sans-serif";
            ctx.fillStyle = idx === 0 ? "#f1c40f" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#cd7f32" : "#ffffff";
            ctx.textAlign = "left"; ctx.fillText(`${idx + 1}. ${entry.name}`, canvas.width / 2 - 160, yPos);
            ctx.textAlign = "right"; ctx.fillText(`${entry.score} b. (Kolo ${entry.round})`, canvas.width / 2 + 160, yPos);
        });

        let btnW = 240; let btnH = 42; let btnX = canvas.width / 2 - btnW / 2; let btnY = canvas.height - 55;
        ctx.fillStyle = "#3498db"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(btnX, btnY, btnW, btnH, 6) : ctx.fillRect(btnX, btnY, btnW, btnH); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Zpět do hlavního menu", canvas.width / 2, btnY + 26);
        return;
    }

    if (gameState === 'shop') {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("❄️ POLÁRNÍ OBCHOD - VYBAV SE! ❄️", canvas.width / 2, 35);
        ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "#f1c40f";
        ctx.fillText(`Tvoje peněženka: 🪙 ${coins} mincí`, canvas.width / 2, 62);

        const currentShopItems = getAvailableShopItems();
        const cardWidth = 145; const cardHeight = 115; const cardY = canvas.height / 2 - 45; 
        const totalCards = currentShopItems.length;
        const spacing = totalCards > 0 ? (canvas.width - (totalCards * cardWidth)) / (totalCards + 1) : canvas.width / 2;

        if (totalCards === 0) {
            ctx.fillStyle = "#48bb78"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("🎉 Vše zakoupeno! Jsi naprostý vládce Arktidy!", canvas.width / 2, cardY + 40);
        }

        currentShopItems.forEach((item, idx) => {
            let itemX = spacing + idx * (cardWidth + spacing);
            ctx.fillStyle = "#94a3b8"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
            const keysHint = ["Klávesa [A]", "Klávesa [W]", "Klávesa [D]"];
            ctx.fillText(keysHint[idx], itemX + cardWidth / 2, cardY - 10);

            // Vylepšený design karet v obchodě stínováním a zářením
            ctx.fillStyle = "#1e293b"; ctx.strokeStyle = coins >= item.cost ? "#3b82f6" : "#475569"; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(itemX, cardY, cardWidth, cardHeight, 8) : ctx.fillRect(itemX, cardY, cardWidth, cardHeight);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(item.name, itemX + cardWidth / 2, cardY + 24);
            ctx.font = "32px sans-serif"; ctx.fillText(item.icon, itemX + cardWidth / 2, cardY + 66);
            ctx.font = "bold 13px sans-serif"; ctx.fillStyle = coins >= item.cost ? "#f59e0b" : "#ef4444";
            ctx.fillText(`Cena: 🪙 ${item.cost}`, itemX + cardWidth / 2, cardY + 100);
        });

        let nextBtnW = 250; let nextBtnH = 40; let nextBtnX = canvas.width / 2 - nextBtnW / 2; let nextBtnY = cardY + cardHeight + 25;
        ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH, 6) : ctx.fillRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Vstoupit na novou kru [Mezerník] ➔", canvas.width / 2, nextBtnY + 25);

        let quitBtnW = 250; let quitBtnH = 40; let quitBtnX = canvas.width / 2 - quitBtnW / 2; let quitBtnY = nextBtnY + nextBtnH + 12;
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(quitBtnX, quitBtnY, quitBtnW, quitBtnH, 6) : ctx.fillRect(quitBtnX, quitBtnY, quitBtnW, quitBtnH); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.fillText("Opustit hru [Esc]", canvas.width / 2, quitBtnY + 25);
        return;
    }

    // --- DYNAMICKÁ POLÁRNÍ ZÁŘE ---
    if (upgrades.aurora) {
        // Základní tmavá noční obloha
        let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, "#060b14");
        skyGrad.addColorStop(0.6, "#0b1528");
        skyGrad.addColorStop(1, "#1e293b");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vlnění polární záře (Screen blending)
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        let time = Date.now() * 0.0012;

        // Vlna 1: Jasně zelená / smaragdová
        ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= canvas.width; x += 15) {
            let y = 45 + Math.sin(x * 0.008 + time) * 22 + Math.cos(x * 0.004 + time * 0.6) * 12;
            ctx.lineTo(x, y + 65);
        }
        ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();

        // Vlna 2: Tyrkysová / azurová podpora
        ctx.fillStyle = "rgba(6, 182, 212, 0.16)";
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= canvas.width; x += 15) {
            let y = 60 + Math.sin(x * 0.012 - time * 0.8) * 28;
            ctx.lineTo(x, y + 75);
        }
        ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();

        // Vlna 3: Magická purpurová hloubka
        ctx.fillStyle = "rgba(139, 92, 246, 0.14)";
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= canvas.width; x += 15) {
            let y = 35 + Math.cos(x * 0.006 + time * 1.3) * 18;
            ctx.lineTo(x, y + 55);
        }
        ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();

        ctx.restore();
    } else {
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Horní lišta HUDu
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
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
            ctx.save(); ctx.translate(drawX, baseY);
            drawFloeIce(cracksForThisFloe); drawFloeSignpost(i);
            ctx.restore();
        }
        let jumpArcY = -Math.sin(jumpAnimationProgress * Math.PI) * JUMP_HEIGHT;
        drawPlayer(PLAYER_X_BASE, PLAYER_Y_BASE + jumpArcY);
    } else {
        for (let i = roundNumber - 1; i < roundNumber + 3; i++) {
            let targetX = i * FLOE_X_SPACING + centerX;
            let currentCameraX = (roundNumber - 1) * FLOE_X_SPACING;
            let drawX = targetX - currentCameraX;
            let cracksForThisFloe = (i === roundNumber - 1) ? visualCracks : 0;
            ctx.save(); ctx.translate(drawX, baseY);
            drawFloeIce(cracksForThisFloe); drawFloeSignpost(i);
            ctx.restore();
        }
        let bobbing = Math.sin(Date.now() * 0.004) * 3;
        drawPlayer(PLAYER_X_BASE, PLAYER_Y_BASE + bobbing);
    }

    // VYKRESLENÍ GRAFICKÉHO EFEKTU UZDRAVENÍ
    if (healEffectTimer > 0) {
        healEffectTimer--;
        ctx.save();
        ctx.fillStyle = "#10b981"; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "#000000"; ctx.shadowBlur = 4;
        let alpha = Math.min(1, healEffectTimer / 30);
        ctx.globalAlpha = alpha;
        let floatY = (90 - healEffectTimer) * 0.4;
        ctx.fillText("💚 +1 ŽIVOT (Mrazivé vyléčení!) 💚", PLAYER_X_BASE, PLAYER_Y_BASE - 65 - floatY);
        ctx.restore();
    }

    // --- HUD TEXTY (S LEPŠÍM STÍNEM PRO ČITELNOST NA SNĚHU) ---
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 3;
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "#f59e0b";
    ctx.fillText(`🪙 Mince: ${coins}`, 15, 25);
    ctx.fillStyle = "#ffffff"; ctx.fillText(`Kolo: ${roundNumber}`, 125, 25); ctx.fillText(`Skóre: ${score} b.`, 125, 45);

    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "right"; 
    const flagMap = { 'cs-CZ': '🇨🇿 CZ', 'en-US': '🇺🇸 EN', 'de-DE': '🇩🇪 DE', 'fr-FR': '🇫🇷 FR', 'es-ES': '🇪🇸 ES', 'fi-FI': '🇫🇮 FI' };
    ctx.fillText(`🎧 ${flagMap[langA] || langA}  ➔  🗣️ ${flagMap[langB] || langB}`, canvas.width - 15, 68); 

    ctx.fillStyle = "#ffffff"; ctx.textAlign = "right"; ctx.font = "bold 14px sans-serif";
    let hearts = lives > 0 ? "❤️".repeat(lives) + "🖤".repeat(maxLives - lives) : "💀 UTOPEN";
    ctx.fillText(`Stabilita kry: ${hearts}`, canvas.width - 15, 25);

    ctx.font = "12px sans-serif"; ctx.fillStyle = "#cbd5e1";
    let currentLimit = roundNumber > 18 ? 999 : roundNumber > 15 ? 500 : roundNumber > 12 ? 250 : roundNumber > 9 ? 100 : roundNumber > 6 ? 50 : roundNumber > 3 ? 20 : 10;
    ctx.fillText(`Rozsah čísel: 1 - ${currentLimit}`, canvas.width - 15, 45);
    ctx.restore();
}

// --- POMOCNÉ VYKRESLOVACÍ FUNKCE ---
function drawFloeIce(cracks) {
    ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-110, -40); ctx.lineTo(100, -45); ctx.lineTo(140, 40); ctx.lineTo(-130, 50); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // PROGRESIVNÍ PRASKÁNÍ (AŽ DO 5 FÁZÍ)
    ctx.strokeStyle = "#334155";
    if (cracks >= 1) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-60, -30); ctx.lineTo(-20, 10); ctx.lineTo(-40, 45); ctx.stroke(); }
    if (cracks >= 2) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(80, -35); ctx.lineTo(30, -5); ctx.lineTo(50, 40); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(30, -5); ctx.stroke(); }
    if (cracks >= 3) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-10, -15); ctx.lineTo(15, 5); ctx.stroke(); }
    if (cracks >= 4) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-115, 10); ctx.lineTo(-70, 15); ctx.lineTo(-40, 45); stroke(); }
    if (cracks >= 5) { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(120, 10); ctx.lineTo(70, 20); ctx.lineTo(30, -5); ctx.stroke(); }

    // DOKOUPENÉ OKRASY PROSTŘEDÍ NA KŘE
    if (upgrades.snowman) {
        ctx.save(); ctx.translate(-75, 0);
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 15, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // Spodek
        ctx.beginPath(); ctx.arc(0, -1, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();  // Střed
        ctx.beginPath(); ctx.arc(0, -13, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();  // Hlava
        // Uhlíky (oči) a mrkev
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(-2, -14, 1, 0, Math.PI * 2); ctx.arc(2, -14, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-8, -12); ctx.lineTo(0, -11); ctx.fill();
        ctx.restore();
    }
    
    // ZVĚTŠENÉ A PROPRACIVANÉ POLÁRNÍ IGLÚ
    if (upgrades.igloo) {
        ctx.save(); ctx.translate(75, 5); // Pozice na pravé straně kry
        ctx.fillStyle = "#f1f5f9"; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2;
        
        // Hlavní velká kopule iglú
        ctx.beginPath(); ctx.arc(0, 20, 32, Math.PI, 0); ctx.fill(); ctx.stroke();
        
        // Vodorovné linie ledových cihel
        ctx.beginPath(); ctx.arc(0, 20, 22, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 20, 11, Math.PI, 0); ctx.stroke();
        
        // Svislé zářezy cihel (3D efekt struktury)
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-22, 4); ctx.lineTo(-32, 20); ctx.moveTo(22, 4); ctx.lineTo(32, 20);
        ctx.moveTo(-11, 11); ctx.lineTo(-15, 4); ctx.moveTo(11, 11); ctx.lineTo(15, 4);
        ctx.moveTo(0, 9); ctx.lineTo(0, -2);
        ctx.stroke();

        // 3D Vstupní tunel (předsíň iglú)
        ctx.fillStyle = "#e2e8f0"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-14, 20, 14, Math.PI, 0); ctx.fill(); ctx.stroke();
        
        // Temný vnitřek vchodu (stín uvnitř)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath(); ctx.arc(-14, 20, 9, Math.PI, 0); ctx.fill();
        
        ctx.restore();
    }
}

function drawFloeSignpost(floeIdx) {
    ctx.save(); ctx.translate(55, -20); ctx.fillStyle = "#7c2d12"; ctx.fillRect(-3, 0, 6, 22);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#334155"; ctx.lineWidth = 2;
    ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(-32, -18, 64, 18, 4); } else { ctx.fillRect(-32, -18, 64, 18); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1e293b"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`KRA ${floeIdx + 1}`, 0, -9); ctx.restore();
}

function drawPlayer(pX, pY) {
    if (gameState === 'game_over' || lives <= 0) {
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(PLAYER_X_BASE, PLAYER_Y_BASE + 25, 25, 0, Math.PI, true); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("SPLOUCH!", PLAYER_X_BASE, PLAYER_Y_BASE + 15);
        return;
    }

    // 1. Tělo panáčka (Bunda)
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pX - 12, pY - 5, 24, 26, 6) : ctx.fillRect(pX - 12, pY - 5, 24, 26); ctx.fill();
    
    // 2. Vylepšení oblečení (překrývá tělo)
    if (upgrades.boots) { 
        ctx.fillStyle = "#1e293b"; ctx.fillRect(pX - 13, pY + 18, 9, 5); ctx.fillRect(pX + 4, pY + 18, 9, 5); 
        ctx.fillStyle = "#475569"; ctx.fillRect(pX - 13, pY + 18, 6, 2); ctx.fillRect(pX + 4, pY + 18, 6, 2); 
    }
    if (upgrades.gloves) { 
        ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(pX - 15, pY + 10, 4.5, 0, Math.PI * 2); ctx.arc(pX + 15, pY + 10, 4.5, 0, Math.PI * 2); ctx.fill(); 
    }
    if (upgrades.coat) { 
        ctx.fillStyle = "#2563eb"; ctx.fillRect(pX - 13, pY + 2, 26, 16); 
        ctx.fillStyle = "#1d4ed8"; ctx.fillRect(pX - 2, pY + 2, 4, 16); 
    }
    if (upgrades.scarf) { 
        ctx.fillStyle = "#06b6d4"; ctx.fillRect(pX - 11, pY - 2, 22, 5); 
        ctx.fillStyle = "#0891b2"; ctx.fillRect(pX + 4, pY + 3, 5, 12); 
    }
    
    // 3. Vždy vykreslit hlavu (aby pod čepicí nebylo prázdno)
    ctx.fillStyle = "#fef08a"; ctx.beginPath(); ctx.arc(pX, pY - 13, 8.5, 0, Math.PI * 2); ctx.fill(); 
    
    // 4. Oči (kreslí se bezpečně na hlavu, čepice je nezatlačí dolů)
    ctx.fillStyle = "#0f172a"; 
    ctx.fillRect(pX - 4, pY - 15, 2, 3.5); 
    ctx.fillRect(pX + 2, pY - 15, 2, 3.5);
    
    // 5. Zimní čepice (pokud je koupená, sedí perfektně NA HLAVĚ a nezasahuje do očí)
    if (upgrades.hat) { 
        // Kupole čepice posunuta výš nad oči
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(pX, pY - 14, 8.5, Math.PI, 0); ctx.fill(); 
        // Bílý teplý lem čepice nad očima
        ctx.fillStyle = "#ffffff"; ctx.fillRect(pX - 10, pY - 16, 20, 4.5); 
        // Barevná bambule nahoře
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(pX, pY - 24, 4, 0, Math.PI * 2); ctx.fill(); 
    }
    
    // 6. Aktivní mazlíček (Hopsající tučňák)
    if (upgrades.pet) {
        let petBob = Math.sin(Date.now() * 0.006) * 2;
        ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pX + 22, pY + 5 + petBob, 14, 16, 4) : ctx.fillRect(pX + 22, pY + 5 + petBob, 14, 16); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.fillRect(pX + 25, pY + 9 + petBob, 8, 9);
        ctx.fillStyle = "#f97316"; ctx.fillRect(pX + 34, pY + 10 + petBob, 4, 3);
    }
}