// public/assets/js/activation.js
import { 
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs
} from './firebase-config.js';
import { 
    showNotification, 
    validateZambianPhone,
    showLoading,
    hideLoading
} from './utils.js';

// Check for pending user
const pendingUserId = localStorage.getItem('pendingUserId');

if (!pendingUserId) {
    window.location.href = 'register.html';
}

// Initialize activation page
export async function initActivation() {
    // Check if user is already logged in and active
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().status === 'active') {
                window.location.href = 'dashboard.html';
            }
        }
    });
    
    // Load payment details
    loadPaymentDetails();
}

// Load payment details
function loadPaymentDetails() {
    // In production, these would come from Firestore
    document.getElementById('networkDisplay').textContent = 'Airtel Money';
    document.getElementById('phoneDisplay').textContent = '0977123456';
    document.getElementById('nameDisplay').textContent = 'BlackRock Official';
}

// Copy USSD
export function copyUssd(ussd) {
    navigator.clipboard.writeText(ussd).then(() => {
        showNotification('USSD code copied!', 'success');
    });
}

// Submit activation
export async function submitActivation(event) {
    event.preventDefault();
    
    const senderPhone = document.getElementById('senderPhone').value;
    const transactionMessage = document.getElementById('transactionMessage').value;
    const submitBtn = document.getElementById('submitBtn');
    
    if (!validateZambianPhone(senderPhone)) {
        showNotification('Please enter a valid Zambian phone number', 'error');
        return;
    }
    
    if (!transactionMessage) {
        showNotification('Please paste the transaction message', 'error');
        return;
    }
    
    showLoading();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    try {
        // Create activation request
        await addDoc(collection(db, 'activations'), {
            userId: pendingUserId,
            senderPhone: `+260${senderPhone}`,
            transactionMessage: transactionMessage,
            amount: 50,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        hideLoading();
        showNotification('Activation request submitted! You will be notified once verified.', 'success');
        
        // Redirect to login
        setTimeout(() => {
            localStorage.removeItem('pendingUserId');
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        hideLoading();
        console.error('Activation error:', error);
        showNotification('Failed to submit activation request', 'error');
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Payment';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initActivation);

// Attach to window
window.copyUssd = copyUssd;
window.submitActivation = submitActivation;