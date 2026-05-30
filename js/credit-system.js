import { auth, db } from './firebase-config.js';

/**
 * Zkontroluje a odečte kredit anonymnímu uživateli přímo ve Firebase DB.
 * Vzhledem k síťové komunikaci vrací Promise (je asynchronní).
 */
export async function checkAndConsumeCredit() {
    const user = auth.currentUser;
    
    // Pokud uživatel není přihlášen vůbec, nepustíme ho dál
    if (!user) {
        return { allowed: false, remaining: 0 };
    }

    // Pokud je uživatel registrovaný (není anonymní), má neomezené hraní
    if (!user.isAnonymous) {
        return { allowed: true, remaining: '∞' };
    }

    const uid = user.uid;
    const today = new Date().toISOString().split('T')[0];
    const userCreditsRef = db.ref(`users/${uid}/anon_credits`);

    try {
        // Načteme aktuální data z Firebase
        const snapshot = await userCreditsRef.once('value');
        let data = snapshot.val();

        // Pokud záznam neexistuje nebo je z jiného dne, resetujeme počítadlo
        if (!data || data.date !== today) {
            data = { date: today, count: 0 };
        }

        // Pokud už vyčerpal 5 her, nepovolíme start
        if (data.count >= 5) {
            return { allowed: false, remaining: 0 };
        }

        // Přičteme odehranou hru a uložíme zpět do Firebase
        data.count += 1;
        await userCreditsRef.set(data);

        return { allowed: true, remaining: 5 - data.count };
    } catch (error) {
        console.error("Chyba Firebase při kontrole kreditů:", error);
        // V případě výpadku raději vrátíme false, aby se hra nespustila chybně
        return { allowed: false, remaining: 0 };
    }
}

/**
 * Aktualizuje uživatelské rozhraní podle aktuálního stavu ve Firebase DB.
 */
export async function updateCreditsUI() {
    const display = document.getElementById('user-credits-display');
    if (!display) return;

    const user = auth.currentUser;
    
    if (!user) {
        display.textContent = "🎟️ Volné hry: -";
        return;
    }

    if (!user.isAnonymous) {
        display.textContent = "🏆 Premium (Neomezeno)";
        return;
    }

    const uid = user.uid;
    const today = new Date().toISOString().split('T')[0];

    try {
        const snapshot = await db.ref(`users/${uid}/anon_credits`).once('value');
        const data = snapshot.val();
        
        // Spočítáme zbývající hry
        const left = (data && data.date === today) ? 5 - data.count : 5;
        display.textContent = `🎟️ Volné hry: ${left}/5`;
    } catch (error) {
        console.error("Chyba při vykreslování UI kreditů:", error);
        display.textContent = "🎟️ Volné hry: Nenačteno";
    }
}