// public/assets/js/admin/admin-dashboard.js
import { 
    auth, 
    db,
    rtdb,
    onAuthStateChanged,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    onSnapshot,
    ref,
    onValue,
    signOut
} from '../firebase-config.js';
import { showNotification, formatCurrency } from '../utils.js';

// Check if user is admin
export async function checkAdminAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                await signOut(auth);
                window.location.href = '../login.html';
            } else {
                // Load dashboard data
                loadDashboardStats();
                loadRecentActivity();
                loadAdminNotifications();
            }
        } catch (error) {
            console.error('Auth error:', error);
            window.location.href = '../login.html';
        }
    });
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // Total users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        // New users today
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = query(usersRef, where('createdAt', '>=', today));
        const todaySnapshot = await getDocs(todayQuery);
        document.getElementById('newToday').textContent = todaySnapshot.size;
        
        // Pending activations
        const pendingQuery = query(usersRef, where('status', '==', 'pending_activation'));
        const pendingSnapshot = await getDocs(pendingQuery);
        document.getElementById('pendingActivations').textContent = pendingSnapshot.size;
        
        // Pending withdrawals
        const withdrawalsRef = collection(db, 'withdrawals');
        const withdrawQuery = query(withdrawalsRef, where('status', '==', 'pending'));
        const withdrawSnapshot = await getDocs(withdrawQuery);
        document.getElementById('pendingWithdrawals').textContent = withdrawSnapshot.size;
        
        // Pending deposits
        const depositsRef = collection(db, 'deposits');
        const depositQuery = query(depositsRef, where('status', '==', 'pending'));
        const depositSnapshot = await getDocs(depositQuery);
        document.getElementById('pendingDeposits').textContent = depositSnapshot.size;
        
        // Total tasks completed
        let totalTasks = 0;
        const users = await getDocs(usersRef);
        for (const userDoc of users.docs) {
            const tasksRef = collection(db, 'users', userDoc.id, 'task-history');
            const tasksSnapshot = await getDocs(tasksRef);
            totalTasks += tasksSnapshot.size;
        }
        document.getElementById('totalTasks').textContent = totalTasks;
        
        // Total paid
        let totalPaid = 0;
        const completedWithdrawals = query(withdrawalsRef, where('status', '==', 'completed'));
        const withdrawCompleted = await getDocs(completedWithdrawals);
        withdrawCompleted.forEach(doc => {
            totalPaid += doc.data().amount || 0;
        });
        document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const activities = [];
        
        // Recent registrations
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, orderBy('createdAt', 'desc'), limit(3));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            activities.push({
                icon: 'user-plus',
                text: `New user registered: ${user.username}`,
                time: user.createdAt,
                type: 'success'
            });
        });
        
        // Recent deposits
        const depositsRef = collection(db, 'deposits');
        const depositsQuery = query(depositsRef, orderBy('createdAt', 'desc'), limit(3));
        const depositsSnapshot = await getDocs(depositsQuery);
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            activities.push({
                icon: 'arrow-down',
                text: `Deposit request: ${deposit.amount} ZMW from ${deposit.username}`,
                time: deposit.createdAt,
                type: deposit.status === 'pending' ? 'pending' : 'success'
            });
        });
        
        // Sort by time
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        // Display
        activityList.innerHTML = activities.slice(0, 5).map(act => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${act.icon}"></i>
                </div>
                <div class="activity-details">
                    <p>${act.text}</p>
                    <small>${timeAgo(act.time)}</small>
                </div>
                <span class="activity-status status-${act.type}">${act.type}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Load admin notifications from Realtime Database
function loadAdminNotifications() {
    const notificationsRef = ref(rtdb, 'admin-notifications');
    onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        const badge = document.querySelector('.admin-notification .badge');
        if (badge && data) {
            const count = Object.keys(data).length;
            badge.textContent = count;
        }
    });
}

// Time ago formatter
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', checkAdminAuth);

// Attach to window
window.logout = logout;