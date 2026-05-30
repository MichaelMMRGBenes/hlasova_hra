export const translations = {
    cs: {
        authTitle: "Přihlášení do hry", authLogin: "Přihlásit se", authRegister: "Registrovat se", authAnon: "Hrát bez přihlášení (5/den)",
        mainTitle: "Hlavní Menu", logout: "Odhlásit se", game1Name: "1. Běh přes překážky", game1Desc: "Rychlé vyslovování čísel.",
        game2Name: "2. Polární pexeso", game2Desc: "Opakuj sekvence na kryách.", playBtn: "Hrát", back: "Zpět", quitGame: "Opustit hru",
        game1SetupTitle: "Nastavení Závodu", modeSolo: "Sólo s AI", modeMulti: "Multiplayer", labelDifficulty: "Obtížnost:",
        labelTrack: "Délka trati:", labelMode: "Režim:", startRace: "Odstartovat závod", game2SetupTitle: "Nastavení Pexesa", startIce: "Skočit na kry"
    },
    fi: {
        authTitle: "Kirjaudu peliin", authLogin: "Kirjaudu", authRegister: "Rekisteröidy", authAnon: "Pelaa ilman tiliä (5/pvä)",
        mainTitle: "Päävalikko", logout: "Kirjaudu ulos", game1Name: "1. Aitajuoksu", game1Desc: "Sano numerot nopeasti.",
        game2Name: "2. Napajäätikkö-muistipeli", game2Desc: "Toista sarjat jääpaloilla.", playBtn: "Pelaa", back: "Takaisin", quitGame: "Lopeta peli",
        game1SetupTitle: "Kilpailun Asetukset", modeSolo: "Yksinpeli tekoälyllä", modeMulti: "Moninpeli", labelDifficulty: "Vaikeusaste:",
        labelTrack: "Radan pituus:", labelMode: "Tila:", startRace: "Aloita kilpailu", game2SetupTitle: "Muistipelin Asetukset", startIce: "Hyppää jäälle"
    },
    en: {
        authTitle: "Game Login", authLogin: "Sign In", authRegister: "Sign Up", authAnon: "Play anonymously (5/day)",
        mainTitle: "Main Menu", logout: "Log Out", game1Name: "1. Hurdle Race", game1Desc: "Speak numbers fast.",
        game2Name: "2. Polar Memory", game2Desc: "Repeat the sequence on ice floes.", playBtn: "Play", back: "Back", quitGame: "Quit Game",
        game1SetupTitle: "Race Settings", modeSolo: "Solo vs AI", modeMulti: "Multiplayer", labelDifficulty: "Difficulty:",
        labelTrack: "Track length:", labelMode: "Mode:", startRace: "Start Race", game2SetupTitle: "Memory Settings", startIce: "Jump on Ice"
    },
    de: { /* Němčina */ },
    fr: { /* Francouzština */ },
    es: { /* Španělština */ }
};

export function updateUILanguage(lang) {
    const langData = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (langData[key]) {
            elem.textContent = langData[key];
        }
    });
    localStorage.setItem('ui_lang', lang);
}