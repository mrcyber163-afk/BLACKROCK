// public/assets/js/admin/admin-deposits.js
import { 
    auth, 
    db,
    onAuthStateChanged,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    orderBy,
    increment
} from '../firebase-config.js';
import { showNotification, formatCurrency, formatDate } from '../utils.js';

let currentUser = null;

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
        loadDeposits();
        loadStats();
    }
});

// Load deposits
async function loadDeposits(filter = 'all') {
    const depositsList = document.getElementById('depositsList');
    if (!depositsList) return;
    
    try {
        const depositsRef = collection(db, 'deposits');
        let q;
        
        if (filter === 'all') {
            q = query(depositsRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(depositsRef, where('status', '==', filter), orderBy('createdAt', 'desc'));
        }
        
        const snapshot = await getDocs(q);
        const deposits = [];
        snapshot.forEach(doc => {
            deposits.push({ id: doc.id, ...doc.data() });
        });
        
        displayDeposits(deposits);
        
    } catch (error) {
        console.error('Error loading deposits:', error);
        depositsList.innerHTML = '<div class="error-message">Failed to load deposits</div>';
    }
}

// Display deposits
function displayDeposits(deposits) {
    const depositsList = document.getElementById('depositsList');
    
    if (deposits.length === 0) {
        depositsList.innerHTML = '<div class="no-data"><i class="fas fa-arrow-down"></i><p>No deposits found</p></div>';
        return;
    }
    
    depositsList.innerHTML = deposits.map(deposit => `
        <div class="deposit-row" data-status="${deposit.status}">
            <span>#${deposit.id.slice(-4)}</span>
            <span>${deposit.username || 'Unknown'}</span>
            <span>${deposit.amount} ZMW</span>
            <span>${deposit.paymentMethod || 'N/A'}</span>
            <span>${deposit.senderPhone || 'N/A'}</span>
            <td>
                <div class="message-preview" onclick="viewMessage('${deposit.transactionMessage || 'No message'}')">
                    ${(deposit.transactionMessage || 'No message').substring(0, 20)}...
                </div>
            </td>
            <span>${formatDate(deposit.createdAt)}</span>
            <td>
                ${deposit.status === 'pending' ? `
                    <button class="action-btn btn-approve" onclick="approveDeposit('${deposit.id}', ${deposit.amount}, '${deposit.userId}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn btn-reject" onclick="showRejectModal('${deposit.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : `
                    <span class="status-badge status-${deposit.status}">${deposit.status}</span>
                `}
                <button class="action-btn btn-view" onclick="viewDeposit('${deposit.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </div>
    `).join('');
}

// Load stats
async function loadStats() {
    try {
        const depositsRef = collection(db, 'deposits');
        
        // Total deposits
        const allSnapshot = await getDocs(depositsRef);
        let total = 0;
        allSnapshot.forEach(doc => {
            total += doc.data().amount || 0;
        });
        document.getElementById('totalDeposits').textContent = formatCurrency(total);
        
        // Pending
        const pendingQuery = query(depositsRef, where('status', '==', 'pending'));
        const pendingSnapshot = await getDocs(pendingQuery);
        let pendingTotal = 0;
        pendingSnapshot.forEach(doc => {
            pendingTotal += doc.data().amount || 0;
        });
        document.getElementById('pendingTotal').textContent = formatCurrency(pendingTotal);
        document.getElementById('pendingCount').textContent = pendingSnapshot.size;
        
        // Today
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = query(depositsRef, where('createdAt', '>=', today));
        const todaySnapshot = await getDocs(todayQuery);
        let todayTotal = 0;
        todaySnapshot.forEach(doc => {
            todayTotal += doc.data().amount || 0;
        });
        document.getElementById('todayTotal').textContent = formatCurrency(todayTotal);
        document.getElementById('todayCount').textContent = todaySnapshot.size;
        
        // Approved
        const approvedQuery = query(depositsRef, where('status', '==', 'approved'));
        const approvedSnapshot = await getDocs(approvedQuery);
        let approvedTotal = 0;
        approvedSnapshot.forEach(doc => {
            approvedTotal += doc.data().amount || 0;
        });
        document.getElementById('approvedTotal').textContent = formatCurrency(approvedTotal);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Filter deposits
window.filterDeposits = function(filter) {
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadDeposits(filter);
};

// View full message
window.viewMessage = function(message) {
    document.getElementById('fullMessage').textContent = message;
    document.getElementById('messageModal').classList.add('active');
};

// Approve deposit
window.approveDeposit = async function(depositId, amount, userId) {
    if (!confirm(`Approve deposit of ${amount} ZMW?`)) {
        return;
    }
    
    try {
        // Update deposit status
        await updateDoc(doc(db, 'deposits', depositId), {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.uid
        });
        
        // Update user balance
        await updateDoc(doc(db, 'users', userId), {
            balance: increment(amount),
            totalEarned: increment(amount)
        });
        
        // Add notification for user
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            type: 'deposit_approved',
            message: `Your deposit of ${amount} ZMW has been approved!`,
            icon: 'check-circle',
            color: '#00ff00',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Deposit approved successfully!', 'success');
        loadDeposits();
        loadStats();
        
    } catch (error) {
        console.error('Error approving deposit:', error);
        showNotification('Failed to approve deposit', 'error');
    }
};

// Show reject modal
window.showRejectModal = function(depositId) {
    currentDepositId = depositId;
    document.getElementById('rejectModal').classList.add('active');
};

// Confirm reject
window.confirmReject = async function() {
    const reason = document.getElementById('rejectReason').value;
    
    if (!reason) {
        showNotification('Please provide a reason for rejection', 'error');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'deposits', currentDepositId), {
            status: 'rejected',
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser.uid
        });
        
        showNotification('Deposit rejected', 'info');
        closeModal('rejectModal');
        loadDeposits();
        loadStats();
        
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showNotification('Failed to reject deposit', 'error');
    }
};

// View deposit details
window.viewDeposit = function(depositId) {
    // Implement view details modal
    console.log('View deposit:', depositId);
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'rejectModal') {
        document.getElementById('rejectReason').value = '';
    }
};