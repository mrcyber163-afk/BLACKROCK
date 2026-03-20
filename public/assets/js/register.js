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

// Validate Zambian phone
export function validateZambianPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^[97][0-9]{8}$/.test(cleaned);
}

// Validate email
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Generate referral code
export function generateReferralCode(username) {
    const prefix = username.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
}

// Show notification
export function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification-popup');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-popup ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Handle registration
export async function handleRegistration(formData) {
    const { username, email, phone, password, referralCode, terms } = formData;
    
    // Validate phone
    if (!validateZambianPhone(phone)) {
        showNotification('Please enter a valid Zambian phone number (starting with 97)', 'error');
        return false;
    }
    
    // Validate email
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }
    
    // Validate username
    if (username.length < 3) {
        showNotification('Username must be at least 3 characters', 'error');
        return false;
    }
    
    // Validate password
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return false;
    }
    
    // Check terms
    if (!terms) {
        showNotification('You must agree to the terms and conditions', 'error');
        return false;
    }
    
    try {
        // Check if email exists
        const usersRef = collection(db, 'users');
        const emailQuery = query(usersRef, where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            showNotification('Email already registered', 'error');
            return false;
        }
        
        // Check if phone exists
        const phoneQuery = query(usersRef, where('phone', '==', '+260' + phone));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
            showNotification('Phone number already registered', 'error');
            return false;
        }
        
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate referral code
        const userReferralCode = generateReferralCode(username);
        
        // Create user document
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: username,
            email: email,
            phone: '+260' + phone,
            country: 'Zambia',
            referralCode: userReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            totalEarned: 0,
            totalTasks: 0,
            status: 'active',
            role: 'user',
            level: 'VIP 1',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        });
        
        showNotification('Registration successful! Redirecting to login...', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
        return true;
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/api-key-not-valid') {
            errorMessage = 'API Key error. Please check Firebase configuration.';
        }
        
        showNotification(errorMessage, 'error');
        return false;
    }
}