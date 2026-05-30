import { checkAndConsumeCredit } from './credit-system.js';
import { db } from './firebase-config.js';

// --- LOKALIZACE A UI DICTIONARY ---
let currentUILang = localStorage.getItem('ui_lang') || 'cs';
const uiTexts = {
    cs: {
        diffEasy: "Lehká", diffMed: "Střední", diffHard: "Těžká",
        trackShort: "7 překážek", trackMed: "15 překážek", trackLong: "30 překážek",
        modeClassic: "Klasické čtení", modeTrans: "Tlumočení / Překlad",
        btnBack: "Zpět", btnBackMain: "Hlavní menu", soloLabel: "Sólo:", roomLabel: "Místnost:",
        statusReady: "Připraveno...", statusReadyStart: "Můžete odstartovat!", statusWaitHost: "Čekání na hostitele...",
        statusGo: "BĚŽ!", statusHearing: "Slyším:", statusListening: "Mluvte...", statusKick: "Zakopnutí!", statusKO: "Vyřazen!",
        winnerText: "Vítězství!", loserText: "Porážka! Vyhrál:", badgeFinished: "Cíl", badgeEliminated: "K.O.", badgeNotFinished: "Nedoběhl"
    },
    fi: {
        diffEasy: "Helppo", diffMed: "Keskitaso", diffHard: "Vaikea",
        trackShort: "7 aitaa", trackMed: "15 aitaa", trackLong: "30 aitaa",
        modeClassic: "Klassinen luku", modeTrans: "Käännös",
        btnBack: "Takaisin", btnBackMain: "Päävalikko", soloLabel: "Yksinpeli:", roomLabel: "Huone:",
        statusReady: "Valmis...", statusReadyStart: "Voit aloittaa!", statusWaitHost: "Odotetaan isäntää...",
        statusGo: "JUOKSE!", statusHearing: "Kuulen:", statusListening: "Puhu...", statusKick: "Kompastuminen!", statusKO: "Eliminoitu!",
        winnerText: "Voitto!", loserText: "Häviö! Voittaja:", badgeFinished: "Maali", badgeEliminated: "K.O.", badgeNotFinished: "Keskeytti"
    },
    en: {
        diffEasy: "Easy", diffMed: "Medium", diffHard: "Hard",
        trackShort: "7 Hurdles", trackMed: "15 Hurdles", trackLong: "30 Hurdles",
        modeClassic: "Classic Reading", modeTrans: "Translation Mode",
        btnBack: "Back", btnBackMain: "Main Menu", soloLabel: "Solo:", roomLabel: "Room:",
        statusReady: "Ready...", statusReadyStart: "Ready to Start!", statusWaitHost: "Waiting for host...",
        statusGo: "GO!", statusHearing: "Hearing:", statusListening: "Listening...", statusKick: "Tripped!", statusKO: "K.O.!",
        winnerText: "Victory!", loserText: "Defeat! Winner:", badgeFinished: "Finished", badgeEliminated: "K.O.", badgeNotFinished: "DNF"
    }
};

function setUILanguage(lang) {
    const targetLang = lang || currentUILang;
    currentUILang = ['cs', 'fi', 'en'].includes(targetLang) ? targetLang : 'en';
    const t = uiTexts[currentUILang];
    if (!t) return;

    document.querySelectorAll('.btn-back').forEach(el => el.textContent = t.btnBack);
    document.querySelectorAll('.btn-back-main').forEach(el => el.textContent = t.btnBackMain);
    if(!gameStarted && statusEl) statusEl.textContent = t.statusReady;
}

// --- RENDER & GAMEPLAY CONFIG ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const START_WORLD_X = 120;
const STEP_X = 110;       
let stepsToFinish = 15; 
let FINISH_LINE_WORLD_X = START_WORLD_X + (stepsToFinish * STEP_X);

const playerColors = ["#3498db", "#e74c3c", "#9b59b6", "#e67e22"];

const languageMaps1To10 = {
    'cs-CZ': { 1: ['1', 'jeden', 'jedna'], 2: ['2', 'dva'], 3: ['3', 'tři'], 4: ['4', 'čtyři'], 5: ['5', 'pět'], 6: ['6', 'šest'], 7: ['7', 'sedm'], 8: ['8', 'osm'], 9: ['9', 'devět'], 10: ['10', 'deset'] },
    'en-US': { 1: ['1', 'one'], 2: ['2', 'two'], 3: ['3', 'three'], 4: ['4', 'four'], 5: ['5', 'five'], 6: ['6', 'six'], 7: ['7', 'seven'], 8: ['8', 'eight'], 9: ['9', 'nine'], 10: ['10', 'ten'] },
    'de-DE': { 1: ['1', 'eins', 'eine'], 2: ['2', 'zwei'], 3: ['3', 'drei'], 4: ['4', 'vier'], 5: ['5', 'fünf'], 6: ['6', 'sechs'], 7: ['7', 'sieben'], 8: ['8', 'acht'], 9: ['9', 'neun'], 10: ['10', 'zehn'] },
    'fr-FR': { 1: ['1', 'un', 'une'], 2: ['2', 'deux'], 3: ['3', 'trois'], 4: ['4', 'quatre'], 5: ['5', 'cinq'], 6: ['6', 'six'], 7: ['7', 'sept'], 8: ['8', 'huit'], 9: ['9', 'neuf'], 10: ['10', 'dix'] },
    'es-ES': { 1: ['1', 'uno'], 2: ['2', 'dos'], 3: ['3', 'tres'], 4: ['4', 'cuatro'], 5: ['5', 'cinco'], 6: ['6', 'seis'], 7: ['7', 'siete'], 8: ['8', 'ocho'], 9: ['9', 'nueve'], 10: ['10', 'diez'] },
    'fi-FI': { 1: ['1', 'yksi'], 2: ['2', 'kaksi'], 3: ['3', 'kolme'], 4: ['4', 'neljä'], 5: ['5', 'viisi'], 6: ['6', 'kuusi'], 7: ['7', 'seitsemän'], 8: ['8', 'kahdeksan'], 9: ['9', 'yhdeksän'], 10: ['10', 'kymmenen'] }
};

const languageWordsText = {
    'cs-CZ': ["", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět", "deset"],
    'en-US': ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
    'de-DE': ["", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn"],
    'fr-FR': ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"],
    'es-ES': ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"],
    'fi-FI': ["", "yksi", "kaksi", "kolme", "neljä", "viisi", "kuusi", "seitsemän", "kahdeksan", "yhdeksän", "kymmenen"]
};

// --- GLOBÁLNÍ STAV ---
let gameMode = 'solo'; 
let currentModeType = 'translation'; 
let langA = 'en-US';
let langB = 'fi-FI';

let roomRef = null;
let myRole = 'p1'; 
let botInterval = null;
let tripTimeout = null; 
let lastSpokenNumber = 0; 

let myState = { score: 0, lives: 3, currentNumber: 0, state: 'running', y: 0, jumpProgress: 0, worldX: START_WORLD_X, name: "Běžec" };
let remotePlayers = {}; 
let gameStarted = false;

const statusEl = document.getElementById('status');
const numberEl = document.getElementById('number-display');
const repeatBtn = document.getElementById('repeat-voice-btn');
const startMatchBtn = document.getElementById('start-match-btn');
const hudContainer = document.getElementById('hud-players-container');

// --- NAVIGACE & DOM EVENTY ---
document.getElementById('main-choose-solo').addEventListener('click', () => window.changeScreen('screen-game1-mode'));
document.getElementById('game1-btn-solo').addEventListener('click', () => window.changeScreen('screen-solo-setup'));
document.getElementById('game1-btn-multi').addEventListener('click', () => window.changeScreen('screen-online-setup'));

document.getElementById('game-mode-type-solo').addEventListener('change', (e) => {
    document.getElementById('solo-lang-b-box').style.display = (e.target.value === 'translation') ? 'block' : 'none';
});
document.getElementById('game-mode-type-online').addEventListener('change', (e) => {
    document.getElementById('online-lang-b-box').style.display = (e.target.value === 'translation') ? 'block' : 'none';
});

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => window.changeScreen('screen-main'));
});
document.querySelectorAll('.btn-back-main, #game1-quit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        resetGameEngine();
        window.changeScreen('screen-main');
    });
});

// START SÓLO REŽIMU
document.getElementById('solo-start-game-btn').addEventListener('click', () => {
    gameMode = 'solo'; myRole = 'p1';
    currentModeType = document.getElementById('game-mode-type-solo').value;
    langA = document.getElementById('lang-select-solo-a').value;
    let bSelect = document.getElementById('lang-select-solo-b').value;
    langB = (currentModeType === 'translation') ? bSelect : langA;

    stepsToFinish = parseInt(document.getElementById('track-length-solo').value);
    FINISH_LINE_WORLD_X = START_WORLD_X + (stepsToFinish * STEP_X);

    myState.name = document.getElementById('player-name-input').value.trim() || "Ty";
    remotePlayers = { 'bot': { score: 0, lives: 3, state: 'running', y: 0, jumpProgress: 0, worldX: START_WORLD_X, name: "AI Bot" } };

    window.changeScreen('screen-game');
    document.getElementById('room-id-display').textContent = `${uiTexts[currentUILang].soloLabel} ${currentModeType.toUpperCase()}`;
    startMatchBtn.style.display = 'inline-block';
    statusEl.textContent = uiTexts[currentUILang].statusReady;
    renderHUD();
});

// --- MULTIPLAYER LOGIKA VIA FIREBASE ---
document.getElementById('create-room-execute-btn').addEventListener('click', async () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    gameMode = 'online'; myRole = 'p1';
    
    currentModeType = document.getElementById('game-mode-type-online').value;
    langA = document.getElementById('lang-select-online-a').value;
    let bSelect = document.getElementById('lang-select-online-b').value;
    langB = (currentModeType === 'translation') ? bSelect : langA;
    stepsToFinish = parseInt(document.getElementById('track-length-online').value);

    let chosenName = document.getElementById('player-name-input').value.trim() || "Hostitel";
    myState = { score: 0, lives: 3, currentNumber: getRandomTargetNumber(), state: 'running', y: 0, jumpProgress: 0, worldX: START_WORLD_X, name: chosenName };

    roomRef = db.ref('rooms/' + code);
    await roomRef.set({
        status: 'waiting',
        currentModeType: currentModeType,
        langA: langA,
        langB: langB,
        stepsToFinish: stepsToFinish,
        p1: myState
    });

    initMultiplayerLobby(code);
});

document.getElementById('join-room-execute-btn').addEventListener('click', async () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if(!code) return alert("Zadej platný kód místnosti!");

    roomRef = db.ref('rooms/' + code);
    const snapshot = await roomRef.once('value');
    if(!snapshot.exists()) return alert("Místnost neexistuje!");
    
    const roomData = snapshot.val();
    if(roomData.status !== 'waiting') return alert("Závod již odstartoval nebo skončil.");

    gameMode = 'online'; myRole = 'p2'; // Zjednodušeno pro 2 hráče
    currentModeType = roomData.currentModeType;
    langA = roomData.langA;
    langB = roomData.langB;
    stepsToFinish = roomData.stepsToFinish;

    let chosenName = document.getElementById('player-name-input').value.trim() || "Host";
    myState = { score: 0, lives: 3, currentNumber: roomData.p1.currentNumber, state: 'running', y: 0, jumpProgress: 0, worldX: START_WORLD_X, name: chosenName };

    await roomRef.child('p2').set(myState);
    initMultiplayerLobby(code);
});

function initMultiplayerLobby(code) {
    window.changeScreen('screen-game');
    document.getElementById('room-id-display').textContent = `${uiTexts[currentUILang].roomLabel} ${code}`;
    
    if(myRole === 'p1') {
        startMatchBtn.style.display = 'inline-block';
        statusEl.textContent = uiTexts[currentUILang].statusReadyStart;
    } else {
        startMatchBtn.style.display = 'none';
        statusEl.textContent = uiTexts[currentUILang].statusWaitHost;
    }

    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return;

        // Synchronizace ostatních hráčů
        Object.keys(data).forEach(key => {
            if(key !== myRole && (key === 'p1' || key === 'p2')) {
                remotePlayers[key] = data[key];
            }
        });

        // Hromadný odstartování hostitelem
        if(data.status === 'started' && !gameStarted) {
            FINISH_LINE_WORLD_X = START_WORLD_X + (stepsToFinish * STEP_X);
            executeStart(true);
        }

        renderHUD();
        if(gameStarted) checkWinConditions();
    });
}

// --- ENGINE HRY ---
function renderHUD() {
    hudContainer.innerHTML = "";
    let t = uiTexts[currentUILang];
    let myHearts = myState.lives > 0 ? "❤️".repeat(myState.lives) + "🖤".repeat(3 - myState.lives) : `💀 ${t.badgeEliminated}`;
    
    let myBadge = document.createElement('div');
    myBadge.className = "hud-badge mine";
    myBadge.innerHTML = `<b>${myState.name} (Vy):</b> ${myState.score} b. | ${myHearts}`;
    hudContainer.appendChild(myBadge);

    Object.keys(remotePlayers).forEach(k => {
        let p = remotePlayers[k];
        let hearts = p.lives > 0 ? "❤️".repeat(p.lives) + "🖤".repeat(3 - p.lives) : `💀 ${t.badgeEliminated}`;
        let badge = document.createElement('div');
        badge.className = "hud-badge";
        badge.innerHTML = `<b>${p.name}:</b> ${p.score} b. | ${hearts}`;
        hudContainer.appendChild(badge);
    });
}

startMatchBtn.addEventListener('click', () => {
    if (gameMode === 'solo') {
        executeStart(false);
    } else if (gameMode === 'online' && myRole === 'p1') {
        roomRef.update({ status: 'started' });
    }
});

function getRandomTargetNumber() {
    return Math.floor(Math.random() * 100) + 1;
}

async function executeStart(isMultiplayerTriggered = false) {
    if(!isMultiplayerTriggered && gameMode === 'solo') {
        const creditCheck = await checkAndConsumeCredit();
        if (!creditCheck.allowed) {
            alert("Vyčerpali jste volné kredity pro dnešní den.");
            window.changeScreen('screen-main'); 
            return;
        }
    }

    gameStarted = true;
    startMatchBtn.style.display = 'none';
    statusEl.textContent = uiTexts[currentUILang].statusGo;

    if (currentModeType === 'translation') {
        repeatBtn.style.display = 'inline-block';
    }

    if (gameMode === 'solo') {
        myState.currentNumber = getRandomTargetNumber();
        startSoloBotAI();
    }
    
    if (recognition) {
        recognition.lang = langB; 
        try { recognition.start(); } catch(e){}
    }
    requestAnimationFrame(gameLoop);
}

function startSoloBotAI() {
    const diff = document.getElementById('difficulty-select').value;
    let tickTime = 5000; let jumpChance = 0.60; let tripChance = 0.15;

    if (diff === 'easy') { tickTime = 6000; jumpChance = 0.40; tripChance = 0.15; }
    else if (diff === 'hard') { tickTime = 4000; jumpChance = 0.80; tripChance = 0.05; }

    botInterval = setInterval(() => {
        if (!gameStarted || !remotePlayers['bot'] || remotePlayers['bot'].lives <= 0 || myState.state === 'won') return;

        let roll = Math.random();
        if (roll < jumpChance) {
            remotePlayers['bot'].state = 'jumping';
            let bFrame = 0; const bTotalFrames = 30;
            let startX = remotePlayers['bot'].worldX;

            let bJmp = setInterval(() => {
                bFrame++;
                let progress = bFrame / bTotalFrames;
                remotePlayers['bot'].jumpProgress = progress;
                remotePlayers['bot'].y = -(4 * 60 * progress * (1 - progress));
                remotePlayers['bot'].worldX = startX + (progress * STEP_X);

                if(bFrame >= bTotalFrames) {
                    clearInterval(bJmp);
                    remotePlayers['bot'].state = 'running'; remotePlayers['bot'].y = 0; remotePlayers['bot'].jumpProgress = 0;
                    remotePlayers['bot'].score++;
                    remotePlayers['bot'].worldX = startX + STEP_X;
                    renderHUD(); checkWinConditions();
                }
            }, 20);
        } else if (roll > (1 - tripChance)) {
            remotePlayers['bot'].state = 'tripping'; remotePlayers['bot'].lives--;
            renderHUD(); checkWinConditions();
            setTimeout(() => { if(remotePlayers['bot'] && remotePlayers['bot'].lives > 0) remotePlayers['bot'].state = 'running'; }, 1200);
        }
    }, tickTime);
}

function checkScreenElimination() {
    if (!gameStarted) return;
    let all = [{ id: myRole, lives: myState.lives, worldX: myState.worldX }];
    Object.keys(remotePlayers).forEach(k => {
        all.push({ id: k, lives: remotePlayers[k].lives, worldX: remotePlayers[k].worldX });
    });

    let alive = all.filter(p => p.lives > 0);
    if (alive.length === 0) return;

    let maxWorldX = Math.max(...alive.map(p => p.worldX));

    if (myState.lives > 0 && (maxWorldX - myState.worldX) >= 4 * STEP_X) {
        myState.lives = 0; myState.state = 'tripping';
        sendStateToFirebase(); renderHUD();
    }
}

function checkWinConditions() {
    if (!gameStarted) return;
    checkScreenElimination();

    let all = [{ id: myRole, ...myState }];
    Object.keys(remotePlayers).forEach(k => all.push({ id: k, ...remotePlayers[k] }));

    let alivePlayers = all.filter(p => p.lives > 0);
    let winnerId = null;
    let reachedFinish = all.filter(p => p.worldX >= FINISH_LINE_WORLD_X && p.lives > 0);

    if(reachedFinish.length > 0) {
        reachedFinish.sort((a,b) => b.worldX - a.worldX); 
        winnerId = reachedFinish[0].id;
    } else if (all.length > 1 && alivePlayers.length === 1) {
        winnerId = alivePlayers[0].id;
    }

    if (winnerId) {
        gameStarted = false;
        if(gameMode === 'online' && roomRef && myRole === 'p1') {
            roomRef.child('status').set('finished');
        }
        showVictoryScreen(winnerId, all);
    }
}

function showVictoryScreen(winnerId, allPlayersList) {
    if(botInterval) clearInterval(botInterval);
    if(tripTimeout) clearTimeout(tripTimeout); 
    if(recognition) try { recognition.stop(); } catch(e){}
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    repeatBtn.style.display = 'none';

    const titleEl = document.getElementById('victory-title');
    const tbody = document.getElementById('stats-tbody');
    tbody.innerHTML = "";
    let t = uiTexts[currentUILang];

    if (winnerId === myRole) {
        titleEl.textContent = t.winnerText; titleEl.style.color = "#2ecc71";
    } else {
        let winnerName = remotePlayers[winnerId] ? remotePlayers[winnerId].name : "Soupeř";
        titleEl.textContent = `${t.loserText} ${winnerName} 💀`; titleEl.style.color = "#e74c3c";
    }

    allPlayersList.sort((a,b) => b.score - a.score).forEach(p => {
        let tr = document.createElement('tr');
        let displayName = p.id === myRole ? `<b>${p.name}</b>` : p.name;
        let statusText = p.id === winnerId ? t.badgeFinished : (p.lives <= 0 ? t.badgeEliminated : t.badgeNotFinished);
        tr.innerHTML = `<td>${displayName}</td><td>${p.score}</td><td>${p.lives > 0 ? p.lives+'/3':'0/3'}</td><td>${statusText}</td>`;
        tbody.appendChild(tr);
    });

    window.changeScreen('screen-victory');
    setTimeout(() => { document.getElementById('replay-section').style.display = 'block'; }, 1500);
}

document.getElementById('rematch-btn').addEventListener('click', () => {
    resetGameEngine();
    window.changeScreen('screen-game1-mode');
});

function resetGameEngine() {
    gameStarted = false;
    lastSpokenNumber = 0;
    repeatBtn.style.display = 'none';
    if(recognition) try { recognition.stop(); } catch(e){}
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    if(botInterval) clearInterval(botInterval);
    if(tripTimeout) clearTimeout(tripTimeout); 
    if(roomRef) { roomRef.off(); roomRef = null; }

    let chosenName = document.getElementById('player-name-input').value.trim() || "Běžec";
    myState = { score: 0, lives: 3, currentNumber: 0, state: 'running', y: 0, jumpProgress: 0, worldX: START_WORLD_X, name: chosenName };
    remotePlayers = {};
    document.getElementById('replay-section').style.display = 'none';
}

// --- HLASOVÁ SYNTHÉZA & REKOGNICE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSynthesis || window.webkitSpeechRecognition;
let recognition = null;
if (window.webkitSpeechRecognition || window.SpeechRecognition) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true; 

    recognition.onresult = (e) => {
        if (!gameStarted || myState.state !== 'running' || myState.lives <= 0) return;
        let fullTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            fullTranscript += e.results[i][0].transcript;
        }
        handleLiveVoiceInput(fullTranscript);
    };

    recognition.onend = () => { 
        if (gameStarted && myState.lives > 0 && myState.state !== 'won') try { recognition.start(); } catch(err){}
    };
}

function speakTargetNumber(num, lang, forceCancel = false) {
    if (!window.speechSynthesis || currentModeType !== 'translation') return;
    if (forceCancel) window.speechSynthesis.cancel();
    else if (window.speechSynthesis.speaking) return; 

    let textToSpeak = (num <= 10 && languageWordsText[lang]) ? languageWordsText[lang][num] : num.toString();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang;
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
}

repeatBtn.addEventListener('click', () => {
    if (gameStarted && currentModeType === 'translation' && myState.currentNumber > 0 && myState.lives > 0) {
        speakTargetNumber(myState.currentNumber, langA, true);
    }
});

function handleLiveVoiceInput(rawText) {
    const cleanText = rawText.toLowerCase().replace(/[.,?!]/g, '').trim();
    statusEl.textContent = `${uiTexts[currentUILang].statusHearing} "${cleanText}"`;

    let matched = false;
    if (myState.currentNumber <= 10) {
        const validAnswers = languageMaps1To10[langB][myState.currentNumber];
        if (validAnswers && validAnswers.some(ans => cleanText.includes(ans))) matched = true;
    } else {
        if (cleanText.includes(myState.currentNumber.toString())) matched = true;
    }

    if (matched) triggerJump();
}

if (recognition) {
    recognition.onspeechend = () => {
        if (tripTimeout) clearTimeout(tripTimeout);
        tripTimeout = setTimeout(() => {
            if (gameStarted && myState.state === 'running' && myState.lives > 0) triggerTrip();
        }, 800);
    };
}

function triggerJump() {
    if (tripTimeout) { clearTimeout(tripTimeout); tripTimeout = null; }

    myState.state = 'jumping'; myState.jumpProgress = 0;
    sendStateToFirebase();

    let frame = 0; const totalFrames = 30;
    let startWorldX = myState.worldX;

    const jumpInterval = setInterval(() => {
        frame++; let progress = frame / totalFrames;
        myState.jumpProgress = progress;
        myState.y = -(4 * 60 * progress * (1 - progress));
        myState.worldX = startWorldX + (progress * STEP_X);

        sendStateToFirebase();

        if (frame >= totalFrames) {
            clearInterval(jumpInterval);
            myState.state = 'running'; myState.y = 0; myState.jumpProgress = 0;
            myState.worldX = startWorldX + STEP_X;
            myState.score++;
            myState.currentNumber = getRandomTargetNumber();

            sendStateToFirebase(); renderHUD(); checkWinConditions();
        }
    }, 20);
}

function triggerTrip() {
    myState.state = 'tripping'; myState.lives--;
    sendStateToFirebase(); renderHUD(); checkWinConditions();
    setTimeout(() => {
        if (myState.lives > 0 && gameStarted) {
            myState.state = 'running';
            myState.currentNumber = getRandomTargetNumber();
            sendStateToFirebase();
        }
    }, 1200);
}

function sendStateToFirebase() {
    if (gameMode === 'online' && roomRef) {
        roomRef.child(myRole).update({
            score: myState.score, lives: myState.lives, state: myState.state,
            y: myState.y, jumpProgress: myState.jumpProgress, worldX: myState.worldX,
            currentNumber: myState.currentNumber, name: myState.name
        });
    }
}

// --- GRAFIKA A CANVAS VYKRESLOVÁNÍ ---
function drawRunner(x, y, color, name, isTripping, isJumping) {
    ctx.save();
    if (isTripping) {
        ctx.translate(x + 12, y - 10); ctx.rotate(Math.PI / 2); ctx.translate(-(x + 12), -(y - 10));
    }
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(x + 12, y, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(44, 62, 80, 0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(name, x + 12, y - 46, 85); 
    ctx.fillStyle = "#ffcc99"; ctx.beginPath(); ctx.arc(x + 12, y - 34, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + 3, y - 28, 18, 16, 4) : ctx.fillRect(x + 3, y - 28, 18, 16); ctx.fill();
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath();
    if (isJumping) {
        ctx.moveTo(x + 6, y - 12); ctx.lineTo(x + 2, y - 5); ctx.moveTo(x + 18, y - 12); ctx.lineTo(x + 22, y - 5);
    } else if (isTripping) {
        ctx.moveTo(x + 7, y - 12); ctx.lineTo(x + 5, y - 2); ctx.moveTo(x + 17, y - 12); ctx.lineTo(x + 15, y - 2);
    } else {
        let legSwing = Math.sin(Date.now() * 0.015) * 6;
        ctx.moveTo(x + 7, y - 12); ctx.lineTo(x + 7 + legSwing, y);
        ctx.moveTo(x + 17, y - 12); ctx.lineTo(x + 17 - legSwing, y);
    }
    ctx.stroke(); ctx.restore();
}

function drawHurdle(x, y) {
    ctx.save(); ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(x - 5, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y); ctx.lineTo(x, y - 22); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y - 22);
    ctx.stroke();
    ctx.fillStyle = "#e74c3c"; ctx.fillRect(x - 5, y - 22, 20, 5);
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 3, y - 22, 4, 5); ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let list = [{ role: myRole, ...myState }];
    Object.keys(remotePlayers).forEach(k => list.push({ role: k, ...remotePlayers[k] }));
    list.sort((a,b) => a.role.localeCompare(b.role));

    let currentVisualX = myState.worldX;
    let cameraX = currentVisualX - 130; 
    if(cameraX < 0) cameraX = 0;

    let trackHeight = 140; 
    let trackTopY = Math.floor((canvas.height - trackHeight) / 2); 
    let trackBottomY = trackTopY + trackHeight;

    ctx.fillStyle = "#d35400"; ctx.fillRect(0, trackTopY, canvas.width, trackHeight);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, trackTopY, canvas.width, 4); ctx.fillRect(0, trackBottomY - 4, canvas.width, 4);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    let dashWidth = 30; let dashGap = 30;
    let startDashX = -(cameraX % (dashWidth + dashGap));
    for (let sx = startDashX; sx < canvas.width; sx += (dashWidth + dashGap)) {
        ctx.fillRect(sx, trackTopY + (trackHeight / 2) - 2, dashWidth, 3);
    }

    let finishScreenX = FINISH_LINE_WORLD_X - cameraX;
    if (finishScreenX >= -50 && finishScreenX <= canvas.width + 50) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(finishScreenX, trackTopY, 16, trackHeight);
        ctx.fillStyle = "#000000";
        for(let ty = trackTopY; ty < trackBottomY; ty += 16) {
            ctx.fillRect(finishScreenX, ty, 8, 8); ctx.fillRect(finishScreenX + 8, ty + 8, 8, 8);
        }
    }

    for(let i = 0; i < stepsToFinish; i++) {
        let hurdleWorldX = START_WORLD_X + (i * STEP_X) + 55;
        let hurdleScreenX = hurdleWorldX - cameraX;
        if(hurdleScreenX >= -20 && hurdleScreenX <= canvas.width + 20) {
            for(let row = 0; row < 4; row++) {
                drawHurdle(hurdleScreenX, trackTopY + 35 + (row * 32));
            }
        }
    }

    list.forEach((player, index) => {
        let playerLaneY = trackTopY + 30 + (index * 26);
        let screenX = player.worldX - cameraX;
        let color = playerColors[index % playerColors.length];
        let nameTag = player.name;

        if(player.lives <= 0) {
            drawRunner(screenX, playerLaneY, color, `${nameTag} [KO]`, true, false);
        } else {
            let currentY = playerLaneY + (player.y || 0);
            drawRunner(screenX, currentY, color, nameTag, player.state === 'tripping', player.state === 'jumping');
        }
    });
}

function gameLoop() {
    draw();
    if (gameStarted) {
        let t = uiTexts[currentUILang];
        if (myState.lives > 0 && myState.state === 'running') {
            if (myState.currentNumber !== lastSpokenNumber && myState.currentNumber > 0) {
                lastSpokenNumber = myState.currentNumber;
                if (currentModeType === 'translation') speakTargetNumber(myState.currentNumber, langA, true);
            }
            numberEl.textContent = (currentModeType === 'translation') ? t.statusListening : myState.currentNumber;
        } else if (myState.state === 'tripping') {
            numberEl.textContent = t.statusKick;
        } else if (myState.lives <= 0) {
            numberEl.textContent = t.statusKO;
        }
        requestAnimationFrame(gameLoop);
    }
}

setUILanguage('cs');
draw();