import { changeScreen } from './app.js';
import { checkAndConsumeCredit } from './credit-system.js';

// Vše zabalíme do DOMContentLoaded, aby se kód spustil až po načtení HTML
document.addEventListener('DOMContentLoaded', () => {

    // Pomocná funkce pro bezpečné přidání listeneru
    const safeAddListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    };

    // Výběr her z hlavního menu
    safeAddListener('menu-choose-game1', () => changeScreen('screen-game1-setup'));
    safeAddListener('menu-choose-game2', () => changeScreen('screen-game2-setup'));

    // Návratová tlačítka zpět do Hubu
    document.querySelectorAll('.btn-back-to-main').forEach(btn => {
        btn.addEventListener('click', () => changeScreen('screen-main'));
    });

    // Specifické větvení pro Hru 1 (Běh)
    safeAddListener('game1-btn-solo', () => {
        const box = document.getElementById('game1-options-box');
        if (box) box.style.display = 'block';
    });

    safeAddListener('game1-btn-multi', () => {
        const box = document.getElementById('game1-options-box');
        if (box) box.style.display = 'none';
        alert("Zde se v budoucnu napojí otevírání Firebase místností.");
    });
});