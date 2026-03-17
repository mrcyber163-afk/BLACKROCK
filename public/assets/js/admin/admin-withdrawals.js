// public/assets/js/admin/admin-withdrawals.js
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
    orderBy
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
        loadWithdrawals();
        loadStats();
    }
});

// Load withdrawals
async function loadWithdrawals(filter = 'all') {
    const withdrawalsList = document.getElementById('withdrawalsList');
    if (!withdrawalsList) return;
    
    try {
        const withdrawalsRef = collection(db, 'withdrawals');
        let q;
        
        if (filter === 'all') {
            q = query(withdrawalsRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(withdrawalsRef, where('status', '==', filter), orderBy('createdAt', 'desc'));
        }
        
        const snapshot = await getDocs(q);
        const withdrawals = [];
        snapshot.forEach(doc => {
            withdrawals.push({ id: doc.id, ...doc.data() });
        });
        
        displayWithdrawals(withdrawals);
        
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        withdrawalsList.innerHTML = '<div class="error-message">Failed to load withdrawals</div>';
    }
}

// Display withdrawals
function displayWithdrawals(withdrawals) {
    const withdrawalsList = document.getElementById('withdrawalsList');
    
    if (withdrawals.length === 0) {
        withdrawalsList.innerHTML = '<div class="no-data"><i class="fas fa-arrow-up"></i><p>No withdrawals found</p></div>';
        return;
    }
    
    withdrawalsList.innerHTML = withdrawals.map(withdrawal => `
        <div class="withdrawal-row" data-status="${withdrawal.status}">
            <span>#${withdrawal.id.slice(-4)}</span>
            <span>${withdrawal.username || 'Unknown'}</span>
            <span>${withdrawal.amount} ZMW</span>
            <span>${withdrawal.network || 'N/A'}</span>
            <td>
                <div class="bank-details">
                    <strong>${withdrawal.phone || 'N/A'}</strong>
                    ${withdrawal.accountName || ''}
                </div>
            </td>
            <span>${formatDate(withdrawal.createdAt)}</span>
            <td><span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span></td>
            <td>
                ${withdrawal.status === 'pending' ? `
                    <button class="btn-process" onclick="processWithdrawal('${withdrawal.id}', ${withdrawal.amount}, '${withdrawal.userId}')">
                        Process
                    </button>
                ` : withdrawal.status === 'processing' ? `
                    <input type="text" id="tx-${withdrawal.id}" placeholder="TX Code" style="width: 100px;">
                    <button class="btn-complete" onclick="completeWithdrawal('${withdrawal.id}', '${withdrawal.userId}')">
                        <i class="fas fa-check"></i>
                    </button>
                ` : `
                    <span class="transaction-code">${withdrawal.transactionCode || 'N/A'}</span>
                `}
            </td>
        </div>
    `).join('');
}

// Load stats
async function loadStats() {
    try {
        const withdrawalsRef = collection(db, 'withdrawals');
        
        // Total withdrawn
        const allSnapshot = await getDocs(withdrawalsRef);
        let total = 0;
        allSnapshot.forEach(doc => {
            if (doc.data().status === 'completed') {
                total += doc.data().amount || 0;
            }
        });
        document.getElementById('totalWithdrawn').textContent = formatCurrency(total);
        
        // Pending
        const pendingQuery = query(withdrawalsRef, where('status', '==', 'pending'));
        const pendingSnapshot = await getDocs(pendingQuery);
        let pendingTotal = 0;
        pendingSnapshot.forEach(doc => {
            pendingTotal += doc.data().amount || 0;
        });
        document.getElementById('pendingWithdrawals').textContent = formatCurrency(pendingTotal);
        
        // Today
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = query(withdrawalsRef, where('createdAt', '>=', today));
        const todaySnapshot = await getDocs(todayQuery);
        let todayTotal = 0;
        todaySnapshot.forEach(doc => {
            todayTotal += doc.data().amount || 0;
        });
        document.getElementById('todayWithdrawals').textContent = formatCurrency(todayTotal);
        
        // Processing
        const processingQuery = query(withdrawalsRef, where('status', '==', 'processing'));
        const processingSnapshot = await getDocs(processingQuery);
        let processingTotal = 0;
        processingSnapshot.forEach(doc => {
            processingTotal += doc.data().amount || 0;
        });
        document.getElementById('processingTotal').textContent = formatCurrency(processingTotal);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Filter withdrawals
window.filterWithdrawals = function(filter) {
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadWithdrawals(filter);
};

// Process withdrawal
window.processWithdrawal = async function(withdrawalId, amount, userId) {
    if (!confirm(`Process withdrawal of ${amount} ZMW?`)) {
        return;
    }
    
    try {
        await updateDoc(doc(db, 'withdrawals', withdrawalId), {
            status: 'processing',
            processedAt: new Date().toISOString(),
            processedBy: currentUser.uid
        });
        
        // Add notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            type: 'withdrawal_processing',
            message: `Your withdrawal of ${amount} ZMW is being processed.`,
            icon: 'clock',
            color: '#ffd700',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Withdrawal is now processing', 'success');
        loadWithdrawals();
        
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        showNotification('Failed to process withdrawal', 'error');
    }
};

// Complete withdrawal
window.completeWithdrawal = async function(withdrawalId, userId) {
    const txCode = document.getElementById(`tx-${withdrawalId}`).value;
    
    if (!txCode) {
        showNotification('Please enter transaction code', 'error');
        return;
    }
    
    try {
        const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
        const withdrawalDoc = await getDoc(withdrawalRef);
        const amount = withdrawalDoc.data().amount;
        
        await updateDoc(withdrawalRef, {
            status: 'completed',
            transactionCode: txCode,
            completedAt: new Date().toISOString(),
            completedBy: currentUser.uid
        });
        
        // Add notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            type: 'withdrawal_completed',
            message: `Your withdrawal of ${amount} ZMW has been sent! Transaction: ${txCode}`,
            icon: 'check-circle',
            color: '#00ff00',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Withdrawal completed successfully!', 'success');
        loadWithdrawals();
        loadStats();
        
    } catch (error) {
        console.error('Error completing withdrawal:', error);
        showNotification('Failed to complete withdrawal', 'error');
    }
};