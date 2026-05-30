import { auth } from './firebase-config.js';

export function checkAndConsumeCredit() {
    const user = auth.currentUser;
    // Pokud je uživatel přihlášen, má neomezené hraní
    if (user && !user.isAnonymous) {
        return { allowed: true, remaining: '∞' };
    }

    const today = new Date().toISOString().split('T')[0];
    let localData = JSON.parse(localStorage.getItem('anon_credits')) || { date: today, count: 0 };

    if (localData.date !== today) {
        localData = { date: today, count: 0 };
    }

    if (localData.count >= 5) {
        return { allowed: false, remaining: 0 };
    }

    localData.count += 1;
    localStorage.setItem('anon_credits', JSON.stringify(localData));
    return { allowed: true, remaining: 5 - localData.count };
}

export function updateCreditsUI() {
    const display = document.getElementById('user-credits-display');
    const user = auth.currentUser;
    
    if (user && !user.isAnonymous) {
        display.textContent = "🏆 Premium (Neomezeno)";
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const localData = JSON.parse(localStorage.getItem('anon_credits')) || { date: today, count: 0 };
    const left = localData.date === today ? 5 - localData.count : 5;
    display.textContent = `🎟️ Volné hry: ${left}/5`;
}