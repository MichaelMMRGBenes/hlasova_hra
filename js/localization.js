export const translations = {
    cs: {
        authTitle: "Přihlášení do hry", authLogin: "Přihlásit se", authRegister: "Registrovat se", authAnon: "Hrát bez přihlášení (5/den)",
        mainTitle: "Hlavní Menu", logout: "Odhlásit se", game1Name: "1. Běh přes překážky", game1Desc: "Rychlé vyslovování čísel.",
        game2Name: "2. Polární pexeso", game2Desc: "Opakuj sekvence na krách.", playBtn: "Hrát", back: "Zpět", quitGame: "Opustit hru",
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
    de: {
        authTitle: "Spiel-Login", authLogin: "Anmelden", authRegister: "Registrieren", authAnon: "Anonym spielen (5/Tag)",
        mainTitle: "Hauptmenü", logout: "Ausloggen", game1Name: "1. Hürdenlauf", game1Desc: "Zahlen schnell aussprechen.",
        game2Name: "2. Polar-Memory", game2Desc: "Wiederhole die Sequenzen auf den Eisschollen.", playBtn: "Spielen", back: "Zurück", quitGame: "Spiel verlassen",
        game1SetupTitle: "Renneinstellungen", modeSolo: "Solo gegen KI", modeMulti: "Mehrspieler", labelDifficulty: "Schwierigkeit:",
        labelTrack: "Streckenlänge:", labelMode: "Modus:", startRace: "Rennen starten", game2SetupTitle: "Memory-Einstellungen", startIce: "Aufs Eis springen"
    },
    fr: {
        authTitle: "Connexion au jeu", authLogin: "Se connecter", authRegister: "S'inscrire", authAnon: "Jouer anonymement (5/jour)",
        mainTitle: "Menu principal", logout: "Se déconnecter", game1Name: "1. Course de haies", game1Desc: "Prononcez les chiffres rapidement.",
        game2Name: "2. Memory polaire", game2Desc: "Répétez la séquence sur les glaçons.", playBtn: "Jouer", back: "Retour", quitGame: "Quitter le jeu",
        game1SetupTitle: "Paramètres de la course", modeSolo: "Solo vs IA", modeMulti: "Multijoueur", labelDifficulty: "Difficulté :",
        labelTrack: "Longueur de la piste :", labelMode: "Mode :", startRace: "Démarrer la course", game2SetupTitle: "Paramètres du memory", startIce: "Sauter sur la glace"
    },
    es: {
        authTitle: "Inicio de sesión", authLogin: "Iniciar sesión", authRegister: "Registrarse", authAnon: "Jugar de forma anónima (5/día)",
        mainTitle: "Menú principal", logout: "Cerrar sesión", game1Name: "1. Carrera de vallas", game1Desc: "Di los números rápido.",
        game2Name: "2. Memoria polar", game2Desc: "Repite la secuencia en los témpanos de hielo.", playBtn: "Jugar", back: "Volver", quitGame: "Salir del juego",
        game1SetupTitle: "Ajustes de la carrera", modeSolo: "Solo contra IA", modeMulti: "Multijugador", labelDifficulty: "Dificultad:",
        labelTrack: "Longitud de la pista:", labelMode: "Modo:", startRace: "Iniciar carrera", game2SetupTitle: "Ajustes de memoria", startIce: "Saltar al hielo"
    }
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