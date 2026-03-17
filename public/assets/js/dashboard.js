// public/assets/js/dashboard.js
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
    updateDoc
} from './firebase-config.js';
import { 
    showNotification, 
    getGreeting,
    formatCurrency,
    timeAgo,
    requireActiveAccount
} from './utils.js';

let currentUser = null;
let userData = null;
let unsubscribeNotifications = null;

// Initialize dashboard
export async function initDashboard() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    // Check if account is active
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    setupRealTimeUpdates();
    loadAdminNotifications();
    loadTodayTask();
    loadNotifications();
    
    // Set greeting
    document.getElementById('greeting').textContent = getGreeting();
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
        console.error('Error loading user data:', error);
    }
}

// Update UI
function updateUI() {
    // Username
    const usernameEl = document.getElementById('username');
    if (usernameEl) usernameEl.textContent = userData?.username || 'User';
    
    // Balance
    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.textContent = formatCurrency(userData?.balance);
    
    // Total earned
    const totalEarnedEl = document.getElementById('totalEarned');
    if (totalEarnedEl) totalEarnedEl.textContent = formatCurrency(userData?.totalEarned);
    
    // User level
    const levelEl = document.getElementById('userLevel');
    if (levelEl) levelEl.textContent = userData?.level || 'VIP 1';
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Listen for user changes
    const userRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            userData = doc.data();
            updateUI();
        }
    });
}

// Load admin notifications
function loadAdminNotifications() {
    const notificationsRef = ref(rtdb, 'admin-notifications');
    onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        const marquee = document.getElementById('notificationMarquee');
        
        if (marquee && data) {
            const messages = Object.values(data)
                .filter(n => n.active)
                .map(n => n.message)
                .join(' | ');
            marquee.textContent = messages || 'No notifications';
        }
    });
}

// Load today's task
async function loadTodayTask() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tasksRef = collection(db, 'daily-tasks');
        const q = query(tasksRef, where('date', '==', today), limit(1));
        const snapshot = await getDocs(q);
        
        const container = document.getElementById('todayTask');
        if (!container) return;
        
        if (!snapshot.empty) {
            const task = snapshot.docs[0].data();
            container.innerHTML = `
                <div class="task-platform">
                    <i class="fab fa-${task.platform} ${task.platform}"></i>
                    <span>${task.platform.charAt(0).toUpperCase() + task.platform.slice(1)} Videos</span>
                </div>
                <p>${task.description}</p>
                <div class="task-meta">
                    <span class="reward">${task.reward} ZMW per video</span>
                    <span>Max: ${task.maxVideos || 10} videos</span>
                </div>
                <a href="tasks.html?platform=${task.platform}" class="btn-task">Start Earning</a>
            `;
        } else {
            container.innerHTML = `
                <div class="task-platform">
                    <i class="fas fa-video"></i>
                    <span>No Task Today</span>
                </div>
                <p>Check back tomorrow for new tasks!</p>
            `;
        }
    } catch (error) {
        console.error('Error loading task:', error);
    }
}

// Load notifications
function loadNotifications() {
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));
    
    unsubscribeNotifications = onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        updateNotificationBadge(notifications.filter(n => !n.read).length);
        displayNotifications(notifications);
    });
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Display notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: #888;">No notifications</p>';
        return;
    }
    
    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
            <i class="fas fa-${n.icon || 'info-circle'}" style="color: ${n.color || '#00ff00'}"></i>
            <div>
                <p>${n.message}</p>
                <small>${timeAgo(n.createdAt)}</small>
            </div>
        </div>
    `).join('');
}

// Mark notification as read
export async function markNotificationRead(notificationId) {
    try {
        const notifRef = doc(db, 'users', currentUser.uid, 'notifications', notificationId);
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

// Show notifications panel
export function showNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) panel.classList.add('active');
}

// Close notifications panel
export function closeNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) panel.classList.remove('active');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initDashboard();
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Attach to window
window.showNotifications = showNotifications;
window.closeNotifications = closeNotifications;
window.markNotificationRead = markNotificationRead;