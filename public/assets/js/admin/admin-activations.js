// public/assets/js/admin/admin-activations.js
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
import { showNotification, formatDate } from '../utils.js';

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
        loadActivations();
        loadStats();
    }
});

// Load activations
async function loadActivations() {
    const activationsList = document.getElementById('activationsList');
    if (!activationsList) return;
    
    try {
        const activationsRef = collection(db, 'activations');
        const q = query(activationsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const activations = [];
        snapshot.forEach(doc => {
            activations.push({ id: doc.id, ...doc.data() });
        });
        
        displayActivations(activations);
        
    } catch (error) {
        console.error('Error loading activations:', error);
        activationsList.innerHTML = '<div class="error-message">Failed to load activations</div>';
    }
}

// Display activations
function displayActivations(activations) {
    const activationsList = document.getElementById('activationsList');
    
    if (activations.length === 0) {
        activationsList.innerHTML = '<div class="no-data"><i class="fas fa-key"></i><p>No pending activations</p></div>';
        return;
    }
    
    activationsList.innerHTML = activations.map((activation, index) => `
        <div class="activation-row">
            <span>${index + 1}</span>
            <span>${activation.username || 'Unknown'}</span>
            <span>${activation.senderPhone || 'N/A'}</span>
            <td>
                <div class="message-cell" onclick="viewFullMessage('${activation.transactionMessage || 'No message'}')">
                    ${(activation.transactionMessage || 'No message').substring(0, 30)}...
                </div>
            </td>
            <span>${activation.amount} ZMW</span>
            <span>${formatDate(activation.createdAt)}</span>
            <td>
                <button class="btn-activate" onclick="activateAccount('${activation.userId}', '${activation.id}')">
                    <i class="fas fa-check"></i> Activate
                </button>
                <button class="btn-reject-activation" onclick="showRejectModal('${activation.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </div>
    `).join('');
}

// Load stats
async function loadStats() {
    try {
        const activationsRef = collection(db, 'activations');
        
        // Pending
        const pendingQuery = query(activationsRef, where('status', '==', 'pending'));
        const pendingSnapshot = await getDocs(pendingQuery);
        document.getElementById('pendingActivations').textContent = pendingSnapshot.size;
        
        // Today
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = query(activationsRef, where('createdAt', '>=', today));
        const todaySnapshot = await getDocs(todayQuery);
        document.getElementById('activatedToday').textContent = todaySnapshot.size;
        
        // Total
        const totalSnapshot = await getDocs(activationsRef);
        document.getElementById('totalActivated').textContent = totalSnapshot.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// View full message
window.viewFullMessage = function(message) {
    document.getElementById('fullActivationMessage').textContent = message;
    document.getElementById('activationMessageModal').classList.add('active');
};

// Activate account
window.activateAccount = async function(userId, activationId) {
    if (!confirm('Activate this account? User will receive 100 ZMW welcome bonus.')) {
        return;
    }
    
    try {
        // Update activation status
        await updateDoc(doc(db, 'activations', activationId), {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.uid
        });
        
        // Update user status and add welcome bonus
        await updateDoc(doc(db, 'users', userId), {
            status: 'active',
            balance: increment(100),
            totalEarned: increment(100),
            activatedAt: new Date().toISOString(),
            activatedBy: currentUser.uid
        });
        
        // Add welcome bonus notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            type: 'welcome_bonus',
            message: 'Welcome to BlackRock! You received 100 ZMW welcome bonus. Invite 10 friends to withdraw it!',
            icon: 'gift',
            color: '#00ff00',
            read: false,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Account activated successfully! Welcome bonus added.', 'success');
        loadActivations();
        loadStats();
        
    } catch (error) {
        console.error('Error activating account:', error);
        showNotification('Failed to activate account', 'error');
    }
};

// Show reject modal
window.showRejectModal = function(activationId) {
    currentActivationId = activationId;
    document.getElementById('rejectActivationModal').classList.add('active');
};

// Confirm reject
window.confirmRejectActivation = async function() {
    const reason = document.getElementById('activationRejectReason').value;
    
    if (!reason) {
        showNotification('Please provide a reason for rejection', 'error');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'activations', currentActivationId), {
            status: 'rejected',
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser.uid
        });
        
        showNotification('Activation rejected', 'info');
        closeModal('rejectActivationModal');
        loadActivations();
        
    } catch (error) {
        console.error('Error rejecting activation:', error);
        showNotification('Failed to reject activation', 'error');
    }
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'rejectActivationModal') {
        document.getElementById('activationRejectReason').value = '';
    }
};