// public/assets/js/deposit.js
import { 
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot,
    increment
} from './firebase-config.js';
import { 
    showNotification, 
    validateZambianPhone,
    formatCurrency,
    showLoading,
    hideLoading,
    requireActiveAccount
} from './utils.js';

let currentUser = null;
let userData = null;
let selectedPayment = null;

// Payment methods
const paymentMethods = {
    airtel: {
        name: 'Airtel Money',
        phone: '0977123456',
        accountName: 'BlackRock Official',
        ussd: '*126#'
    },
    mtn: {
        name: 'MTN Money',
        phone: '0977654321',
        accountName: 'BlackRock Official',
        ussd: '*126#'
    }
};

// Initialize deposit page
export async function initDeposit() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    checkForApprovedDeposits();
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateBalance();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Update balance
function updateBalance() {
    const balanceEls = document.querySelectorAll('#balance, #balanceCard');
    balanceEls.forEach(el => {
        if (el) el.textContent = formatCurrency(userData?.balance);
    });
}

// Select payment method
export function selectPayment(method) {
    selectedPayment = method;
    
    // Update UI
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show payment details
    const details = paymentMethods[method];
    document.getElementById('displayNetwork').textContent = details.name;
    document.getElementById('displayNumber').textContent = details.phone;
    document.getElementById('displayName').textContent = details.accountName;
    
    document.getElementById('paymentDetails').style.display = 'block';
}

// Set amount
export function setAmount(amount) {
    document.getElementById('amount').value = amount;
    
    document.querySelectorAll('.amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

// Custom amount
export function customAmount() {
    document.getElementById('amount').focus();
    document.querySelectorAll('.amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
}

// Copy text
export function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    });
}

// Copy all details
export function copyAllDetails() {
    const network = document.getElementById('displayNetwork').textContent;
    const phone = document.getElementById('displayNumber').textContent;
    const name = document.getElementById('displayName').textContent;
    
    copyText(`Network: ${network}\nPhone: ${phone}\nName: ${name}`);
}

// Submit deposit
export async function submitDeposit(event) {
    event.preventDefault();
    
    const amount = document.getElementById('amount').value;
    const senderPhone = document.getElementById('senderPhone').value;
    const transactionMessage = document.getElementById('transactionMessage').value;
    const depositBtn = document.getElementById('depositBtn');
    
    if (!selectedPayment) {
        showNotification('Please select a payment method', 'error');
        return;
    }
    
    if (!amount || amount < 50) {
        showNotification('Minimum deposit is 50 ZMW', 'error');
        return;
    }
    
    if (!validateZambianPhone(senderPhone)) {
        showNotification('Please enter a valid Zambian phone number', 'error');
        return;
    }
    
    if (!transactionMessage) {
        showNotification('Please paste the transaction message', 'error');
        return;
    }
    
    showLoading();
    depositBtn.disabled = true;
    depositBtn.textContent = 'Processing...';
    
    try {
        // Create deposit request
        const depositRef = await addDoc(collection(db, 'deposits'), {
            userId: currentUser.uid,
            username: userData.username,
            amount: parseFloat(amount),
            paymentMethod: selectedPayment,
            senderPhone: `+260${senderPhone}`,
            transactionMessage: transactionMessage,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString()
        });
        
        // Add to user's deposits
        await addDoc(collection(db, 'users', currentUser.uid, 'deposits'), {
            depositId: depositRef.id,
            amount: parseFloat(amount),
            paymentMethod: selectedPayment,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        hideLoading();
        showNotification('Deposit request submitted! You will be notified within 20 minutes.', 'success');
        
        // Reset form
        document.getElementById('depositForm').reset();
        document.getElementById('paymentDetails').style.display = 'none';
        selectedPayment = null;
        
        // Listen for approval
        listenForDepositApproval(depositRef.id);
        
    } catch (error) {
        hideLoading();
        console.error('Deposit error:', error);
        showNotification('Failed to submit deposit request', 'error');
    } finally {
        depositBtn.disabled = false;
        depositBtn.textContent = 'Submit Deposit Request';
    }
}

// Listen for deposit approval
function listenForDepositApproval(depositId) {
    const depositRef = doc(db, 'deposits', depositId);
    
    onSnapshot(depositRef, (doc) => {
        if (doc.exists()) {
            const deposit = doc.data();
            
            if (deposit.status === 'approved') {
                localStorage.setItem('depositApproved', 'true');
                localStorage.setItem('depositAmount', deposit.amount);
                
                showNotification(`Deposit approved! ${deposit.amount} ZMW added to your balance.`, 'success');
                loadUserData();
            }
        }
    });
}

// Check for approved deposits
function checkForApprovedDeposits() {
    const approved = localStorage.getItem('depositApproved');
    const amount = localStorage.getItem('depositAmount');
    
    if (approved === 'true' && amount) {
        showNotification(`Deposit approved! ${amount} ZMW added to your balance.`, 'success');
        
        localStorage.removeItem('depositApproved');
        localStorage.removeItem('depositAmount');
        loadUserData();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initDeposit();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.selectPayment = selectPayment;
window.setAmount = setAmount;
window.customAmount = customAmount;
window.copyText = copyText;
window.copyAllDetails = copyAllDetails;
window.submitDeposit = submitDeposit;