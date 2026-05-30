import { changeScreen } from './app.js';

document.addEventListener('DOMContentLoaded', () => {

    const safeAddListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    };

    // Navigace pro Hru 2 (Pexeso)
    // Otevírání a režimy Hry 1 (Běh) jsou nyní plně řízeny v game1-run.js, 
    // aby nedocházelo ke kolizím s Firebase místnostmi.
    safeAddListener('menu-choose-game2', () => changeScreen('screen-game2-setup'));

    // Univerzální návratová tlačítka zpět do hlavního menu (Hubu)
    // Pro Hru 1 je tento klik odchytáván i v game1-run.js kvůli bezpečnému resetu enginu.
    document.querySelectorAll('.btn-back-to-main').forEach(btn => {
        btn.addEventListener('click', () => changeScreen('screen-main'));
    });
});