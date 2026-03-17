// public/assets/js/referral.js
import { 
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot
} from './firebase-config.js';
import { 
    showNotification, 
    formatCurrency,
    formatDate,
    copyToClipboard,
    requireActiveAccount
} from './utils.js';

let currentUser = null;
let userData = null;

// Initialize referral page
export async function initReferral() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    loadReferrals();
    loadReferralStats();
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateUI();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Update UI
function updateUI() {
    // Update balance
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(userData?.balance);
    }
    
    // Update referral link
    const referralLink = document.getElementById('referralLink');
    if (referralLink && userData?.referralCode) {
        const baseUrl = window.location.origin;
        referralLink.value = `${baseUrl}/register.html?ref=${userData.referralCode}`;
    }
}

// Load referrals
function loadReferrals() {
    const referralsRef = collection(db, 'referrals');
    const q = query(
        referralsRef, 
        where('referrerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );
    
    onSnapshot(q, (snapshot) => {
        const referrals = [];
        snapshot.forEach(doc => {
            referrals.push({ id: doc.id, ...doc.data() });
        });
        
        displayReferrals(referrals);
        updateStats(referrals);
    });
}

// Display referrals
function displayReferrals(referrals) {
    const container = document.getElementById('referralsContainer');
    if (!container) return;
    
    if (referrals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No referrals yet</p>
                <p style="font-size: 14px;">Share your link to start earning</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = referrals.map(ref => `
        <div class="referral-row">
            <span>${ref.referredUsername || 'Unknown'}</span>
            <span>${formatDate(ref.createdAt)}</span>
            <span>${ref.depositAmount || 0} ZMW</span>
            <span>
                <span class="badge ${ref.status === 'paid' ? 'success' : 'pending'}">
                    ${ref.status === 'paid' ? 'Active' : 'Pending'}
                </span>
            </span>
        </div>
    `).join('');
}

// Update stats
function updateStats(referrals) {
    const total = referrals.length;
    const active = referrals.filter(r => r.status === 'paid').length;
    const pending = total - active;
    const earnings = referrals
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.bonus || 0), 0);
    
    document.getElementById('totalReferrals').textContent = total;
    document.getElementById('activeReferrals').textContent = active;
    document.getElementById('pendingReferrals').textContent = pending;
    document.getElementById('referralEarnings').textContent = `${earnings} ZMW`;
}

// Load referral stats
async function loadReferralStats() {
    try {
        const referralsRef = collection(db, 'referrals');
        
        // Total referrals
        const totalQuery = query(referralsRef, where('referrerId', '==', currentUser.uid));
        const totalSnapshot = await getDocs(totalQuery);
        const total = totalSnapshot.size;
        
        // Active referrals
        const activeQuery = query(
            referralsRef, 
            where('referrerId', '==', currentUser.uid),
            where('status', '==', 'paid')
        );
        const activeSnapshot = await getDocs(activeQuery);
        const active = activeSnapshot.size;
        
        // Total earnings
        let earnings = 0;
        activeSnapshot.forEach(doc => {
            earnings += doc.data().bonus || 0;
        });
        
        document.getElementById('totalReferrals').textContent = total;
        document.getElementById('activeReferrals').textContent = active;
        document.getElementById('pendingReferrals').textContent = total - active;
        document.getElementById('referralEarnings').textContent = `${earnings} ZMW`;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Copy referral link
export async function copyReferralLink() {
    const link = document.getElementById('referralLink');
    if (!link) return;
    
    try {
        await copyToClipboard(link.value);
        showNotification('Referral link copied!', 'success');
    } catch (error) {
        showNotification('Failed to copy link', 'error');
    }
}

// Share functions
export function shareWhatsApp() {
    const link = document.getElementById('referralLink')?.value;
    if (!link) return;
    
    const text = `Join BlackRock and earn money by watching videos! Use my referral link: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function shareFacebook() {
    const link = document.getElementById('referralLink')?.value;
    if (!link) return;
    
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
}

export function shareMessenger() {
    const link = document.getElementById('referralLink')?.value;
    if (!link) return;
    
    window.open(`fb-messenger://share?link=${encodeURIComponent(link)}`, '_blank');
}

export function shareTwitter() {
    const link = document.getElementById('referralLink')?.value;
    if (!link) return;
    
    const text = `Join BlackRock and earn money!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initReferral();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.copyReferralLink = copyReferralLink;
window.shareWhatsApp = shareWhatsApp;
window.shareFacebook = shareFacebook;
window.shareMessenger = shareMessenger;
window.shareTwitter = shareTwitter;