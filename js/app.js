import { auth } from './firebase-config.js';
import { updateUILanguage } from './localization.js';
import { updateCreditsUI } from './credit-system.js';
import './auth.js';
import './menu.js';
import './game1-run.js';
import './game2-pexeso.js'; 
import './game3-junglerun.js'; // 👈 1. PŘIDÁNO: Importování nové hry do bundlu

export let globalGameState = {
    currentLanguage: 'cs',
    isUserLogged: false
};

export function changeScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    
    // Změna z target.add('active') na target.classList.add('active')
    if (target) target.classList.add('active'); 
    
    const profileBox = document.getElementById('global-profile-box');
    if (profileBox) {
        if (['screen-game', 'screen-victory', 'screen-game2-play', 'screen-game3-play'].includes(screenId)) {
            profileBox.style.display = 'none';
        } else {
            profileBox.style.display = 'block';
        }
    }

    updateCreditsUI();
}
window.changeScreen = changeScreen;

// Inicializace při načtení stránky
window.addEventListener('DOMContentLoaded', () => {
    // Načtení uloženého jazyka
    const savedLang = localStorage.getItem('ui_lang') || 'cs';
    const langSelector = document.getElementById('global-lang-selector');
    if (langSelector) {
        langSelector.value = savedLang;
    }
    updateUILanguage(savedLang);

    // Sledování stavu přihlášení ve Firebase
    auth.onAuthStateChanged((user) => {
        const nameDisplay = document.getElementById('user-display-name');
        if (user) {
            globalGameState.isUserLogged = true;
            if (nameDisplay) {
                nameDisplay.textContent = user.isAnonymous ? "Anonymní běžec" : (user.displayName || user.email);
            }
            window.changeScreen('screen-main');
        } else {
            globalGameState.isUserLogged = false;
            if (nameDisplay) {
                nameDisplay.textContent = "Nepřihlášen";
            }
            window.changeScreen('screen-auth');
        }
        updateCreditsUI();
    });

    // Posluchač pro změnu jazyka v hlavičce
    document.getElementById('global-lang-selector').addEventListener('change', (e) => {
        updateUILanguage(e.target.value);
    });
});