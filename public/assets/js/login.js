// public/assets/js/login.js
import { 
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from './firebase-config.js';
import { showNotification, showLoading, hideLoading } from './utils.js';

// Handle login
export async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const remember = document.getElementById('remember')?.checked || false;
    
    if (!email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Set persistence
        if (remember) {
            await auth.setPersistence('local');
        } else {
            await auth.setPersistence('session');
        }
        
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        hideLoading();
        showNotification('Login successful!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Try again later';
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Toggle password visibility
export function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = document.querySelector('.toggle-password');
    if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
}

// Fill demo credentials
export function fillDemo(email, password) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
}

// Check if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Redirect to dashboard if on login page
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === '') {
            window.location.href = 'dashboard.html';
        }
    }
});

// Attach to window
window.handleLogin = handleLogin;
window.togglePassword = togglePassword;
window.fillDemo = fillDemo;