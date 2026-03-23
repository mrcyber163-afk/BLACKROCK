// public/assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    setDoc,
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    increment,
    arrayUnion,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD_ChvWyfapmETOmtl_-tbRyrRMrvdaoyE",
    authDomain: "blackrock-d05c9.firebaseapp.com",
    projectId: "blackrock-d05c9",
    storageBucket: "blackrock-d05c9.firebasestorage.app",
    messagingSenderId: "414237812515",
    appId: "1:414237812515:web:18412f867a18f7e7ef0e96",
    measurementId: "G-6GV15EXLGS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
    app, auth, db,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail,
    collection, addDoc, doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc,
    query, where, orderBy, limit, increment, arrayUnion, onSnapshot
};