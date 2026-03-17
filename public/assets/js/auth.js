// public/assets/js/auth.js
import { 
    auth, 
    db,
    signOut,
    onAuthStateChanged,
    doc,
    getDoc
} from './firebase-config.js';
import { showNotification, requireAuth } from './utils.js';

// Check auth state
export function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Redirect to login if not on public pages
            const publicPages = ['index.html', 'login.html', 'register.html', 'forgot-password.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (!publicPages.includes(currentPage)) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Get current user data
export async function getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        showNotification('Logged out successfully', 'success');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Check if account is active
export async function isAccountActive() {
    const userData = await getCurrentUserData();
    return userData?.status === 'active';
}

// Redirect if not active
export async function requireActiveAccount() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    const userData = await getCurrentUserData();
    if (userData?.status !== 'active') {
        window.location.href = 'activation.html';
        return false;
    }
    
    return true;
}

// Initialize auth on all pages
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
});

// Make logout available globally
window.logout = logout;