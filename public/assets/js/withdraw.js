// public/assets/js/withdraw.js
import { 
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
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
let selectedAmount = 0;
let bankDetails = null;

// Initialize withdraw page
export async function initWithdraw() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    loadBankDetails();
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
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(userData?.balance);
    }
}

// Load bank details
function loadBankDetails() {
    if (userData?.bankDetails) {
        bankDetails = userData.bankDetails;
        document.getElementById('displayNetwork').textContent = 
            bankDetails.network === 'airtel' ? 'Airtel Money' :
            bankDetails.network === 'mtn' ? 'MTN Money' : 'Zamtel Kwacha';
        document.getElementById('displayPhone').textContent = bankDetails.phone || 'Not set';
        document.getElementById('displayName').textContent = bankDetails.name || 'Not set';
        
        // Show withdraw form
        document.getElementById('withdrawForm').style.display = 'block';
    } else {
        document.getElementById('withdrawForm').style.display = 'none';
    }
}

// Toggle bank form
export function toggleBankForm() {
    const form = document.getElementById('bankForm');
    const display = document.getElementById('bankDetailsDisplay');
    
    if (form.style.display === 'none') {
        form.style.display = 'block';
        display.style.display = 'none';
        
        // Pre-fill form
        if (bankDetails) {
            document.getElementById('bankNetwork').value = bankDetails.network || '';
            document.getElementById('bankPhone').value = bankDetails.phone || '';
            document.getElementById('bankName').value = bankDetails.name || '';
        }
    } else {
        form.style.display = 'none';
        display.style.display = 'block';
    }
}

// Save bank details
export async function saveBankDetails() {
    const network = document.getElementById('bankNetwork').value;
    const phone = document.getElementById('bankPhone').value;
    const name = document.getElementById('bankName').value;
    
    if (!network || !phone || !name) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (!validateZambianPhone(phone)) {
        showNotification('Please enter a valid Zambian phone number', 'error');
        return;
    }
    
    showLoading();
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            bankDetails: {
                network: network,
                phone: phone,
                name: name
            }
        });
        
        showNotification('Bank details saved successfully!', 'success');
        
        // Reload data
        await loadUserData();
        toggleBankForm();
        
    } catch (error) {
        console.error('Error saving bank details:', error);
        showNotification('Failed to save bank details', 'error');
    } finally {
        hideLoading();
    }
}

// Select amount
export function selectAmount(amount) {
    selectedAmount = amount;
    document.getElementById('summaryAmount').textContent = `${amount} ZMW`;
    document.getElementById('summaryReceive').textContent = `${amount} ZMW`;
    document.getElementById('withdrawBtn').disabled = false;
    document.getElementById('customAmountField').style.display = 'none';
    
    // Update UI
    document.querySelectorAll('.amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

// Custom amount
export function customAmount() {
    document.getElementById('customAmountField').style.display = 'block';
    document.getElementById('withdrawBtn').disabled = true;
    
    document.querySelectorAll('.amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
}

// Update custom amount
export function updateCustomAmount() {
    const amount = parseFloat(document.getElementById('customAmount')?.value);
    
    if (amount >= 50) {
        selectedAmount = amount;
        document.getElementById('summaryAmount').textContent = `${amount} ZMW`;
        document.getElementById('summaryReceive').textContent = `${amount} ZMW`;
        document.getElementById('withdrawBtn').disabled = false;
    } else {
        document.getElementById('withdrawBtn').disabled = true;
    }
}

// Request withdrawal
export async function requestWithdrawal() {
    if (!selectedAmount || selectedAmount < 50) {
        showNotification('Minimum withdrawal is 50 ZMW', 'error');
        return;
    }
    
    if (selectedAmount > (userData?.balance || 0)) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    if (!bankDetails) {
        showNotification('Please save bank details first', 'error');
        return;
    }
    
    const btn = document.getElementById('withdrawBtn');
    showLoading();
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    try {
        // Create withdrawal request
        await addDoc(collection(db, 'withdrawals'), {
            userId: currentUser.uid,
            username: userData.username,
            amount: selectedAmount,
            network: bankDetails.network,
            phone: bankDetails.phone,
            accountName: bankDetails.name,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        // Add to user's withdrawals
        await addDoc(collection(db, 'users', currentUser.uid, 'withdrawals'), {
            amount: selectedAmount,
            network: bankDetails.network,
            phone: bankDetails.phone,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        // Deduct from balance
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balance: increment(-selectedAmount)
        });
        
        showNotification('Withdrawal request submitted! It will be processed within 24-48 hours.', 'success');
        
        // Reset
        selectedAmount = 0;
        document.getElementById('summaryAmount').textContent = '0 ZMW';
        document.getElementById('summaryReceive').textContent = '0 ZMW';
        document.getElementById('withdrawBtn').disabled = true;
        document.getElementById('customAmountField').style.display = 'none';
        document.getElementById('customAmount').value = '';
        
        // Reload data
        await loadUserData();
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification('Failed to submit withdrawal request', 'error');
    } finally {
        hideLoading();
        btn.disabled = false;
        btn.textContent = 'Request Withdrawal';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initWithdraw();
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Custom amount input
    const customInput = document.getElementById('customAmount');
    if (customInput) {
        customInput.addEventListener('input', updateCustomAmount);
    }
});

// Attach to window
window.toggleBankForm = toggleBankForm;
window.saveBankDetails = saveBankDetails;
window.selectAmount = selectAmount;
window.customAmount = customAmount;
window.requestWithdrawal = requestWithdrawal;