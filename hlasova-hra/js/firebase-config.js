const firebaseConfig = {
    apiKey: "AIzaSyADcQnyF13k2oHefln1rNBqvZm5_BnroPo",
    authDomain: "hlasovahra.firebaseapp.com",
    databaseURL: "https://hlasovahra-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hlasovahra",
    storageBucket: "hlasovahra.firebasestorage.app",
    messagingSenderId: "7010973655",
    appId: "1:7010973655:web:a9134f8f83d4b1e104bd92"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.database();