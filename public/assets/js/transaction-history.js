// public/assets/js/transaction-history.js
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
    limit
} from './firebase-config.js';
import { 
    showNotification, 
    formatCurrency,
    formatDate,
    requireActiveAccount
} from './utils.js';

let currentUser = null;
let userData = null;
let currentTab = 'all';
let allTransactions = [];

// Initialize transaction history
export async function initTransactionHistory() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    await loadAllTransactions();
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            document.getElementById('balance').textContent = formatCurrency(userData?.balance);
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Load all transactions
async function loadAllTransactions() {
    allTransactions = [];
    
    try {
        // Load deposits
        const depositsRef = collection(db, 'users', currentUser.uid, 'deposits');
        const depositsQuery = query(depositsRef, orderBy('createdAt', 'desc'));
        const depositsSnap = await getDocs(depositsQuery);
        depositsSnap.forEach(doc => {
            allTransactions.push({
                id: doc.id,
                type: 'deposit',
                ...doc.data()
            });
        });
        
        // Load withdrawals
        const withdrawalsRef = collection(db, 'users', currentUser.uid, 'withdrawals');
        const withdrawalsQuery = query(withdrawalsRef, orderBy('createdAt', 'desc'));
        const withdrawalsSnap = await getDocs(withdrawalsQuery);
        withdrawalsSnap.forEach(doc => {
            allTransactions.push({
                id: doc.id,
                type: 'withdraw',
                ...doc.data()
            });
        });
        
        // Load task history
        const tasksRef = collection(db, 'users', currentUser.uid, 'task-history');
        const tasksQuery = query(tasksRef, orderBy('completedAt', 'desc'));
        const tasksSnap = await getDocs(tasksQuery);
        tasksSnap.forEach(doc => {
            allTransactions.push({
                id: doc.id,
                type: 'task',
                ...doc.data()
            });
        });
        
        // Sort all by date
        allTransactions.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.completedAt || 0);
            const dateB = new Date(b.createdAt || b.completedAt || 0);
            return dateB - dateA;
        });
        
        displayTransactions();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showMockTransactions();
    }
}

// Show mock transactions (for demo)
function showMockTransactions() {
    allTransactions = [
        {
            type: 'deposit',
            amount: 150,
            status: 'completed',
            createdAt: new Date().toISOString(),
            paymentMethod: 'Airtel Money'
        },
        {
            type: 'task',
            reward: 2,
            platform: 'tiktok',
            completedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
            type: 'withdraw',
            amount: 50,
            status: 'pending',
            createdAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
            type: 'bonus',
            amount: 100,
            description: 'Welcome Bonus',
            createdAt: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    displayTransactions();
}

// Display transactions
function displayTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    let filtered = allTransactions;
    if (currentTab !== 'all') {
        filtered = allTransactions.filter(t => t.type === currentTab);
    }
    
    // Apply date filter
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (startDate && endDate) {
        filtered = filtered.filter(t => {
            const date = new Date(t.createdAt || t.completedAt || 0);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-transactions">
                <i class="fas fa-history"></i>
                <h3>No Transactions Found</h3>
                <p>Your transactions will appear here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(t => {
        if (t.type === 'deposit') {
            return `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">Deposit via ${t.paymentMethod || 'Mobile Money'}</div>
                        <div class="transaction-date">${formatDate(t.createdAt)}</div>
                    </div>
                    <div class="transaction-amount positive">+${t.amount} ZMW</div>
                    <div class="transaction-status status-${t.status || 'completed'}">${t.status || 'completed'}</div>
                </div>
            `;
        } else if (t.type === 'withdraw') {
            return `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">Withdrawal to ${t.network || 'Mobile Money'}</div>
                        <div class="transaction-date">${formatDate(t.createdAt)}</div>
                    </div>
                    <div class="transaction-amount negative">-${t.amount} ZMW</div>
                    <div class="transaction-status status-${t.status || 'pending'}">${t.status || 'pending'}</div>
                </div>
            `;
        } else if (t.type === 'task') {
            return `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fab fa-${t.platform || 'tiktok'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">Task Completed (${t.platform || 'video'})</div>
                        <div class="transaction-date">${formatDate(t.completedAt)}</div>
                    </div>
                    <div class="transaction-amount positive">+${t.reward} ZMW</div>
                    <div class="transaction-status status-completed">completed</div>
                </div>
            `;
        } else if (t.type === 'bonus') {
            return `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        <i class="fas fa-gift"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">${t.description || 'Bonus'}</div>
                        <div class="transaction-date">${formatDate(t.createdAt)}</div>
                    </div>
                    <div class="transaction-amount positive">+${t.amount} ZMW</div>
                    <div class="transaction-status status-completed">completed</div>
                </div>
            `;
        }
    }).join('');
}

// Switch tab
export function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    displayTransactions();
}

// Filter by date
export function filterTransactions() {
    displayTransactions();
}

// Export transactions
export function exportTransactions() {
    let csv = 'Type,Amount,Date,Status\n';
    
    allTransactions.forEach(t => {
        if (t.type === 'deposit') {
            csv += `Deposit,${t.amount},${t.createdAt},${t.status}\n`;
        } else if (t.type === 'withdraw') {
            csv += `Withdrawal,${t.amount},${t.createdAt},${t.status}\n`;
        } else if (t.type === 'task') {
            csv += `Task,${t.reward},${t.completedAt},completed\n`;
        } else if (t.type === 'bonus') {
            csv += `Bonus,${t.amount},${t.createdAt},completed\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    window.URL.revokeObjectURL(url);
    showNotification('Transactions exported successfully!', 'success');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initTransactionHistory();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.switchTab = switchTab;
window.filterTransactions = filterTransactions;
window.exportTransactions = exportTransactions;