// public/assets/js/profile.js
import { 
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendEmailVerification
} from './firebase-config.js';
import { 
    showNotification, 
    formatCurrency,
    validateZambianPhone,
    showLoading,
    hideLoading,
    requireActiveAccount,
    formatDate
} from './utils.js';

let currentUser = null;
let userData = null;

// Initialize profile page
export async function initProfile() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateProfileUI();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Update profile UI
function updateProfileUI() {
    // Avatar
    const initial = (userData.username || 'U').charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = initial;
    
    // Basic info
    document.getElementById('profileName').textContent = userData.username || 'User';
    document.getElementById('profileEmail').textContent = userData.email || '';
    document.getElementById('profileLevel').textContent = userData.level || 'VIP 1';
    
    // Stats
    document.getElementById('statBalance').textContent = (userData.balance || 0).toFixed(2);
    document.getElementById('statEarned').textContent = (userData.totalEarned || 0).toFixed(2);
    document.getElementById('statTasks').textContent = userData.totalTasks || 0;
    
    // Personal info
    document.getElementById('infoUsername').textContent = userData.username || '-';
    document.getElementById('infoName').textContent = userData.fullName || userData.username || '-';
    document.getElementById('infoEmail').textContent = userData.email || '-';
    document.getElementById('infoPhone').textContent = userData.phone || '-';
    document.getElementById('infoCountry').textContent = userData.country || 'Zambia';
    document.getElementById('infoJoined').textContent = formatDate(userData.createdAt);
    
    // Referral info
    document.getElementById('infoReferralCode').textContent = userData.referralCode || '-';
    document.getElementById('infoReferredBy').textContent = userData.referredBy || 'None';
    
    // Bank details
    if (userData.bankDetails) {
        const network = userData.bankDetails.network;
        document.getElementById('bankNetwork').textContent = 
            network === 'airtel' ? 'Airtel Money' :
            network === 'mtn' ? 'MTN Money' : 
            network === 'zamtel' ? 'Zamtel Kwacha' : 'Not set';
        document.getElementById('bankPhone').textContent = userData.bankDetails.phone || 'Not set';
        document.getElementById('bankName').textContent = userData.bankDetails.name || 'Not set';
    }
}

// Show change password modal
export function showChangePassword() {
    document.getElementById('passwordModal').classList.add('active');
}

// Hide change password modal
export function hideChangePassword() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// Change password
export async function changePassword() {
    const currentPw = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    const confirmPw = document.getElementById('confirmPassword').value;
    
    if (!currentPw || !newPw || !confirmPw) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (newPw !== confirmPw) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPw.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Reauthenticate
        const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPw);
        
        hideLoading();
        showNotification('Password updated successfully!', 'success');
        hideChangePassword();
        
    } catch (error) {
        hideLoading();
        console.error('Password change error:', error);
        
        if (error.code === 'auth/wrong-password') {
            showNotification('Current password is incorrect', 'error');
        } else {
            showNotification('Failed to change password', 'error');
        }
    }
}

// Edit bank details
export function editBankDetails() {
    if (userData?.bankDetails) {
        document.getElementById('modalBankNetwork').value = userData.bankDetails.network || '';
        document.getElementById('modalBankPhone').value = userData.bankDetails.phone || '';
        document.getElementById('modalBankName').value = userData.bankDetails.name || '';
    }
    document.getElementById('bankModal').classList.add('active');
}

// Hide bank modal
export function hideBankModal() {
    document.getElementById('bankModal').classList.remove('active');
}

// Save bank details
export async function saveBankDetails() {
    const network = document.getElementById('modalBankNetwork').value;
    const phone = document.getElementById('modalBankPhone').value;
    const name = document.getElementById('modalBankName').value;
    
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
        
        showNotification('Bank details updated successfully!', 'success');
        hideBankModal();
        await loadUserData();
        
    } catch (error) {
        console.error('Error saving bank details:', error);
        showNotification('Failed to save bank details', 'error');
    } finally {
        hideLoading();
    }
}

// Toggle email notifications
export async function toggleEmailNotifications() {
    const enabled = document.getElementById('emailNotifications').checked;
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            emailNotifications: enabled
        });
        
        showNotification(`Email notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        
    } catch (error) {
        console.error('Error updating notifications:', error);
        showNotification('Failed to update settings', 'error');
    }
}

// Setup 2FA
export function setup2FA() {
    showNotification('Two-factor authentication coming soon!', 'info');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initProfile();
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Email notifications toggle
    const emailToggle = document.getElementById('emailNotifications');
    if (emailToggle) {
        emailToggle.addEventListener('change', toggleEmailNotifications);
    }
});

// Attach to window
window.showChangePassword = showChangePassword;
window.hideChangePassword = hideChangePassword;
window.changePassword = changePassword;
window.editBankDetails = editBankDetails;
window.hideBankModal = hideBankModal;
window.saveBankDetails = saveBankDetails;
window.setup2FA = setup2FA;