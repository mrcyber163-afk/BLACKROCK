// public/assets/js/admin/admin-login.js
import { 
    auth, 
    db,
    signInWithEmailAndPassword,
    doc,
    getDoc,
    onAuthStateChanged
} from '../firebase-config.js';
import { showNotification } from '../utils.js';

// Check if already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if user is admin
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }
});

// Toggle password visibility
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = document.querySelector('.toggle-password');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
};

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const span = errorDiv.querySelector('span');
    span.textContent = message;
    errorDiv.style.display = 'flex';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (!successDiv) return;
    
    const span = successDiv.querySelector('span');
    span.textContent = message;
    successDiv.style.display = 'flex';
    
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Handle login form submission
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember')?.checked || false;
    const loginBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }
    
    // Disable button
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    
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
        
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            await auth.signOut();
            showError('User account not found');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Access Admin Panel <i class="fas fa-lock-open"></i>';
            return;
        }
        
        const userData = userDoc.data();
        
        if (userData.role !== 'admin') {
            await auth.signOut();
            showError('Access denied. Admin privileges required.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Access Admin Panel <i class="fas fa-lock-open"></i>';
            return;
        }
        
        // Check if account is active
        if (userData.status === 'suspended') {
            await auth.signOut();
            showError('Your admin account has been suspended');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Access Admin Panel <i class="fas fa-lock-open"></i>';
            return;
        }
        
        // Update last login
        await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString(),
            lastLoginIp: 'admin-panel'
        });
        
        showSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Admin login error:', error);
        
        let errorMessage = 'Login failed';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Admin account not found';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Try again later';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Check your connection.';
        }
        
        showError(errorMessage);
        
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Access Admin Panel <i class="fas fa-lock-open"></i>';
    }
});

// Add enter key support
document.getElementById('password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('adminLoginForm').dispatchEvent(new Event('submit'));
    }
});

// Clear error on input
document.getElementById('email')?.addEventListener('input', () => {
    document.getElementById('errorMessage').style.display = 'none';
});

document.getElementById('password')?.addEventListener('input', () => {
    document.getElementById('errorMessage').style.display = 'none';
});