// public/assets/js/admin/admin-investments.js
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
        loadInvestments();
        loadStats();
    }
});

// Load all investments
async function loadInvestments(filter = 'all') {
    const investmentsList = document.getElementById('investmentsList');
    if (!investmentsList) return;
    
    try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const investments = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const investmentsRef = collection(db, 'users', userDoc.id, 'investments');
            let q;
            
            if (filter === 'all') {
                q = query(investmentsRef, orderBy('createdAt', 'desc'));
            } else {
                q = query(investmentsRef, where('status', '==', filter), orderBy('createdAt', 'desc'));
            }
            
            const investmentsSnapshot = await getDocs(q);
            investmentsSnapshot.forEach(doc => {
                investments.push({
                    id: doc.id,
                    userId: userDoc.id,
                    username: userDoc.data().username,
                    ...doc.data()
                });
            });
        }
        
        // Sort by date
        investments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        displayInvestments(investments);
        
    } catch (error) {
        console.error('Error loading investments:', error);
        investmentsList.innerHTML = '<div class="error-message">Failed to load investments</div>';
    }
}

// Display investments
function displayInvestments(investments) {
    const investmentsList = document.getElementById('investmentsList');
    
    if (investments.length === 0) {
        investmentsList.innerHTML = '<div class="no-data"><i class="fas fa-chart-line"></i><p>No investments found</p></div>';
        return;
    }
    
    investmentsList.innerHTML = investments.map((inv, index) => {
        const startDate = new Date(inv.createdAt);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + inv.duration);
        
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        const progress = ((inv.duration - daysLeft) / inv.duration) * 100;
        
        return `
            <div class="investment-row" data-status="${inv.status}">
                <span>#${(index + 1).toString().padStart(3, '0')}</span>
                <span>${inv.username || 'Unknown'}</span>
                <span>${inv.planName || 'N/A'}</span>
                <span>${inv.amount} ZMW</span>
                <span>${inv.returns}% (${(inv.amount * inv.returns / 100).toFixed(2)} ZMW)</span>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${daysLeft} days left</small>
                </td>
                <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
                <td>
                    ${inv.status === 'matured' ? `
                        <button class="action-btn btn-mature" onclick="processMatured('${inv.userId}', '${inv.id}', ${inv.amount + (inv.amount * inv.returns / 100)})">
                            <i class="fas fa-coins"></i> Pay
                        </button>
                    ` : ''}
                    <button class="action-btn btn-view" onclick="viewInvestment('${inv.userId}', '${inv.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </div>
        `;
    }).join('');
}

// Load stats
async function loadStats() {
    try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        let totalInvested = 0;
        let activeCount = 0;
        let maturedCount = 0;
        let totalReturns = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const investmentsRef = collection(db, 'users', userDoc.id, 'investments');
            const investmentsSnapshot = await getDocs(investmentsRef);
            
            investmentsSnapshot.forEach(doc => {
                const inv = doc.data();
                totalInvested += inv.amount || 0;
                
                if (inv.status === 'active') activeCount++;
                if (inv.status === 'matured') maturedCount++;
                if (inv.status === 'completed') {
                    totalReturns += (inv.amount * inv.returns / 100) || 0;
                }
            });
        }
        
        document.getElementById('totalInvested').textContent = formatCurrency(totalInvested);
        document.getElementById('activeInvestments').textContent = activeCount;
        document.getElementById('maturedToday').textContent = maturedCount;
        document.getElementById('totalReturns').textContent = formatCurrency(totalReturns);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Filter investments
window.filterInvestments = function(filter) {
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadInvestments(filter);
};

// View investment details
window.viewInvestment = async function(userId, investmentId) {
    try {
        const investmentDoc = await getDoc(doc(db, 'users', userId, 'investments', investmentId));
        if (investmentDoc.exists()) {
            const inv = investmentDoc.data();
            
            // Populate modal
            document.getElementById('invId').textContent = investmentId.slice(-4);
            document.getElementById('invUser').textContent = inv.username || 'Unknown';
            document.getElementById('invPlan').textContent = inv.planName || 'N/A';
            document.getElementById('invAmount').textContent = formatCurrency(inv.amount);
            document.getElementById('invReturns').textContent = `${formatCurrency(inv.amount * inv.returns / 100)} (${inv.returns}%)`;
            document.getElementById('invStart').textContent = formatDate(inv.createdAt);
            
            const endDate = new Date(inv.createdAt);
            endDate.setDate(endDate.getDate() + inv.duration);
            document.getElementById('invMatures').textContent = formatDate(endDate);
            
            const statusSpan = document.getElementById('invStatus');
            statusSpan.textContent = inv.status;
            statusSpan.className = `status-badge status-${inv.status}`;
            
            document.getElementById('investmentModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading investment:', error);
        showNotification('Failed to load investment details', 'error');
    }
};

// Process matured investment
window.processMatured = async function(userId, investmentId, totalAmount) {
    if (!confirm(`Process payout of ${formatCurrency(totalAmount)} for this investment?`)) {
        return;
    }
    
    try {
        // Update investment status
        await updateDoc(doc(db, 'users', userId, 'investments', investmentId), {
            status: 'completed',
            completedAt: new Date().toISOString()
        });
        
        // Add to user balance
        await updateDoc(doc(db, 'users', userId), {
            balance: increment(totalAmount)
        });
        
        // Add notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            type: 'investment_completed',
            message: `Your investment has matured! ${formatCurrency(totalAmount)} added to your balance.`,
            icon: 'coins',
            color: '#00ff00',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Payout processed successfully!', 'success');
        closeModal('investmentModal');
        loadInvestments();
        loadStats();
        
    } catch (error) {
        console.error('Error processing payout:', error);
        showNotification('Failed to process payout', 'error');
    }
};

// Edit plan
window.editPlan = function(plan) {
    currentPlan = plan;
    document.getElementById('planModalTitle').textContent = `Edit ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
    document.getElementById('editPlanModal').classList.add('active');
};

// Save plan
window.savePlan = async function() {
    const name = document.getElementById('planName').value;
    const duration = parseInt(document.getElementById('planDuration').value);
    const min = parseInt(document.getElementById('planMin').value);
    const max = parseInt(document.getElementById('planMax').value);
    const returns = parseFloat(document.getElementById('planReturns').value);
    
    // Save to Firebase (you might want a separate collection for plans)
    showNotification(`${name} plan updated successfully!`, 'success');
    closeModal('editPlanModal');
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};