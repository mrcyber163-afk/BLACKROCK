// public/assets/js/welcome-bonus.js
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
    formatCurrency,
    showLoading,
    hideLoading,
    requireActiveAccount,
    copyToClipboard
} from './utils.js';

let currentUser = null;
let userData = null;

// Initialize welcome bonus page
export async function initWelcomeBonus() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    checkBonusStatus();
    loadQualifiedReferrals();
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

// Check bonus status
async function checkBonusStatus() {
    try {
        // Check if already claimed
        if (userData.welcomeBonusClaimed) {
            document.getElementById('bonusStatus').innerHTML = `
                <div class="bonus-claimed">
                    <i class="fas fa-check-circle" style="font-size: 50px; color: #00ff00; margin-bottom: 15px;"></i>
                    <h3 style="color: #00ff00;">Bonus Claimed!</h3>
                    <p style="color: #888;">You have already claimed your 100 ZMW welcome bonus.</p>
                </div>
            `;
            return;
        }
        
        // Count qualified referrals
        const referralsRef = collection(db, 'referrals');
        const q = query(
            referralsRef,
            where('referrerId', '==', currentUser.uid),
            where('status', '==', 'paid'),
            where('depositAmount', '>=', 100)
        );
        
        const snapshot = await getDocs(q);
        const qualifiedCount = snapshot.size;
        
        if (qualifiedCount >= 10) {
            // Show claim button
            document.getElementById('bonusStatus').innerHTML = `
                <div class="bonus-ready">
                    <i class="fas fa-trophy" style="font-size: 50px; color: #00ff00; margin-bottom: 15px;"></i>
                    <h3 style="color: #00ff00;">Congratulations! 🎉</h3>
                    <p style="color: #888; margin-bottom: 20px;">You have 10 qualified referrals!</p>
                    <button onclick="claimBonus()" class="btn-claim">
                        <i class="fas fa-gift"></i> Claim 100 ZMW Bonus
                    </button>
                </div>
            `;
        } else {
            // Show progress
            const progress = (qualifiedCount / 10) * 100;
            
            document.getElementById('bonusStatus').innerHTML = `
                <div class="bonus-progress">
                    <i class="fas fa-hourglass-half" style="font-size: 50px; color: #ffd700; margin-bottom: 15px;"></i>
                    <h3 style="color: #00ff00;">Bonus Progress</h3>
                    <p style="color: #888;">Invite 10 friends who deposit 100+ ZMW</p>
                    
                    <div class="progress-container">
                        <div class="progress-info">
                            <span>${qualifiedCount}/10 referrals</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            ${qualifiedCount} qualified out of 10 needed
                        </div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error checking bonus:', error);
    }
}

// Load qualified referrals
async function loadQualifiedReferrals() {
    try {
        const referralsRef = collection(db, 'referrals');
        const q = query(
            referralsRef,
            where('referrerId', '==', currentUser.uid),
            where('status', '==', 'paid'),
            where('depositAmount', '>=', 100),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const referrals = [];
        
        snapshot.forEach(doc => {
            referrals.push({ id: doc.id, ...doc.data() });
        });
        
        displayQualifiedReferrals(referrals);
        
    } catch (error) {
        console.error('Error loading qualified referrals:', error);
    }
}

// Display qualified referrals
function displayQualifiedReferrals(referrals) {
    const container = document.getElementById('qualifiedReferralsList');
    if (!container) return;
    
    if (referrals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No qualified referrals yet</p>
                <p style="font-size: 13px;">Share your link to start earning</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = referrals.map(ref => `
        <div class="referral-item">
            <div class="referral-info">
                <strong>${ref.referredUsername || 'Unknown'}</strong>
                <span>Deposit: ${ref.depositAmount} ZMW</span>
            </div>
            <span class="badge success">Qualified</span>
        </div>
    `).join('');
}

// Claim bonus
export async function claimBonus() {
    try {
        // Double-check qualification
        const referralsRef = collection(db, 'referrals');
        const q = query(
            referralsRef,
            where('referrerId', '==', currentUser.uid),
            where('status', '==', 'paid'),
            where('depositAmount', '>=', 100)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.size < 10) {
            showNotification('You need 10 qualified referrals to claim the bonus', 'error');
            return;
        }
        
        if (userData.welcomeBonusClaimed) {
            showNotification('Bonus already claimed', 'error');
            return;
        }
        
        showLoading();
        
        // Update user
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balance: increment(100),
            totalEarned: increment(100),
            welcomeBonusClaimed: true,
            welcomeBonusClaimedAt: new Date().toISOString()
        });
        
        // Add transaction
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
            type: 'bonus',
            amount: 100,
            description: 'Welcome Bonus',
            status: 'completed',
            createdAt: new Date().toISOString()
        });
        
        hideLoading();
        showNotification('Congratulations! 100 ZMW bonus added to your balance!', 'success');
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        hideLoading();
        console.error('Error claiming bonus:', error);
        showNotification('Failed to claim bonus', 'error');
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
    
    const text = `Join BlackRock and earn money by watching videos! Use my referral link to get started: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function shareFacebook() {
    const link = document.getElementById('referralLink')?.value;
    if (!link) return;
    
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initWelcomeBonus();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.claimBonus = claimBonus;
window.copyReferralLink = copyReferralLink;
window.shareWhatsApp = shareWhatsApp;
window.shareFacebook = shareFacebook;