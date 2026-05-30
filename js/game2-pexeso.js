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
    'fi-FI': ["", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "sieben", "kahdeksan", "yhdeksän", "kymmenen"]
};

// --- HERNÍ STAV ---
let gameActive = false;
let gameState = 'setup'; // 'setup', 'playing_sequence', 'listening', 'game_over', 'victory'
let difficulty = 'medium'; // easy (3), medium (4), hard (5)
let langA = 'en-US';
let langB = 'fi-FI';

let targetSequence = [];
let accumulatedTranscript = "";
let lives = 3;
let score = 0;
let roundNumber = 1;

// --- CANVAS KONFIGURACE ---
const canvas = document.getElementById('game2-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

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
        
        // Restartování časovače ticha při každém zachyceném slovu
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

// --- INICIALIZACE DROPDOWNŮ A MENU ---
document.addEventListener('DOMContentLoaded', () => {
    populateLanguageSelects();

    const startBtn = document.getElementById('game2-start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame2);
    }

    // Odchytení tlačítka zpět z herní obrazovky
    const quitBtn = document.getElementById('game2-quit-btn');
    if (quitBtn) {
        quitBtn.addEventListener('click', terminateGame);
    }
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

    // Načtení nastavení z UI
    difficulty = document.getElementById('game2-difficulty').value || 'medium';
    langA = document.getElementById('game2-lang-a').value;
    langB = document.getElementById('game2-lang-b').value;

    lives = 3;
    score = 0;
    roundNumber = 1;
    gameActive = true;

    changeScreen('screen-game2-play');
    startNewRound();
    requestAnimationFrame(gameRenderLoop);
}

function startNewRound() {
    gameState = 'playing_sequence';
    accumulatedTranscript = "";
    
    // Určení délky sekvence podle obtížnosti
    let seqLength = 4;
    if (difficulty === 'easy') seqLength = 3;
    if (difficulty === 'hard') seqLength = 5;

    // Generování náhodných čísel (1 až 10)
    targetSequence = [];
    for (let i = 0; i < seqLength; i++) {
        targetSequence.push(Math.floor(Math.random() * 10) + 1);
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
        await delay(300); // Mezera mezi čísly
    }

    // Přepnutí do režimu naslouchání
    if (!gameActive) return;
    gameState = 'listening';
    if (statusEl) statusEl.textContent = "🎤 Teď ty! Řekni celou sekvenci ve správném pořadí...";
    if (bubbleEl) bubbleEl.textContent = "Mluvte...";

    if (recognition) {
        recognition.lang = langB;
        try { recognition.start(); } catch(e){}
    }

    // Automatický timeout, pokud hráč dlouho mlčí úplně na začátku
    if (silenceTimeout) clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(() => {
        evaluateUserAnswer();
    }, 7000);
}

function speakNumberPromise(num, lang) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve();
        let word = (num <= 10 && languageWords[lang]) ? languageWords[lang][num] : num.toString();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.85;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
}

function updateStatusDisplay(text) {
    const bubbleEl = document.getElementById('game2-bubble-display');
    if (bubbleEl && text.trim()) {
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

    // Kontrola, zda text obsahuje všechny správné prvky za sebou ve správném pořadí
    for (let num of targetSequence) {
        let variants = languageMaps[langB][num];
        let foundIndex = -1;

        for (let v of variants) {
            let idx = text.indexOf(v, lastIndex);
            if (idx !== -1) {
                foundIndex = idx;
                break;
            }
        }

        if (foundIndex !== -1) {
            // Posuneme index, abychom příští číslo hledali až ZA tímto slovem
            lastIndex = foundIndex + 1;
        } else {
            sequenceCorrect = false;
            break;
        }
    }

    const bubbleEl = document.getElementById('game2-bubble-display');

    if (sequenceCorrect) {
        score += targetSequence.length;
        roundNumber++;
        if (bubbleEl) bubbleEl.textContent = "✨ SPRÁVNĚ! ✨";
        gameState = 'setup';
        setTimeout(() => {
            if (gameActive) startNewRound();
        }, 2000);
    } else {
        lives--;
        if (bubbleEl) bubbleEl.textContent = "💥 CHYBA! Kra praská!";
        
        if (lives <= 0) {
            gameState = 'game_over';
            handleGameEnd(false);
        } else {
            gameState = 'setup';
            setTimeout(() => {
                if (gameActive) startNewRound();
            }, 2500);
        }
    }
}

function handleGameEnd(isVictory) {
    gameActive = false;
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (recognition) { try { recognition.stop(); } catch(e){} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setTimeout(() => {
        alert(`Konec hry! Vaše skóre je: ${score} bodů. (Došli jste do ${roundNumber}. kola)`);
        terminateGame();
    }, 2000);
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

// --- CANVAS RENDERING (GRAFIKA KRY A PRASKLIN) ---
function gameRenderLoop() {
    if (!ctx || !canvas || !gameActive) return;

    // Vyčištění plátna (studená arktická voda)
    ctx.fillStyle = "#1a365d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vykreslení horizontu / ledového pozadí
    ctx.fillStyle = "#2a4365";
    ctx.fillRect(0, 0, canvas.width, 60);

    // Centrování objektů na plátně
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2 + 20;

    // Vykreslení ledové kry (Polygon)
    ctx.save();
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#90cdf4";
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.moveTo(centerX - 110, centerY - 40);
    ctx.lineTo(centerX + 100, centerY - 45);
    ctx.lineTo(centerX + 140, centerY + 40);
    ctx.lineTo(centerX - 130, centerY + 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Vykreslení prasklin podle počtu poškození (3 - lives)
    let damage = 3 - lives;
    if (damage >= 1) {
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - 60, centerY - 30);
        ctx.lineTo(centerX - 20, centerY + 10);
        ctx.lineTo(centerX - 40, centerY + 45);
        ctx.stroke();
    }
    if (damage >= 2) {
        ctx.beginPath();
        ctx.moveTo(centerX + 80, centerY - 35);
        ctx.lineTo(centerX + 30, centerY - 5);
        ctx.lineTo(centerX + 50, centerY + 40);
        ctx.stroke();
        
        // Spojovací středová trhlina
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY + 10);
        ctx.lineTo(centerX + 30, centerY - 5);
        ctx.stroke();
    }

    // Vykreslení panáčka (Hráče)
    let playerY = centerY - 25;
    if (gameState === 'game_over' || lives <= 0) {
        // Pád do vody! (Vykreslí se cákanec místo panáčka)
        playerY = centerY + 65;
        ctx.fillStyle = "#3182ce";
        ctx.beginPath();
        ctx.arc(centerX, playerY, 25, 0, Math.PI, true);
        ctx.fill();
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SPLOUCH!", centerX, playerY - 10);
    } else {
        // Klasická animace stojícího panáčka (jemné houpání)
        let bobbing = Math.sin(Date.now() * 0.004) * 3;
        let pX = centerX;
        let pY = playerY + bobbing;

        // Stín
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.ellipse(pX, pY + 25, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tělo / Zimní bunda
        ctx.fillStyle = "#e53e3e"; 
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(pX - 12, pY - 5, 24, 26, 6) : ctx.fillRect(pX - 12, pY - 5, 24, 26);
        ctx.fill();

        // Hlava / Čepice
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath();
        ctx.arc(pX, pY - 12, 8, 0, Math.PI * 2);
        ctx.fill();

        // Oči (pohled dopředu)
        ctx.fillStyle = "#000000";
        ctx.fillRect(pX - 4, pY - 15, 2, 3);
        ctx.fillRect(pX + 2, pY - 15, 2, 3);
    }

    // Vykreslení HUD statistik přímo na Canvas
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Kolo: ${roundNumber}`, 15, 25);
    ctx.fillText(`Skóre: ${score} b.`, 15, 45);

    ctx.textAlign = "right";
    let hearts = lives > 0 ? "❤️".repeat(lives) + "🖤".repeat(3 - lives) : "💀 UTOPEN";
    ctx.fillText(`Stabilita kry: ${hearts}`, canvas.width - 15, 25);

    if (gameActive) {
        requestAnimationFrame(gameRenderLoop);
    }
}