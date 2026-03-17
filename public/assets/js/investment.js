// public/assets/js/investment.js
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
    confirmAction
} from './utils.js';

let currentUser = null;
let userData = null;

// Investment plans
const investmentPlans = {
    starter: {
        name: 'Starter Plan',
        min: 500,
        max: 2000,
        duration: 30,
        returns: 30,
        daily: 1
    },
    growth: {
        name: 'Growth Plan',
        min: 1000,
        max: 10000,
        duration: 90,
        returns: 45,
        daily: 0.5
    },
    wealth: {
        name: 'Wealth Plan',
        min: 1500,
        max: Infinity,
        duration: 180,
        returns: 75,
        daily: 0.42
    }
};

// Initialize investment page
export async function initInvestment() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    loadInvestments();
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
    const balanceEls = document.querySelectorAll('#balance, #investBalance');
    balanceEls.forEach(el => {
        if (el) el.textContent = formatCurrency(userData?.balance);
    });
}

// Load user investments
function loadInvestments() {
    const investmentsRef = collection(db, 'users', currentUser.uid, 'investments');
    const q = query(investmentsRef, orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        const investments = [];
        snapshot.forEach(doc => {
            investments.push({ id: doc.id, ...doc.data() });
        });
        
        displayInvestments(investments);
    });
}

// Display investments
function displayInvestments(investments) {
    const container = document.getElementById('investmentsList');
    if (!container) return;
    
    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No active investments</p>
                <p style="font-size: 13px;">Start investing to grow your wealth</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = investments.map(inv => {
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
}

// Invest now
export async function investNow(planKey) {
    if (!userData) return;
    
    const plan = investmentPlans[planKey];
    if (!plan) return;
    
    // Ask for amount
    const amountStr = prompt(`Enter amount to invest (minimum ${plan.min} ZMW):`, plan.min);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount < plan.min) {
        showNotification(`Minimum investment is ${plan.min} ZMW`, 'error');
        return;
    }
    
    if (amount > plan.max && plan.max !== Infinity) {
        showNotification(`Maximum investment is ${plan.max} ZMW`, 'error');
        return;
    }
    
    if (amount > (userData.balance || 0)) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    // Confirm
    const confirmed = await confirmAction(
        `Invest ${amount} ZMW in ${plan.name} for ${plan.duration} days?\n` +
        `Returns: ${plan.returns}% (${amount * plan.returns / 100} ZMW)\n` +
        `Total: ${amount + (amount * plan.returns / 100)} ZMW`
    );
    
    if (!confirmed) return;
    
    // Disable button
    const btn = document.getElementById(`invest${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing...';
    }
    
    showLoading();
    
    try {
        // Create investment
        await addDoc(collection(db, 'users', currentUser.uid, 'investments'), {
            planName: plan.name,
            amount: amount,
            duration: plan.duration,
            returns: plan.returns,
            status: 'active',
            createdAt: new Date().toISOString(),
            expectedReturn: amount * (plan.returns / 100),
            totalExpected: amount + (amount * (plan.returns / 100))
        });
        
        // Deduct from balance
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balance: increment(-amount)
        });
        
        showNotification(
            `Investment successful! You will receive ${amount + (amount * plan.returns / 100)} ZMW after ${plan.duration} days.`,
            'success'
        );
        
        // Reload data
        await loadUserData();
        
    } catch (error) {
        console.error('Investment error:', error);
        showNotification('Failed to process investment', 'error');
    } finally {
        hideLoading();
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Invest Now';
        }
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initInvestment();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.investNow = investNow;