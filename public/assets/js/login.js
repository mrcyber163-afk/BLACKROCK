// public/assets/js/login.js
import { 
    auth,
    db,
    signInWithEmailAndPassword,
    doc,
    getDoc,
    updateDoc
} from './firebase-config.js';
import { showNotification } from './utils.js';

// Handle login
export async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const remember = document.getElementById('remember')?.checked || false;
    const loginBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        // Set persistence
        if (remember) {
            await auth.setPersistence('local');
        } else {
            await auth.setPersistence('session');
        }
        
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            await auth.signOut();
            showNotification('User data not found', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
            return;
        }
        
        const userData = userDoc.data();
        
        // Check account status
        if (userData.status === 'suspended') {
            await auth.signOut();
            showNotification('Your account has been suspended', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
            return;
        }
        
        if (userData.status === 'pending_activation') {
            showNotification('Please activate your account first', 'info');
            setTimeout(() => {
                window.location.href = 'activation.html';
            }, 1500);
            return;
        }
        
        // Update last login
        await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString()
        });
        
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (userData.role === 'admin') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 1500);
        
    } catch (error) {
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
        
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
}

// Toggle password visibility
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    const icon = document.querySelector('.toggle-password');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
};

// Attach to window
window.handleLogin = handleLogin;
window.togglePassword = togglePassword;