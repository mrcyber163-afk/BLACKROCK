// public/assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    increment,
    arrayUnion,
    arrayRemove,
    setDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
    getDatabase, 
    ref, 
    set, 
    onValue, 
    push,
    update as rtdbUpdate,
    get as rtdbGet,
    remove as rtdbRemove
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_ChvWyfapmETOmtl_-tbRyrRMrvdaoyE",
    authDomain: "blackrock-d05c9.firebaseapp.com",
    projectId: "blackrock-d05c9",
    storageBucket: "blackrock-d05c9.firebasestorage.app",
    messagingSenderId: "414237812515",
    appId: "1:414237812515:web:18412f867a18f7e7ef0e96",
    measurementId: "G-6GV15EXLGS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { 
    app, 
    auth, 
    db, 
    rtdb,
    
    // Auth functions
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendEmailVerification,
    
    // Firestore functions
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    increment,
    arrayUnion,
    arrayRemove,
    setDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch,
    
    // Realtime Database functions
    ref, 
    set, 
    onValue, 
    push,
    rtdbUpdate,
    rtdbGet,
    rtdbRemove
};