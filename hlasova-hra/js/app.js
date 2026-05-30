import { auth } from './firebase-config.js';
import { updateUILanguage } from './localization.js';
import { updateCreditsUI } from './credits.js';
import './auth.js';
import './menu.js';
import './game1-run.js';
import './game2-pexeso.js';

export let globalGameState = {
    currentLanguage: 'cs',
    isUserLogged: false
};

// Funkce pro bezpečné přepínání obrazovek
export function changeScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    
    updateCreditsUI();
}

// Inicializace při načtení stránky
window.addEventListener('DOMContentLoaded', () => {
    // Načtení uloženého jazyka
    const savedLang = localStorage.getItem('ui_lang') || 'cs';
    document.getElementById('global-lang-selector').value = savedLang;
    updateUILanguage(savedLang);

    // Sledování stavu přihlášení ve Firebase
    auth.onAuthStateChanged((user) => {
        const nameDisplay = document.getElementById('user-display-name');
        if (user) {
            globalGameState.isUserLogged = true;
            nameDisplay.textContent = user.isAnonymous ? "Anonymní běžec" : (user.displayName || user.email);
            changeScreen('screen-main');
        } else {
            globalGameState.isUserLogged = false;
            nameDisplay.textContent = "Nepřihlášen";
            changeScreen('screen-auth');
        }
        updateCreditsUI();
    });

    // Posluchač pro změnu jazyka v hlavičce
    document.getElementById('global-lang-selector').addEventListener('change', (e) => {
        updateUILanguage(e.target.value);
    });
});