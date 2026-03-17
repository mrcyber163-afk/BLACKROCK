// public/assets/js/admin/admin-notifications.js
import { 
    auth, 
    db,
    rtdb,
    onAuthStateChanged,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    addDoc,
    ref,
    set,
    push
} from '../firebase-config.js';
import { showNotification } from '../utils.js';

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
        loadRecentNotifications();
    }
});

// Select notification type
window.selectType = function(type) {
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
};

// Update preview
window.updatePreview = function() {
    const title = document.getElementById('notifTitle').value || 'New Notification';
    const message = document.getElementById('notifMessage').value || 'Your message will appear here';
    const icon = document.getElementById('notifIcon').value;
    
    const preview = document.getElementById('notificationPreview');
    preview.innerHTML = `
        <div class="preview-header">
            <div class="preview-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div>
                <div class="preview-title">${title}</div>
                <div class="preview-time">Just now</div>
            </div>
        </div>
        <div class="preview-message">
            ${message}
        </div>
    `;
};

// Send notification
document.getElementById('notificationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;
    const icon = document.getElementById('notifIcon').value;
    const schedule = document.getElementById('notifSchedule').value;
    
    if (!title || !message) {
        showNotification('Please fill in title and message', 'error');
        return;
    }
    
    const selectedType = document.querySelector('.type-option.selected span')?.textContent;
    
    try {
        if (schedule) {
            // Save scheduled notification
            await addDoc(collection(db, 'scheduled-notifications'), {
                title,
                message,
                icon,
                type: selectedType,
                scheduledFor: schedule,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid
            });
            
            showNotification(`Notification scheduled for ${new Date(schedule).toLocaleString()}`, 'success');
        } else {
            // Send immediately
            await sendNotificationToUsers(title, message, icon, selectedType);
            showNotification('Notification sent successfully!', 'success');
        }
        
        document.getElementById('notificationForm').reset();
        loadRecentNotifications();
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Failed to send notification', 'error');
    }
});

// Send notification to users
async function sendNotificationToUsers(title, message, icon, type) {
    const usersRef = collection(db, 'users');
    let q;
    
    if (type === 'All Users') {
        q = query(usersRef);
    } else if (type === 'Active Only') {
        q = query(usersRef, where('status', '==', 'active'));
    } else if (type === 'VIP Only') {
        q = query(usersRef, where('level', 'in', ['VIP 2', 'VIP 3', 'VIP 4']));
    }
    
    const snapshot = await getDocs(q);
    
    const notifications = [];
    snapshot.forEach(doc => {
        notifications.push({
            userId: doc.id,
            notification: {
                type: 'admin',
                title,
                message,
                icon,
                read: false,
                createdAt: new Date().toISOString()
            }
        });
    });
    
    // Add to each user's notifications
    for (const notif of notifications) {
        await addDoc(collection(db, 'users', notif.userId, 'notifications'), notif.notification);
    }
    
    // Log to admin history
    await addDoc(collection(db, 'notification-history'), {
        title,
        message,
        icon,
        type,
        recipientCount: notifications.length,
        sentAt: new Date().toISOString(),
        sentBy: currentUser.uid
    });
}

// Update marquee
window.updateMarquee = async function() {
    const text = document.getElementById('marqueeText').value;
    
    if (!text) {
        showNotification('Please enter marquee text', 'error');
        return;
    }
    
    try {
        const marqueeRef = ref(rtdb, 'admin-notifications/current');
        await set(marqueeRef, {
            message: text,
            active: true,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        });
        
        showNotification('Marquee updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating marquee:', error);
        showNotification('Failed to update marquee', 'error');
    }
};

// Load recent notifications
async function loadRecentNotifications() {
    const scheduledList = document.querySelector('.scheduled-list');
    if (!scheduledList) return;
    
    try {
        const historyRef = collection(db, 'notification-history');
        const snapshot = await getDocs(query(historyRef));
        
        const history = [];
        snapshot.forEach(doc => {
            history.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date
        history.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
        
        scheduledList.innerHTML = history.slice(0, 5).map(notif => `
            <div class="scheduled-item">
                <div class="scheduled-info">
                    <h4>${notif.title}</h4>
                    <p>Sent to ${notif.recipientCount} users • ${timeAgo(notif.sentAt)}</p>
                </div>
                <span class="status-badge status-approved">Sent</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Cancel scheduled notification
window.cancelScheduled = async function(id) {
    if (!confirm('Cancel this scheduled notification?')) return;
    
    try {
        await deleteDoc(doc(db, 'scheduled-notifications', id));
        showNotification('Notification cancelled', 'success');
        loadRecentNotifications();
    } catch (error) {
        console.error('Error cancelling notification:', error);
        showNotification('Failed to cancel notification', 'error');
    }
};

// Time ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}