// Výběr her z hlavního menu sladěný s index.html
document.addEventListener('DOMContentLoaded', () => {

    const safeAddListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    };

    // Oprava ID prvků z index.html
    safeAddListener('main-choose-solo', () => window.changeScreen('screen-solo-setup'));
    safeAddListener('menu-choose-game2', () => window.changeScreen('screen-game2-setup'));

    // Návratová tlačítka zpět do Hubu
    document.querySelectorAll('.btn-back-to-main').forEach(btn => {
        btn.addEventListener('click', () => window.changeScreen('screen-main'));
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