/**
 * JUNGLE SPEECH RUN - CORE ARCHITECTURE (BACKEND & VOICE)
 * Část 1/2: Správa stavu, slovní zásoby a Web Speech API
 */

// --- 1. GLOBÁLNÍ STAV HRY ---
const gameEngine = {
    // Nastavení konfigurace
    langA: 'cs-CZ',        // Výchozí jazyk zadání
    langB: 'en-US',        // Výchozí jazyk odpovědi
    difficulty: 'intermediate', // basic | intermediate | expert
    proficiency: 'basic',       // basic | intermediate | expert
    
    // Herní stav
    state: 'menu',         // menu | playing | category_select | door | shop | game_over
    score: 0,
    coins: 0,
    gatesPassed: 0,
    gatesUntilCategoryTrigger: 4, // Náhodně 3-5, inicializováno dynamicky
    
    // Hrozba (Puma)
    playerDistance: 20,    // Vzdálenost od pumy v metrech
    maxDistance: 35,       // Maximální možný náskok
    pumaSpeedModifier: 1.0,// Zvyšuje se s časem/koly
    
    // Číselné dveře
    currentDoorCode: '',
    doorTimeLeft: 0,
    doorMaxTime: 15,
    doorAttemptsLeft: 3,

    // Inventář a vylepšení
    upgrades: {
        machete: 0,        // Automatické záchrany u špatné brány
        boots: false,      // Trvalé lehké snížení rychlosti pumy (+ pasivní bonus k náskoku)
        lockpick: 0        // Druhá šance u dveří chrámu
    },
    
    // Správa slovní zásoby (Pooly)
    vocab: {
        activePool: [],    // Slovíčka aktuálně ve hře
        usedPool: [],      // Úspěšně vyřešená slovíčka (už se neopakují)
        lockedCategories: ['animals', 'family', 'countries', 'nature'] // Zamknuté sekce
    },
    
    // Aktuální aktivní objekty na scéně (pro provázání s Canvasem)
    activeGates: [],       // Aktuální 3 brány před hráčem
    currentWordChallenge: null
};

// --- 2. MULTILANGUÁLNÍ DATABÁZE SLOVÍČEK ---
// Každé slovo je objekt obsahující překlady do všech podporovaných jazyků.
// Díky tomu lze libovolně měnit kombinace Jazyka A a Jazyka B.
const VOCABULARY_DATABASE = [
    // --- KATEGORIE: ZVÍŘATA (ANIMALS / ELÄIMET / TIERE) ---
    { id: 1, category: 'animals', level: 'basic', text: { 'cs-CZ': 'pes', 'en-US': 'dog', 'fi-FI': 'koira', 'de-DE': 'Hund' } },
    { id: 2, category: 'animals', level: 'basic', text: { 'cs-CZ': 'kočka', 'en-US': 'cat', 'fi-FI': 'kissa', 'de-DE': 'Katze' } },
    { id: 3, category: 'animals', level: 'intermediate', text: { 'cs-CZ': 'tygr', 'en-US': 'tiger', 'fi-FI': 'tiokeri', 'de-DE': 'Tiger' } },
    { id: 4, category: 'animals', level: 'intermediate', text: { 'cs-CZ': 'had', 'en-US': 'snake', 'fi-FI': 'käärme', 'de-DE': 'Schlange' } },
    { id: 5, category: 'animals', level: 'expert', text: { 'cs-CZ': 'veverka', 'en-US': 'squirrel', 'fi-FI': 'orava', 'de-DE': 'Eichhörnchen' } },
    { id: 6, category: 'animals', level: 'expert', text: { 'cs-CZ': 'vlk', 'en-US': 'wolf', 'fi-FI': 'susi', 'de-DE': 'Wolf' } },

    // --- KATEGORIE: RODINA (FAMILY / PERHE / FAMILIE) ---
    { id: 7, category: 'family', level: 'basic', text: { 'cs-CZ': 'matka', 'en-US': 'mother', 'fi-FI': 'äiti', 'de-DE': 'Mutter' } },
    { id: 8, category: 'family', level: 'basic', text: { 'cs-CZ': 'otec', 'en-US': 'father', 'fi-FI': 'isä', 'de-DE': 'Vater' } },
    { id: 9, category: 'family', level: 'intermediate', text: { 'cs-CZ': 'bratr', 'en-US': 'brother', 'fi-FI': 'veli', 'de-DE': 'Bruder' } },
    { id: 10, category: 'family', level: 'intermediate', text: { 'cs-CZ': 'sestra', 'en-US': 'sister', 'fi-FI': 'sisko', 'de-DE': 'Schwester' } },
    { id: 11, category: 'family', level: 'expert', text: { 'cs-CZ': 'synovec', 'en-US': 'nephew', 'fi-FI': 'veljenpoika', 'de-DE': 'Neffe' } },
    { id: 12, category: 'family', level: 'expert', text: { 'cs-CZ': 'příbuzný', 'en-US': 'relative', 'fi-FI': 'sukulainen', 'de-DE': 'Verwandte' } },

    // --- KATEGORIE: ZEMĚ (COUNTRIES / MAAT / LÄNDER) ---
    { id: 13, category: 'countries', level: 'basic', text: { 'cs-CZ': 'Česko', 'en-US': 'Czechia', 'fi-FI': 'Tšekki', 'de-DE': 'Tschechien' } },
    { id: 14, category: 'countries', level: 'basic', text: { 'cs-CZ': 'Německo', 'en-US': 'Germany', 'fi-FI': 'Saksa', 'de-DE': 'Deutschland' } },
    { id: 15, category: 'countries', level: 'intermediate', text: { 'cs-CZ': 'Finsko', 'en-US': 'Finland', 'fi-FI': 'Suomi', 'de-DE': 'Finnland' } },
    { id: 16, category: 'countries', level: 'intermediate', text: { 'cs-CZ': 'Francie', 'en-US': 'France', 'fi-FI': 'Ranska', 'de-DE': 'Frankreich' } },
    { id: 17, category: 'countries', level: 'expert', text: { 'cs-CZ': 'Rakousko', 'en-US': 'Austria', 'fi-FI': 'Itävalta', 'de-DE': 'Österreich' } },
    { id: 18, category: 'countries', level: 'expert', text: { 'cs-CZ': 'Švýcarsko', 'en-US': 'Switzerland', 'fi-FI': 'Sveitsi', 'de-DE': 'Schweiz' } },

    // --- KATEGORIE: PŘÍRODA (NATURE / LUONTO / NATUR) ---
    { id: 19, category: 'nature', level: 'basic', text: { 'cs-CZ': 'strom', 'en-US': 'tree', 'fi-FI': 'puu', 'de-DE': 'Baum' } },
    { id: 20, category: 'nature', level: 'basic', text: { 'cs-CZ': 'les', 'en-US': 'forest', 'fi-FI': 'metsä', 'de-DE': 'Wald' } },
    { id: 21, category: 'nature', level: 'intermediate', text: { 'cs-CZ': 'řeka', 'en-US': 'river', 'fi-FI': 'joki', 'de-DE': 'Fluss' } },
    { id: 22, category: 'nature', level: 'intermediate', text: { 'cs-CZ': 'hora', 'en-US': 'mountain', 'fi-FI': 'vuori', 'de-DE': 'Berg' } },
    { id: 23, category: 'nature', level: 'expert', text: { 'cs-CZ': 'jeskyně', 'en-US': 'cave', 'fi-FI': 'luola', 'de-DE': 'Höhle' } },
    { id: 24, category: 'nature', level: 'expert', text: { 'cs-CZ': 'ledovec', 'en-US': 'glacier', 'fi-FI': 'jäätikkö', 'de-DE': 'Gletscher' } }
];

// Výchozí startovní mix pro nulté kolo (pokud nejsou vybrané jiné kategorie)
const BASE_CORE_WORDS = [
    { id: 99, category: 'core', level: 'basic', text: { 'cs-CZ': 'ano', 'en-US': 'yes', 'fi-FI': 'kyllä', 'de-DE': 'ja' } },
    { id: 100, category: 'core', level: 'basic', text: { 'cs-CZ': 'ne', 'en-US': 'no', 'fi-FI': 'ei', 'de-DE': 'nein' } },
    { id: 101, category: 'core', level: 'intermediate', text: { 'cs-CZ': 'ahoj', 'en-US': 'hello', 'fi-FI': 'hei', 'de-DE': 'hallo' } },
    { id: 102, category: 'core', level: 'intermediate', text: { 'cs-CZ': 'děkuji', 'en-US': 'thanks', 'fi-FI': 'kiitos', 'de-DE': 'danke' } }
];

// --- 3. CORE BACKEND LOGIKA (ŘÍZENÍ POOLŮ A MECHANIK) ---

function initGameSession(langA, langB, diff, prof) {
    gameEngine.langA = langA;
    gameEngine.langB = langB;
    gameEngine.difficulty = diff;
    gameEngine.proficiency = prof;
    
    gameEngine.score = 0;
    gameEngine.coins = 0;
    gameEngine.gatesPassed = 0;
    gameEngine.playerDistance = 20;
    gameEngine.pumaSpeedModifier = diff === 'basic' ? 0.8 : diff === 'intermediate' ? 1.1 : 1.5;
    
    gameEngine.vocab.usedPool = [];
    gameEngine.vocab.lockedCategories = ['animals', 'family', 'countries', 'nature'];
    
    // Naplnění startovního activePoolu na základě vybrané pokročilosti (proficiency)
    gameEngine.vocab.activePool = BASE_CORE_WORDS.filter(w => {
        if (prof === 'basic') return w.level === 'basic';
        if (prof === 'intermediate') return w.level === 'basic' || w.level === 'intermediate';
        return true;
    });

    gameEngine.upgrades = { machete: 0, boots: false, lockpick: 0 };
    determineNextCategoryTrigger();
    generateNextGateChallenge();
    
    gameEngine.state = 'playing';
    speechCore.switchLanguage(gameEngine.langB); // Posloucháme překlady v cílovém jazyce
}

function determineNextCategoryTrigger() {
    // Náhodně po 3 až 5 úspěšných branách nabídne novou slovní zásobu
    gameEngine.gatesUntilCategoryTrigger = Math.floor(Math.random() * 3) + 3;
}

function injectCategoryToPool(categoryName) {
    // Vytáhne slova z DB podle kategorie a hráčovy pokročilosti
    const newWords = VOCABULARY_DATABASE.filter(w => {
        if (w.category !== categoryName) return false;
        if (gameEngine.proficiency === 'basic') return w.level === 'basic';
        if (gameEngine.proficiency === 'intermediate') return w.level === 'basic' || w.level === 'intermediate';
        return true; 
    });

    gameEngine.vocab.activePool.push(...newWords);
    
    // Odstranění z uzamčených kategorií
    gameEngine.vocab.lockedCategories = gameEngine.vocab.lockedCategories.filter(c => c !== categoryName);
}

function generateNextGateChallenge() {
    if (gameEngine.vocab.activePool.length === 0) {
        // Pokud dojdou slova v aktivním poolu, zrecykluj použitá, aby hra nespadla
        gameEngine.vocab.activePool = [...gameEngine.vocab.usedPool];
        gameEngine.vocab.usedPool = [];
        if (gameEngine.vocab.activePool.length === 0) {
            gameEngine.vocab.activePool = [...BASE_CORE_WORDS];
        }
    }

    // Vyber náhodné slovo jako hlavní výzvu
    const randomIdx = Math.floor(Math.random() * gameEngine.vocab.activePool.length);
    const challengeWord = gameEngine.vocab.activePool[randomIdx];
    gameEngine.currentWordChallenge = challengeWord;

    // Vytvoření 3 bran pro vizuální scénu (1 správná, 2 falešné)
    const correctTranslation = challengeWord.text[gameEngine.langB];
    
    // Získání falešných překladů z celkové DB
    let wrongTranslations = VOCABULARY_DATABASE
        .filter(w => w.text[gameEngine.langB] !== correctTranslation)
        .map(w => w.text[gameEngine.langB]);
        
    // Zamíchání falešných slov
    wrongTranslations.sort(() => 0.5 - Math.random());

    const gates = [
        { text: correctTranslation, isCorrect: true },
        { text: wrongTranslations[0] || 'DummyA', isCorrect: false },
        { text: wrongTranslations[1] || 'DummyB', isCorrect: false }
    ];
    
    // Náhodně promíchat pořadí bran pro Canvas lajny
    gates.sort(() => 0.5 - Math.random());
    gameEngine.activeGates = gates;
}

function handleGateAnswer(spokenText) {
    if (gameEngine.state !== 'playing') return;

    const correctWord = gameEngine.currentWordChallenge.text[gameEngine.langB].toLowerCase().trim();
    const cleanSpoken = spokenText.toLowerCase().trim();

    if (cleanSpoken.includes(correctWord)) {
        // --- SPRÁVNĚ ---
        gameEngine.score += 10;
        gameEngine.coins += Math.floor(Math.random() * 3) + 2;
        gameEngine.gatesPassed++;
        
        // Zvětšení náskoku před pumou (max do limitu)
        gameEngine.playerDistance = Math.min(gameEngine.maxDistance, gameEngine.playerDistance + 4);

        // Slovo bylo úspěšně zvládnuto -> vyřadit z activePoolu do usedPoolu
        gameEngine.vocab.activePool = gameEngine.vocab.activePool.filter(w => w.id !== gameEngine.currentWordChallenge.id);
        gameEngine.vocab.usedPool.push(gameEngine.currentWordChallenge);

        // Kontrola triggeru pro novou kategorii
        if (gameEngine.gatesPassed >= gameEngine.gatesUntilCategoryTrigger && gameEngine.vocab.lockedCategories.length > 0) {
            triggerCategorySelection();
            return;
        }

        // Šance na příchod k chrámu/dveřím (např. každých 6 bran)
        if (gameEngine.gatesPassed % 6 === 0) {
            triggerTempleDoor();
            return;
        }

        generateNextGateChallenge();
    } else {
        // --- CHYBNĚ ---
        // Má hráč mačetu k záchraně?
        if (gameEngine.upgrades.machete > 0) {
            gameEngine.upgrades.machete--;
            // Mačeta tě zachrání před nárazem - slovo se přeskočí bez penalizace vzdálenosti
            generateNextGateChallenge();
            return;
        }

        // Puma prudce zaútočí (ztráta metrů)
        gameEngine.playerDistance -= 6;
        if (gameEngine.playerDistance <= 0) {
            endGameSession();
            return;
        }
        // Slovo zůstává v activePoolu, generujeme nové zadání
        generateNextGateChallenge();
    }
}

function triggerCategorySelection() {
    gameEngine.state = 'category_select';
    speechCore.switchLanguage(gameEngine.langA); // Výběr zón probíhá v mateřském/ovládacím jazyce
}

function handleCategoryVoiceChoice(spokenText) {
    const clean = spokenText.toLowerCase();
    const available = gameEngine.vocab.lockedCategories;

    let selected = null;
    if ((clean.includes('zvíř') || clean.includes('animals')) && available.includes('animals')) selected = 'animals';
    else if ((clean.includes('rodin') || clean.includes('family')) && available.includes('family')) selected = 'family';
    else if ((clean.includes('zem') || clean.includes('countr')) && available.includes('countries')) selected = 'countries';
    else if ((clean.includes('přírod') || clean.includes('natur')) && available.includes('nature')) selected = 'nature';

    if (selected) {
        injectCategoryToPool(selected);
        determineNextCategoryTrigger();
        gameEngine.gatesPassed = 0;
        gameEngine.state = 'playing';
        speechCore.switchLanguage(gameEngine.langB);
        generateNextGateChallenge();
    }
}

function triggerTempleDoor() {
    gameEngine.state = 'door';
    
    // Generování číselného kódu podle obtížnosti
    let maxNum = gameEngine.difficulty === 'basic' ? 20 : gameEngine.difficulty === 'intermediate' ? 100 : 1000;
    // Zajistíme náhodné celé číslo
    gameEngine.currentDoorCode = String(Math.floor(Math.random() * (maxNum - 1)) + 1);
    
    gameEngine.doorTimeLeft = gameEngine.difficulty === 'basic' ? 20 : gameEngine.difficulty === 'intermediate' ? 15 : 10;
    gameEngine.doorAttemptsLeft = 3;
    
    speechCore.switchLanguage(gameEngine.langB); // Kód čísla se diktuje v cílovém cizím jazyce!
}

function handleDoorVoiceInput(spokenText) {
    if (gameEngine.state !== 'door') return;

    // Hledáme čistou shodu čísla v textu
    const cleanSpoken = spokenText.toLowerCase().trim();
    const targetCode = gameEngine.currentDoorCode;

    // Pomocná kontrola textových reprezentací čísel (zjednodušená verze, Speech API většinou vrací cifry "45")
    if (cleanSpoken.includes(targetCode)) {
        // ÚSPĚŠNÉ ODEMČENÍ DVEŘÍ -> Přechod do obchodu uvnitř chrámu
        gameEngine.score += 50;
        gameEngine.state = 'shop';
        speechCore.switchLanguage(gameEngine.langA); // V obchodě komunikujeme v langA
    } else {
        // CHYBA
        gameEngine.doorAttemptsLeft--;
        if (gameEngine.doorAttemptsLeft <= 0) {
            // Použití šperháku (Lockpick)
            if (gameEngine.upgrades.lockpick > 0) {
                gameEngine.upgrades.lockpick--;
                gameEngine.state = 'shop';
                speechCore.switchLanguage(gameEngine.langA);
                return;
            }
            endGameSession(); // Konec pokusů = Puma prorazila dveře
        }
    }
}

function executeShopVoiceCommand(spokenText) {
    const clean = spokenText.toLowerCase();
    
    // Příkazy: "mačeta" (cost 15), "boty" (cost 30), "šperhák" (cost 20), "běžet" / "odchod"
    if (clean.includes('mačet') || clean.includes('machete')) {
        if (gameEngine.coins >= 15) { gameEngine.coins -= 15; gameEngine.upgrades.machete++; }
    } else if (clean.includes('bot') || clean.includes('boots')) {
        if (gameEngine.coins >= 30 && !gameEngine.upgrades.boots) { gameEngine.coins -= 30; gameEngine.upgrades.boots = true; }
    } else if (clean.includes('šperh') || clean.includes('lockpick')) {
        if (gameEngine.coins >= 20) { gameEngine.coins -= 20; gameEngine.upgrades.lockpick++; }
    } else if (clean.includes('běž') || clean.includes('run') || clean.includes('odchod') || clean.includes('pokrač')) {
        // Opuštění chrámu, návrat do pralesního běhu
        gameEngine.state = 'playing';
        gameEngine.playerDistance = Math.min(gameEngine.maxDistance, gameEngine.playerDistance + 5); // Bonus za bezpečný únik z chrámu
        speechCore.switchLanguage(gameEngine.langB);
        generateNextGateChallenge();
    }
}

function updatePumaLogic(deltaTime) {
    if (gameEngine.state !== 'playing' && gameEngine.state !== 'door') return;

    // Rychlost přibližování pumy za vteřinu
    let baseApproach = 0.45 * gameEngine.pumaSpeedModifier;
    
    // Pokud má hráč rychlé boty, puma se přibližuje o 25% pomaleji
    if (gameEngine.upgrades.boots) {
        baseApproach *= 0.75;
    }

    // Během řešení chrámu se puma sune k hráči rychleji, protože stojíš na místě!
    if (gameEngine.state === 'door') {
        baseApproach *= 1.4;
        gameEngine.doorTimeLeft -= deltaTime;
        if (gameEngine.doorTimeLeft <= 0) {
            if (gameEngine.upgrades.lockpick > 0) {
                gameEngine.upgrades.lockpick--;
                gameEngine.state = 'shop';
                speechCore.switchLanguage(gameEngine.langA);
            } else {
                endGameSession();
            }
            return;
        }
    }

    gameEngine.playerDistance -= baseApproach * deltaTime;

    if (gameEngine.playerDistance <= 0) {
        endGameSession();
    }
}

function endGameSession() {
    gameEngine.playerDistance = 0;
    gameEngine.state = 'game_over';
    speechCore.switchLanguage(gameEngine.langA);
}


// --- 4. ASYNCHRONNÍ HLASOVÝ ENGINE (WEB SPEECH API LAYER) ---
class SpeechRecognitionCore {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Web Speech API není v tomto prohlížeči podporováno.");
            this.supported = false;
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.thisLanguage = gameEngine.langB;
        this.recognition.lang = this.thisLanguage;
        this.supported = true;
        this.isListening = false;

        // Automatické restarty při odpojení/chybě na pozadí herní smyčky
        this.recognition.onend = () => {
            if (this.isListening && gameEngine.state !== 'game_over') {
                this.recognition.start();
            }
        };

        this.recognition.onresult = (event) => {
            const resultIndex = event.resultIndex;
            const spokenText = event.results[resultIndex][0].transcript;
            
            this.routeVoiceInput(spokenText);
        };
    }

    startListening() {
        if (!this.supported || this.isListening) return;
        this.isListening = true;
        try {
            this.recognition.start();
        } catch (e) { console.log(e); }
    }

    stopListening() {
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) { console.log(e); }
    }

    switchLanguage(newLangCode) {
        if (!this.supported) return;
        if (this.thisLanguage === newLangCode) return;

        this.thisLanguage = newLangCode;
        this.recognition.lang = newLangCode;

        // Pro změnu jazyka za běhu musíme instanci bezpečně restartovat
        if (this.isListening) {
            try {
                this.recognition.stop();
                // 'onend' se postará o okamžité znovunastartování s novým lang kódem
            } catch (e) { console.log(e); }
        }
    }

    routeVoiceInput(text) {
        console.log(`Hlasový vstup [${this.thisLanguage}]: ${text}`);
        
        switch (gameEngine.state) {
            case 'playing':
                handleGateAnswer(text);
                break;
            case 'category_select':
                handleCategoryVoiceChoice(text);
                break;
            case 'door':
                handleDoorVoiceInput(text);
                break;
            case 'shop':
                executeShopVoiceCommand(text);
                break;
            case 'menu':
                // Menu obstaráme kliknutím nebo základním slovem "start"
                if (text.toLowerCase().includes('start')) {
                    initGameSession(gameEngine.langA, gameEngine.langB, gameEngine.difficulty, gameEngine.proficiency);
                }
                break;
        }
    }
}

// Inicializace globálního hlasového jádra
const speechCore = new SpeechRecognitionCore();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Paralaxní vrstvy pozadí (offsety pro rolování)
const environment = {
    skyOffset: 0,
    midOffset: 0,
    foreOffset: 0,
    groundOffset: 0,
    gameTime: 0,
    screenShake: 0,
    particles: [],
    
    // Konfigurace pruhů (3 lajny pro běh)
    lanesY: [240, 360, 480],
    playerVisualY: 360,
    targetVisualY: 360
};

// Generátor běžících prachových částic za běžcem
function spawnParticle(x, y, color) {
    environment.particles.push({
        x: x,
        y: y,
        vx: -(Math.random() * 4 + 2),
        vy: (Math.random() * 2 - 1),
        size: Math.random() * 5 + 2,
        alpha: 1,
        color: color
    });
}

function updateParticles() {
    for (let i = environment.particles.length - 1; i >= 0; i--) {
        let p = environment.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
            environment.particles.splice(i, 1);
        }
    }
}

// --- RENDERING PODSYSTÉMY ---

// 1. Kreslení hlubokého pralesa (Paralaxní vrstvy)
function drawParallaxBackground(speedMult) {
    // Posun pozic podle rychlosti (pokud jsme v režimu 'playing')
    if (gameEngine.state === 'playing') {
        environment.skyOffset = (environment.skyOffset + 0.5 * speedMult) % canvas.width;
        environment.midOffset = (environment.midOffset + 2 * speedMult) % canvas.width;
        environment.foreOffset = (environment.foreOffset + 5 * speedMult) % canvas.width;
        environment.groundOffset = (environment.groundOffset + 8 * speedMult) % canvas.width;
    }

    // VRSTVA 1: Obloha a siluety vzdálených hor/stromů (Gradient)
    let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#041c0c');
    skyGrad.addColorStop(0.6, '#0f3d1e');
    skyGrad.addColorStop(1, '#1a2416');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Kreslení vzdálených stromů (Vrstvy simulované opakováním sinusů)
    ctx.fillStyle = 'rgba(5, 31, 14, 0.6)';
    for (let i = 0; i < 3; i++) {
        let offset = (environment.skyOffset * (i + 1)) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(0 - offset, canvas.height);
        for (let x = 0; x <= canvas.width + 100; x += 40) {
            let y = 300 + Math.sin((x + offset) * 0.01) * 30 + Math.cos((x * 0.02)) * 15;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
    }

    // VRSTVA 2: Střední popředí - starověké ruiny a velké kmeny
    ctx.fillStyle = '#0a2612';
    let mOff = environment.midOffset;
    for (let j = 0; j < 2; j++) {
        let startX = (j * 600 - mOff);
        if (startX < -200) startX += canvas.width * 1.2;
        // Kmeny stromů
        ctx.fillRect(startX, 0, 45, canvas.height);
        // Chrámy v pozadí
        ctx.fillRect(startX + 200, 220, 120, 300);
        ctx.beginPath();
        ctx.moveTo(startX + 180, 220);
        ctx.lineTo(startX + 260, 160);
        ctx.lineTo(startX + 340, 220);
        ctx.fill();
    }

    // VRSTVA 3: Cesty a podklad pralesa
    let groundGrad = ctx.createLinearGradient(0, 180, 0, canvas.height);
    groundGrad.addColorStop(0, '#0f1f13');
    groundGrad.addColorStop(0.1, '#1b3d22');
    groundGrad.addColorStop(1, '#0b170e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 180, canvas.width, canvas.height - 180);

    // Vykreslení 3 koridorů (Lajny) pro plastický efekt běhu
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.15)';
    ctx.lineWidth = 6;
    environment.lanesY.forEach(y => {
        ctx.beginPath();
        ctx.setLineDash([15, 15]);
        ctx.moveTo(0, y + 40);
        ctx.lineTo(canvas.width, y + 40);
        ctx.stroke();
    });
    ctx.setLineDash([]); // Reset dashů
}

// 2. Kreslení HUD s Pumou na vrcholu obrazovky
function drawPumaHUD() {
    const hudY = 15;
    const barWidth = 600;
    const barHeight = 24;
    const barX = (canvas.width - barWidth) / 2;

    // Podkladová lišta
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 20, hudY, barWidth + 40, barHeight + 20);
    ctx.strokeStyle = '#1b3d22';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 20, hudY, barWidth + 40, barHeight + 20);

    // Vnitřní vybarvení bezpečné zóny (Čím blíž puma, tím víc červená)
    let distancePct = gameEngine.playerDistance / gameEngine.maxDistance; // 0 až 1
    if (distancePct > 1) distancePct = 1;
    if (distancePct < 0) distancePct = 0;

    let progressGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    progressGrad.addColorStop(0, '#e74c3c'); // Nebezpečí u levého kraje (Puma)
    progressGrad.addColorStop(0.4, '#f1c40f');
    progressGrad.addColorStop(1, '#2ecc71');  // Bezpečí u pravého kraje (Hráč)

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(barX, hudY + 10, barWidth, barHeight);

    // Pozice prvků na HUD lince
    // Puma začíná vlevo (0), hráč je vpravo podle vzdálenosti
    let playerX = barX + (barWidth * distancePct);
    let pumaX = barX; // Fixní začátek hrozby na HUDu

    // Vykreslení spojovací textury nebezpečí
    ctx.fillStyle = progressGrad;
    ctx.fillRect(pumaX, hudY + 14, playerX - pumaX, barHeight - 8);

    // Kreslení ikony PUMY 🐆
    ctx.font = '22px Arial';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 10;
    ctx.fillText('🐆', pumaX - 10, hudY + 30);

    // Kreslení ikony HRÁČE 🏃‍♂️
    ctx.shadowColor = '#2ecc71';
    ctx.fillText('🏃‍♂️', playerX - 10, hudY + 30);
    ctx.shadowBlur = 0; // Reset stínů

    // Textový ukazatel vzdálenosti metrů
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameEngine.playerDistance.toFixed(1)} m před šelmou`, barX + barWidth/2, hudY + 27);

    // Mince a skóre v rozích
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`💎 Mince: ${gameEngine.coins}`, 30, hudY + 28);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Skóre: ${gameEngine.score}`, canvas.width - 30, hudY + 28);
}

// 3. Kreslení Jazykových Bran (Lanes & Challenges)
function drawGates() {
    if (gameEngine.state !== 'playing' || !gameEngine.activeGates.length) return;

    // Pohyb bran zprava doleva (Simulace běhu)
    if (!environment.gateX) {
        environment.gateX = canvas.width + 100; // Start za pravým okrajem
    }

    environment.gateX -= 7 * gameEngine.pumaSpeedModifier;

    // Pokud brány minou hráče (přeběhl skrz), vyhodnotíme podle aktuální lajny hráče
    if (environment.gateX < 150 && !environment.gateEvaluated) {
        // Určíme, ve které lajně hráč vizuálně je (0, 1 nebo 2)
        let currentLaneIdx = environment.lanesY.indexOf(environment.targetVisualY);
        if (currentLaneIdx === -1) currentLaneIdx = 1;

        // Vytáhneme text z brány, kterou hráč protnul
        let crossedGate = gameEngine.activeGates[currentLaneIdx];
        
        // Jelikož ovládá hru hlasem, simulujeme protnutí brány:
        // Pokud hráč neřekne nic, automaticky narazí (vyhodnocení prázdným řetězcem)
        environment.gateEvaluated = true; 
        
        // Pro vizuální plynulost: Pokud brána prošla a hráč neuspěl hlasem dřív,
        // vyvoláme náraz do aktuální brány
        if (!crossedGate.isCorrect) {
            environment.screenShake = 15;
            handleGateAnswer("WRONG_AUTOMATIC_CRASH");
        } else {
            // Správná brána protnuta
            handleGateAnswer(crossedGate.text);
        }
    }

    // Reset pozice bran při novém zadání
    if (environment.gateX < -150) {
        environment.gateX = canvas.width + 100;
        environment.gateEvaluated = false;
    }

    // Centrální panel se zadáním nahoře uprostřed (Slovo v Jazyce A)
    ctx.fillStyle = 'rgba(0, 40, 15, 0.85)';
    ctx.fillRect(canvas.width / 2 - 150, 75, 300, 50);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 150, 75, 300, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameEngine.currentWordChallenge ? gameEngine.currentWordChallenge.text[gameEngine.langA] : '', canvas.width / 2, 107);

    // Vykreslení 3 kamenných totemových bran přes jednotlivé lajny
    for (let i = 0; i < 3; i++) {
        let gateY = environment.lanesY[i];
        let gateData = gameEngine.activeGates[i];
        if (!gateData) continue;

        // Záře brány
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 15;
        
        // Kamenné pilíře brány
        let gateGrad = ctx.createLinearGradient(environment.gateX, gateY, environment.gateX + 30, gateY + 80);
        gateGrad.addColorStop(0, '#2c3e50');
        gateGrad.addColorStop(1, '#1a252f');
        ctx.fillStyle = gateGrad;
        
        ctx.fillRect(environment.gateX, gateY, 25, 80); // Levý sloupek
        ctx.fillRect(environment.gateX + 110, gateY, 25, 80); // Pravý sloupek
        ctx.fillRect(environment.gateX, gateY, 135, 20); // Horní překlad
        ctx.shadowBlur = 0;

        // Cedule s cizím textem uprostřed brány
        ctx.fillStyle = 'rgba(16, 26, 19, 0.9)';
        ctx.fillRect(environment.gateX + 15, gateY + 25, 105, 45);
        ctx.strokeStyle = '#34495e';
        ctx.strokeRect(environment.gateX + 15, gateY + 25, 105, 45);

        // Nápis cizího slova
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '14px sans-serif';
        ctx.fillText(gateData.text, environment.gateX + 67, gateY + 53);
    }
}

// 4. Animace a kreslení Panáčka (Hráče) a Pumy na scéně
function drawEntities() {
    // Plynulé vyrovnávání Y pozice hráče podle vybrané lajny bran
    if (gameEngine.state === 'playing' && gameEngine.activeGates.length) {
        // Najdeme index správné brány a přitáhneme k ní panáčka, aby vizuálně běžel správně
        let correctIdx = gameEngine.activeGates.findIndex(g => g.isCorrect);
        if (correctIdx !== -1) {
            environment.targetVisualY = environment.lanesY[correctIdx];
        }
    } else if (gameEngine.state === 'door' || gameEngine.state === 'shop') {
        environment.targetVisualY = environment.lanesY[1]; // Střed před chrámem
    }

    // Interpolace pro hladký pohyb nahoru/dolů
    environment.playerVisualY += (environment.targetVisualY - environment.playerVisualY) * 0.1;

    let runCycle = Math.sin(environment.gameTime * 0.15) * 8;

    // Vykreslení panáčka 🏃‍♂️ (Procedurální kreslení s efektem běhu)
    let pX = 200;
    let pY = environment.playerVisualY + 30;

    if (gameEngine.state !== 'game_over') {
        // Prachové částice od nohou
        if (gameEngine.state === 'playing' && Math.random() < 0.4) {
            spawnParticle(pX, pY + 40, '#4a3319');
        }

        // Tělo / Silueta dobrodruha
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(pX, pY, 14, 0, Math.PI * 2); // Hlava
        ctx.fill();

        ctx.strokeStyle = '#f39c12'; // Batoh / Oblečení
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(pX, pY + 14);
        ctx.lineTo(pX - 5, pY + 40 + runCycle); // Noha 1
        ctx.moveTo(pX, pY + 14);
        ctx.lineTo(pX + 10, pY + 40 - runCycle); // Noha 2
        ctx.stroke();
        
        // Popis aktivních štítů/itemů nad hlavou
        if (gameEngine.upgrades.machete > 0) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = '12px sans-serif';
            ctx.fillText(`🪓 x${gameEngine.upgrades.machete}`, pX, pY - 22);
        }
    }

    // Vykreslení PUMY 🐆 za hráčem (Objevuje se přímo na plátně, pokud je extrémně blízko)
    if (gameEngine.playerDistance < 12 && gameEngine.state === 'playing') {
        let pumaX = pX - (gameEngine.playerDistance * 18); // Vzdálenost přepočtená na pixely
        let pumaY = environment.playerVisualY + 35 + Math.cos(environment.gameTime * 0.2) * 5;

        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(pumaX, pumaY, 18, 0, Math.PI * 2); // Tělo šelmy
        ctx.fill();
        ctx.fillStyle = '#d35400';
        ctx.fillRect(pumaX - 10, pumaY - 5, 30, 15);
        // Svítící červené oči
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pumaX + 8, pumaY - 6, 4, 4);
    }
}

// 5. Zvláštní obrazovka chrámu (State: door & shop)
function drawTempleScreen() {
    // Vykreslení velkých kamenných dveří přes pravou polovinu obrazovky
    let tX = canvas.width - 350;

    let wallGrad = ctx.createLinearGradient(tX, 0, canvas.width, canvas.height);
    wallGrad.addColorStop(0, '#2c3e50');
    wallGrad.addColorStop(1, '#0f171e');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(tX, 100, 350, canvas.height - 100);

    // Zámek a ornamenty dveří
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 5;
    ctx.strokeRect(tX + 50, 180, 250, 300);
    
    if (gameEngine.state === 'door') {
        // --- REŽIM KÓDOVÁNÍ DVEŘÍ ---
        ctx.fillStyle = '#fff';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🗿 CHRÁMOVÝ ZÁMEK 🗿', canvas.width / 2, 140);

        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`Zadej hlasem číselný kód:`, tX - 150, 260);
        
        // Velký displej s číslicí v Jazyce A, kterou hráč musí přeložit
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(tX - 320, 290, 300, 80);
        ctx.fillStyle = '#00ff66';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(gameEngine.currentDoorCode, tX - 170, 345);

        // Odpočet času (Hořící časomíra pod zámkem)
        let timeBarWidth = 300 * (gameEngine.doorTimeLeft / gameEngine.doorMaxTime);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(tX - 320, 390, timeBarWidth, 15);

        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Puma škrábe na dveře! Zbývá pokusů: ${gameEngine.doorAttemptsLeft}`, tX - 170, 440);

    } else if (gameEngine.state === 'shop') {
        // --- REŽIM OBCHODU ---
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛒 POLÁRNÍ INDYHO OBCHOD V CHRÁMU 🛒', canvas.width / 2, 100);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#bdc3c7';
        ctx.fillText('Řekni název předmětu pro nákup. Pro odchod řekni "BĚŽET".', canvas.width / 2, 135);

        // Nabídka zboží (Karty předmětů)
        let items = [
            { name: '🪓 Mačeta', desc: 'Zničí špatnou bránu', cost: '15 mincí', voice: '"mačeta"' },
            { name: '🥾 Rychlé boty', desc: 'Zpomalí pumu o 25%', cost: '30 mincí', voice: '"boty"' },
            { name: '🔑 Šperhák', desc: 'Zachrání tě u dveří', cost: '20 mincí', voice: '"šperhák"' }
        ];

        for (let i = 0; i < items.length; i++) {
            let it = items[i];
            let itemX = 140 + i * 260;
            
            ctx.fillStyle = '#1e3d24';
            ctx.fillRect(itemX, 180, 220, 240);
            ctx.strokeStyle = '#2ecc71';
            ctx.strokeRect(itemX, 180, 220, 240);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(it.name, itemX + 110, 220);
            
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#ecf0f1';
            ctx.fillText(it.desc, itemX + 110, 260);
            
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#f1c40f';
            ctx.fillText(it.cost, itemX + 110, 310);

            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#a29bfe';
            ctx.fillText(it.voice, itemX + 110, 370);
        }

        // Informace o tvém aktuálním vybavení dole
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Tvůj inventář: Mačety (${gameEngine.upgrades.machete}x) | Boty (${gameEngine.upgrades.boots ? 'ANO':'NE'}) | Šperháky (${gameEngine.upgrades.lockpick}x)`, canvas.width/2, 480);
    }
}

// 6. Výběr nové kategorie (State: category_select)
function drawCategorySelectScreen() {
    ctx.fillStyle = 'rgba(11, 29, 15, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 NOVÁ CESTA DŽUNGLÍ 🌿', canvas.width / 2, 120);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Vyber si hlasem novou oblast slovíček, kterou chceš přidat:', canvas.width / 2, 170);

    let cats = gameEngine.vocab.lockedCategories;
    if (cats.length === 0) return;

    // Vykreslení dostupných kategorií v řadě
    for (let i = 0; i < cats.length; i++) {
        let cName = cats[i];
        let cardX = (canvas.width / cats.length) * i + 40;
        let cardW = (canvas.width / cats.length) - 80;

        ctx.fillStyle = '#16a085';
        ctx.fillRect(cardX, 240, cardW, 140);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(cardX, 240, cardW, 140);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        // Mapování lokalizace pro zobrazení názvu
        let czName = cName === 'animals' ? 'Zvířata' : cName === 'family' ? 'Rodina' : cName === 'countries' ? 'Země' : 'Příroda';
        ctx.fillText(czName, cardX + cardW / 2, 300);

        ctx.font = 'italic 14px monospace';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`[Řekni "${czName}"]`, cardX + cardW / 2, 340);
    }
}

// 7. Hlavní úvodní menu (State: menu)
function drawMainMenu() {
    ctx.fillStyle = '#0a1a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Velký nápis hry s efektem záře
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JUNGLE SPEECH RUN', canvas.width / 2, 160);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Hlasová úniková hra pro výuku jazyků', canvas.width / 2, 220);

    // Box pro kliknutí k zahájení hry
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(canvas.width / 2 - 150, 300, 300, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('KLIKNI PRO START', canvas.width / 2, 338);

    // Informace o nastavených jazycích
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText(`Zadání (Jazyk A): ${gameEngine.langA} | Odpověď (Jazyk B): ${gameEngine.langB}`, canvas.width / 2, 420);
    ctx.fillText(`Obtížnost: ${gameEngine.difficulty.toUpperCase()} | Znalost: ${gameEngine.proficiency.toUpperCase()}`, canvas.width / 2, 450);
}

// 8. Konec hry (State: game_over)
function drawGameOver() {
    ctx.fillStyle = 'rgba(192, 41, 43, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOSTIHLA TĚ PUMA!', canvas.width / 2, 180);

    ctx.font = '24px sans-serif';
    ctx.fillText(`Konečné skóre: ${gameEngine.score}`, canvas.width / 2, 250);
    ctx.fillText(`Počet protnutých bran: ${gameEngine.gatesPassed}`, canvas.width / 2, 290);

    // Instrukce pro restart
    ctx.fillStyle = '#fff';
    ctx.fillRect(canvas.width / 2 - 160, 370, 320, 50);
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Znovu kliknutím myši', canvas.width / 2, 402);
}

// --- 6. HLAVNÍ SMYČKA REFRESHOVÁNÍ (GAMELOOP) ---
let lastTime = performance.now();

function gameLoop(currentTime) {
    // Výpočet delta času (v sekundách) pro plynulost nezávislou na FPS
    let deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    environment.gameTime++;

    // Aplikace screen shake efektu při chybě
    ctx.save();
    if (environment.screenShake > 0) {
        let dx = (Math.random() - 0.5) * environment.screenShake;
        let dy = (Math.random() - 0.5) * environment.screenShake;
        ctx.translate(dx, dy);
        environment.screenShake *= 0.9; // Útlum otřesů
        if (environment.screenShake < 0.5) environment.screenShake = 0;
    }

    // Aktualizace logiky vzdálenosti pumy
    updatePumaLogic(deltaTime);
    updateParticles();

    // Vykreslovací strom podle stavu hry
    if (gameEngine.state === 'menu') {
        drawMainMenu();
    } else {
        // Všechny herní režimy sdílí paralaxní pozadí pralesa
        drawParallaxBackground(gameEngine.pumaSpeedModifier);
        
        // Kreslení částic
        environment.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0; // Reset alphy

        drawEntities();
        drawPumaHUD();

        if (gameEngine.state === 'playing') {
            drawGates();
        } else if (gameEngine.state === 'door' || gameEngine.state === 'shop') {
            drawTempleScreen();
        } else if (gameEngine.state === 'category_select') {
            drawCategorySelectScreen();
        } else if (gameEngine.state === 'game_over') {
            drawGameOver();
        }
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// --- 7. OBSLUHA KLIKNUTÍ A ASYNCHRONNÍHO STARTU ---
canvas.addEventListener('click', (e) => {
    if (gameEngine.state === 'menu' || gameEngine.state === 'game_over') {
        // Spustíme asynchronní naslouchání (vyžaduje interakci uživatele s doménou)
        speechCore.startListening();
        
        // Inicializace hry: Zde si můžeš upravit startovní parametry
        // cs-CZ (Vstup) -> en-US (Překládáš do angličtiny), obtížnost, pokročilost
        initGameSession('cs-CZ', 'en-US', 'intermediate', 'basic');
    }
});

// Spuštění grafické smyčky
requestAnimationFrame(gameLoop);