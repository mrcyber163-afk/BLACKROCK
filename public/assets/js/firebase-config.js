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

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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