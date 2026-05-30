import { changeScreen } from './app.js';
import { checkAndConsumeCredit } from './credit-system.js';

// Výběr her z hlavního menu
document.getElementById('menu-choose-game1').addEventListener('click', () => changeScreen('screen-game1-setup'));
document.getElementById('menu-choose-game2').addEventListener('click', () => changeScreen('screen-game2-setup'));

// Návratová tlačítka zpět do Hubu
document.querySelectorAll('.btn-back-to-main').forEach(btn => {
    btn.addEventListener('click', () => changeScreen('screen-main'));
});

// Specifické větvení pro Hru 1 (Běh)
document.getElementById('game1-btn-solo').addEventListener('click', () => {
    document.getElementById('game1-options-box').style.display = 'block';
});

document.getElementById('game1-btn-multi').addEventListener('click', () => {
    document.getElementById('game1-options-box').style.display = 'none';
    alert("Zde se v budoucnu napojí otevírání Firebase místností.");
});