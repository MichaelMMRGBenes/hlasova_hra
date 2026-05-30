import { auth } from './firebase-config.js';
import { changeScreen } from './app.js';

document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value;
    if(email && pass) auth.signInWithEmailAndPassword(email, pass).catch(err => alert(err.message));
});

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value;
    if(email && pass) auth.createUserWithEmailAndPassword(email, pass).catch(err => alert(err.message));
});

document.getElementById('btn-google-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert(err.message));
});

document.getElementById('btn-anonymous-play').addEventListener('click', () => {
    auth.signInAnonymously().catch(err => alert(err.message));
});

document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut().then(() => changeScreen('screen-auth'));
});