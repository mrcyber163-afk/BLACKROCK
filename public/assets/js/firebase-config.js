// public/assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    addDoc,
    updateDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔥 CONFIG YA PROJEKTI YAKO BLACKROCK-D05C9
const firebaseConfig = {
    apiKey: "AIzaSyA7BE4_9WQ49CwU34O___t5T6H4MhBOPAw",
    authDomain: "blackrock-d05c9.firebaseapp.com",
    projectId: "blackrock-d05c9",
    storageBucket: "blackrock-d05c9.firebasestorage.app",
    messagingSenderId: "545981433269",
    appId: "1:545981433269:web:9be18707e2cfe3aab457d9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
    auth, 
    db,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    addDoc,
    updateDoc,
    query, 
    where
};