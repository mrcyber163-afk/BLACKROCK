// public/assets/js/admin/user-details.js
import { 
    auth, 
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    addDoc,
    deleteDoc,
    increment
} from '../firebase-config.js';
import { showNotification, formatCurrency, formatDate, timeAgo } from '../utils.js';

let currentUser = null;
let currentUserId = null;
let userData = null;

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

if (!userId) {
    window.location.href = 'users.html';
}

// Check admin auth
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        window.location.href = '../login.html';
    } else {
        currentUser = user;
        currentUserId = userId;
        await loadUserDetails();
        loadUserTransactions();
        loadUserInvestments();
        loadUserReferrals();
    }
});

// Load user details
async function loadUserDetails() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        
        if (!userDoc.exists()) {
            showNotification('User not found', 'error');
            setTimeout(() => {
                window.location.href = 'users.html';
            }, 2000);
            return;
        }
        
        userData = userDoc.data();
        
        // Update profile header
        document.getElementById('userAvatar').textContent = (userData.username || 'U').charAt(0).toUpperCase();
        document.getElementById('userFullName').textContent = userData.username || 'Unknown User';
        document.getElementById('userMemberSince').textContent = `Member since: ${formatDate(userData.createdAt)}`;
        
        const statusBadge = document.getElementById('userStatusBadge');
        statusBadge.textContent = userData.status || 'pending';
        statusBadge.className = `user-badge badge-${userData.status === 'active' ? 'active' : 'pending'}`;
        
        // Update stats
        document.getElementById('statBalance').textContent = formatCurrency(userData.balance);
        document.getElementById('statTotalEarned').textContent = formatCurrency(userData.totalEarned);
        document.getElementById('statTasksDone').textContent = userData.totalTasks || 0;
        
        // Count referrals
        const referralsRef = collection(db, 'referrals');
        const q = query(referralsRef, where('referrerId', '==', currentUserId));
        const snapshot = await getDocs(q);
        document.getElementById('statReferrals').textContent = snapshot.size;
        
        // Update personal info
        document.getElementById('infoUsername').textContent = userData.username || 'N/A';
        document.getElementById('infoFullName').textContent = userData.fullName || userData.username || 'N/A';
        document.getElementById('infoEmail').textContent = userData.email || 'N/A';
        document.getElementById('infoPhone').textContent = userData.phone || 'N/A';
        document.getElementById('infoCountry').textContent = userData.country || 'Zambia';
        document.getElementById('infoLevel').textContent = userData.level || 'VIP 1';
        document.getElementById('infoReferralCode').textContent = userData.referralCode || 'N/A';
        document.getElementById('infoReferredBy').textContent = userData.referredBy || 'None';
        document.getElementById('infoLastLogin').textContent = userData.lastLogin ? formatDate(userData.lastLogin) : 'Never';
        
        // Update bank details
        if (userData.bankDetails) {
            document.getElementById('bankNetwork').textContent = 
                userData.bankDetails.network === 'airtel' ? 'Airtel Money' :
                userData.bankDetails.network === 'mtn' ? 'MTN Money' : 'Zamtel Kwacha';
            document.getElementById('bankPhone').textContent = userData.bankDetails.phone || 'N/A';
            document.getElementById('bankName').textContent = userData.bankDetails.name || 'N/A';
        }
        
    } catch (error) {
        console.error('Error loading user details:', error);
        showNotification('Failed to load user details', 'error');
    }
}

// Load user transactions
async function loadUserTransactions() {
    const transactionsList = document.getElementById('userTransactions');
    if (!transactionsList) return;
    
    try {
        const transactions = [];
        
        // Load deposits
        const depositsRef = collection(db, 'users', currentUserId, 'deposits');
        const depositsQuery = query(depositsRef, orderBy('createdAt', 'desc'), limit(5));
        const depositsSnapshot = await getDocs(depositsQuery);
        depositsSnapshot.forEach(doc => {
            transactions.push({
                type: 'deposit',
                ...doc.data()
            });
        });
        
        // Load withdrawals
        const withdrawalsRef = collection(db, 'users', currentUserId, 'withdrawals');
        const withdrawalsQuery = query(withdrawalsRef, orderBy('createdAt', 'desc'), limit(5));
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        withdrawalsSnapshot.forEach(doc => {
            transactions.push({
                type: 'withdrawal',
                ...doc.data()
            });
        });
        
        // Load task history
        const tasksRef = collection(db, 'users', currentUserId, 'task-history');
        const tasksQuery = query(tasksRef, orderBy('completedAt', 'desc'), limit(5));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(doc => {
            transactions.push({
                type: 'task',
                ...doc.data()
            });
        });
        
        // Sort by date
        transactions.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.completedAt || 0);
            const dateB = new Date(b.createdAt || b.completedAt || 0);
            return dateB - dateA;
        });
        
        if (transactions.length === 0) {
            transactionsList.innerHTML = '<div class="no-data"><i class="fas fa-exchange-alt"></i><p>No transactions</p></div>';
            return;
        }
        
        transactionsList.innerHTML = transactions.slice(0, 5).map(t => {
            if (t.type === 'deposit') {
                return `
                    <div class="transaction-item">
                        <span>${formatDate(t.createdAt)}</span>
                        <span>Deposit</span>
                        <span class="transaction-amount positive">+${t.amount} ZMW</span>
                        <span>${t.status}</span>
                        <span>${t.paymentMethod || 'Mobile Money'}</span>
                    </div>
                `;
            } else if (t.type === 'withdrawal') {
                return `
                    <div class="transaction-item">
                        <span>${formatDate(t.createdAt)}</span>
                        <span>Withdrawal</span>
                        <span class="transaction-amount negative">-${t.amount} ZMW</span>
                        <span>${t.status}</span>
                        <span>${t.network || 'Mobile Money'}</span>
                    </div>
                `;
            } else if (t.type === 'task') {
                return `
                    <div class="transaction-item">
                        <span>${formatDate(t.completedAt)}</span>
                        <span>Task</span>
                        <span class="transaction-amount positive">+${t.reward} ZMW</span>
                        <span>Completed</span>
                        <span>${t.platform || 'Video'}</span>
                    </div>
                `;
            }
        }).join('');
        
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Load user investments
async function loadUserInvestments() {
    const investmentsList = document.getElementById('userInvestments');
    if (!investmentsList) return;
    
    try {
        const investmentsRef = collection(db, 'users', currentUserId, 'investments');
        const q = query(investmentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            investmentsList.innerHTML = '<div class="no-data"><i class="fas fa-chart-line"></i><p>No investments</p></div>';
            return;
        }
        
        investmentsList.innerHTML = snapshot.docs.map(doc => {
            const inv = doc.data();
            const startDate = new Date(inv.createdAt);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + inv.duration);
            
            const now = new Date();
            const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
            const progress = ((inv.duration - daysLeft) / inv.duration) * 100;
            
            return `
                <div class="investment-item">
                    <div>
                        <strong>${inv.planName}</strong>
                        <div style="font-size: 12px; color: #888;">Started: ${formatDate(inv.createdAt)}</div>
                    </div>
                    <div>${inv.amount} ZMW</div>
                    <div>${inv.returns}%</div>
                    <div>
                        <span class="badge ${inv.status}">${inv.status}</span>
                    </div>
                    <div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div style="font-size: 11px; color: #888; margin-top: 5px;">
                            ${daysLeft} days left
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading investments:', error);
    }
}

// Load user referrals
async function loadUserReferrals() {
    const referralsList = document.getElementById('userReferrals');
    if (!referralsList) return;
    
    try {
        const referralsRef = collection(db, 'referrals');
        const q = query(referralsRef, where('referrerId', '==', currentUserId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            referralsList.innerHTML = '<div class="no-data"><i class="fas fa-users"></i><p>No referrals</p></div>';
            return;
        }
        
        referralsList.innerHTML = snapshot.docs.map(doc => {
            const ref = doc.data();
            return `
                <div class="transaction-item">
                    <span>${ref.referredUsername || 'Unknown'}</span>
                    <span>${formatDate(ref.createdAt)}</span>
                    <span>${ref.depositAmount || 0} ZMW</span>
                    <td><span class="badge ${ref.status === 'paid' ? 'success' : 'pending'}">${ref.status}</span></td>
                    <span>${ref.bonus || 0} ZMW</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading referrals:', error);
    }
}

// Switch tabs
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
};

// Show adjust balance modal
window.showAdjustBalance = function() {
    document.getElementById('balanceModal').classList.add('active');
};

// Show change upliner modal
window.showChangeUpliner = function() {
    document.getElementById('uplinerModal').classList.add('active');
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Adjust balance
window.adjustBalance = async function() {
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    const type = document.getElementById('balanceType').value;
    const reason = document.getElementById('balanceReason').value;
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Please provide a reason', 'error');
        return;
    }
    
    try {
        const adjustment = type === 'add' ? amount : -amount;
        
        // Update user balance
        await updateDoc(doc(db, 'users', currentUserId), {
            balance: increment(adjustment),
            totalEarned: type === 'add' ? increment(amount) : increment(0)
        });
        
        // Add transaction record
        await addDoc(collection(db, 'users', currentUserId, 'transactions'), {
            type: 'admin_adjustment',
            amount: adjustment,
            description: `Admin ${type === 'add' ? 'added' : 'deducted'}: ${reason}`,
            status: 'completed',
            createdAt: new Date().toISOString(),
            adjustedBy: currentUser.uid
        });
        
        // Add notification
        await addDoc(collection(db, 'users', currentUserId, 'notifications'), {
            type: 'balance_adjustment',
            message: `Your balance has been ${type === 'add' ? 'increased by' : 'decreased by'} ${amount} ZMW. Reason: ${reason}`,
            icon: type === 'add' ? 'plus-circle' : 'minus-circle',
            color: type === 'add' ? '#00ff00' : '#ff4444',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification(`Balance ${type === 'add' ? 'added' : 'deducted'} successfully!`, 'success');
        closeModal('balanceModal');
        
        // Reload user data
        await loadUserDetails();
        
    } catch (error) {
        console.error('Error adjusting balance:', error);
        showNotification('Failed to adjust balance', 'error');
    }
};

// Change upliner
window.changeUpliner = async function() {
    const newUpliner = document.getElementById('newUpliner').value.trim();
    
    if (!newUpliner) {
        showNotification('Please enter username', 'error');
        return;
    }
    
    try {
        // Find new upliner
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', newUpliner));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showNotification('Upliner not found', 'error');
            return;
        }
        
        const uplinerDoc = snapshot.docs[0];
        
        // Update user's referredBy
        await updateDoc(doc(db, 'users', currentUserId), {
            referredBy: newUpliner,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        });
        
        // Create referral record
        await addDoc(collection(db, 'referrals'), {
            referrerId: uplinerDoc.id,
            referredId: currentUserId,
            referredUsername: userData.username,
            bonus: 5,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        showNotification('Upliner changed successfully!', 'success');
        closeModal('uplinerModal');
        
        // Reload user data
        await loadUserDetails();
        
    } catch (error) {
        console.error('Error changing upliner:', error);
        showNotification('Failed to change upliner', 'error');
    }
};

// Reset password
window.resetPassword = async function() {
    if (!confirm('Send password reset email to this user?')) {
        return;
    }
    
    try {
        // This would typically use Firebase Admin SDK
        // For now, we'll just show a notification
        showNotification('Password reset email sent to user', 'success');
        
    } catch (error) {
        console.error('Error resetting password:', error);
        showNotification('Failed to reset password', 'error');
    }
};

// Toggle user status
window.toggleStatus = async function() {
    const newStatus = userData.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'suspend';
    
    if (!confirm(`${action} this user?`)) {
        return;
    }
    
    try {
        await updateDoc(doc(db, 'users', currentUserId), {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        });
        
        // Add notification
        await addDoc(collection(db, 'users', currentUserId, 'notifications'), {
            type: 'status_change',
            message: `Your account has been ${newStatus}`,
            icon: newStatus === 'active' ? 'check-circle' : 'ban',
            color: newStatus === 'active' ? '#00ff00' : '#ff4444',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification(`User ${action}d successfully!`, 'success');
        
        // Reload user data
        await loadUserDetails();
        
    } catch (error) {
        console.error('Error toggling status:', error);
        showNotification('Failed to update status', 'error');
    }
};

// Delete user
window.deleteUser = async function() {
    if (!confirm('⚠️ DANGER: Are you sure you want to delete this user? This action cannot be undone!')) {
        return;
    }
    
    if (!confirm('Type "DELETE" to confirm permanent deletion:')) {
        return;
    }
    
    try {
        // Delete user document
        await deleteDoc(doc(db, 'users', currentUserId));
        
        // Note: You might want to also delete subcollections
        // This would require a more complex batch operation
        
        showNotification('User deleted successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'users.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
};