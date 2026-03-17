// public/assets/js/register.js
import { 
    auth, 
    db,
    createUserWithEmailAndPassword,
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from './firebase-config.js';
import { 
    showNotification, 
    validateZambianPhone, 
    validateEmail,
    generateReferralCode,
    showLoading,
    hideLoading
} from './utils.js';

// Handle registration
export async function handleRegister(event) {
    event.preventDefault();
    
    // Get form data
    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const referralCode = document.getElementById('referral')?.value.trim();
    const terms = document.getElementById('terms')?.checked;
    
    // Validate
    if (!username || !email || !phone || !password || !confirmPassword) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Username must be at least 3 characters', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }
    
    if (!validateZambianPhone(phone)) {
        showNotification('Please enter a valid Zambian phone number', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (!terms) {
        showNotification('You must agree to the terms', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Check if username exists
        const usersRef = collection(db, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
            hideLoading();
            showNotification('Username already taken', 'error');
            return;
        }
        
        // Check if email exists
        const emailQuery = query(usersRef, where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            hideLoading();
            showNotification('Email already registered', 'error');
            return;
        }
        
        // Check if phone exists
        const phoneQuery = query(usersRef, where('phone', '==', `+260${phone}`));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
            hideLoading();
            showNotification('Phone number already registered', 'error');
            return;
        }
        
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate referral code
        const userReferralCode = generateReferralCode(username);
        
        // Create user document
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: username,
            email: email,
            phone: `+260${phone}`,
            country: 'Zambia',
            referralCode: userReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            totalEarned: 0,
            totalTasks: 0,
            status: 'pending_activation',
            level: 'VIP 1',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            emailVerified: false
        });
        
        // Handle referral if exists
        if (referralCode) {
            const referrerQuery = query(usersRef, where('referralCode', '==', referralCode));
            const referrerSnapshot = await getDocs(referrerQuery);
            
            if (!referrerSnapshot.empty) {
                const referrerDoc = referrerSnapshot.docs[0];
                
                await setDoc(doc(db, 'referrals', `${referrerDoc.id}_${user.uid}`), {
                    referrerId: referrerDoc.id,
                    referredId: user.uid,
                    referredUsername: username,
                    bonus: 5,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        // Store pending user ID
        localStorage.setItem('pendingUserId', user.uid);
        
        hideLoading();
        showNotification('Registration successful! Redirecting to activation...', 'success');
        
        setTimeout(() => {
            window.location.href = 'activation.html';
        }, 2000);
        
    } catch (error) {
        hideLoading();
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Attach to window
window.handleRegister = handleRegister;

// Phone input formatting
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
        });
    }
    
    // Check for referral in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        const referralInput = document.getElementById('referral');
        if (referralInput) referralInput.value = ref;
    }
});