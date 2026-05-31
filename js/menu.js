import { changeScreen } from './app.js';

document.addEventListener('DOMContentLoaded', () => {

    const safeAddListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    };

    // Navigace pro Hru 2 (Pexeso)
    safeAddListener('menu-choose-game2', () => changeScreen('screen-game2-setup'));

    // 🌟 PŘIDÁNO: Navigace pro Hru 3 (Útěk před pumou)
    safeAddListener('menu-choose-game3', () => changeScreen('screen-game3-play'));

    // Univerzální návratová tlačítka zpět do hlavního menu (Hubu)
    document.querySelectorAll('.btn-back-to-main').forEach(btn => {
        btn.addEventListener('click', () => changeScreen('screen-main'));
    });
});