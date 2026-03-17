// public/assets/js/tasks.js
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
    addDoc,
    updateDoc,
    increment,
    orderBy
} from './firebase-config.js';
import { showNotification, formatCurrency, requireActiveAccount } from './utils.js';

let currentUser = null;
let userData = null;
let currentFilter = 'all';
let tasks = [];

// Initialize tasks page
export async function initTasks() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    const isActive = await requireActiveAccount();
    if (!isActive) return;
    
    await loadUserData();
    await loadTasks();
    setupFilters();
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
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(userData?.balance);
    }
}

// Load tasks
async function loadTasks() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tasksRef = collection(db, 'daily-tasks');
        const q = query(tasksRef, where('date', '==', today));
        const snapshot = await getDocs(q);
        
        tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data(), completed: 0 });
        });
        
        // Load user's completed tasks today
        await loadCompletedTasks();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        loadMockTasks();
    }
}

// Load completed tasks for today
async function loadCompletedTasks() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const historyRef = collection(db, 'users', currentUser.uid, 'task-history');
        const q = query(
            historyRef,
            where('date', '==', today),
            orderBy('completedAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const completed = {};
        
        snapshot.forEach(doc => {
            const task = doc.data();
            completed[task.platform] = (completed[task.platform] || 0) + 1;
        });
        
        // Update tasks with completed count
        tasks = tasks.map(task => ({
            ...task,
            completed: completed[task.platform] || 0
        }));
        
        displayTasks();
        
    } catch (error) {
        console.error('Error loading completed tasks:', error);
        displayTasks();
    }
}

// Load mock tasks (for demo)
function loadMockTasks() {
    tasks = [
        {
            id: '1',
            platform: 'tiktok',
            title: 'Watch TikTok Video',
            description: 'Watch and engage with this TikTok video',
            videoUrl: 'https://tiktok.com/@user/video/1',
            action: 'Like, Comment, Share',
            reward: 2,
            maxPerDay: 10,
            completed: 0
        },
        {
            id: '2',
            platform: 'facebook',
            title: 'Watch Facebook Video',
            description: 'Watch and react to this Facebook video',
            videoUrl: 'https://facebook.com/watch/1',
            action: 'Like, Share, Comment',
            reward: 3,
            maxPerDay: 8,
            completed: 0
        },
        {
            id: '3',
            platform: 'youtube',
            title: 'Watch YouTube Video',
            description: 'Watch 2 minutes of this YouTube video',
            videoUrl: 'https://youtube.com/watch?v=1',
            action: 'Like, Subscribe, Comment',
            reward: 4,
            maxPerDay: 5,
            completed: 0
        },
        {
            id: '4',
            platform: 'instagram',
            title: 'Watch Instagram Reel',
            description: 'Watch and engage with this Instagram Reel',
            videoUrl: 'https://instagram.com/reel/1',
            action: 'Like, Comment, Share',
            reward: 2,
            maxPerDay: 10,
            completed: 0
        }
    ];
    displayTasks();
}

// Display tasks
function displayTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    let filteredTasks = tasks;
    if (currentFilter !== 'all') {
        filteredTasks = tasks.filter(t => t.platform === currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-tasks"></i>
                <h3>No Tasks Available</h3>
                <p>Check back later for new tasks</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTasks.map(task => `
        <div class="task-card" data-platform="${task.platform}">
            <div class="task-header">
                <i class="fab fa-${task.platform} ${task.platform}"></i>
                <span class="task-title">${task.title}</span>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-requirements">
                <i class="fas fa-check-circle"></i> ${task.action}
            </div>
            <div class="task-footer">
                <span class="task-reward">${task.reward} ZMW</span>
                <button onclick="startTask('${task.id}')" class="btn-start" id="btn-${task.id}">
                    Start Task
                </button>
            </div>
            <div class="daily-limit">
                <i class="fas fa-clock"></i> Completed: ${task.completed || 0}/${task.maxPerDay || 10} today
            </div>
        </div>
    `).join('');
}

// Start task
export async function startTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.completed >= task.maxPerDay) {
        showNotification('You have reached the daily limit for this task', 'error');
        return;
    }
    
    // Open video
    window.open(task.videoUrl, '_blank');
    
    // Confirm completion
    const confirmed = confirm('Did you complete the task? (Like, comment, share as required)');
    if (confirmed) {
        await completeTask(taskId);
    }
}

// Complete task
async function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const btn = document.getElementById(`btn-${taskId}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing...';
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Add to history
        await addDoc(collection(db, 'users', currentUser.uid, 'task-history'), {
            taskId: taskId,
            platform: task.platform,
            reward: task.reward,
            date: today,
            completedAt: new Date().toISOString()
        });
        
        // Update user balance
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balance: increment(task.reward),
            totalEarned: increment(task.reward),
            totalTasks: increment(1)
        });
        
        // Update local count
        task.completed++;
        
        showNotification(`Task completed! You earned ${task.reward} ZMW`, 'success');
        
        // Refresh
        await loadCompletedTasks();
        await loadUserData();
        
    } catch (error) {
        console.error('Error completing task:', error);
        showNotification('Failed to complete task', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Start Task';
        }
    }
}

// Setup filter buttons
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.platform;
            displayTasks();
        });
    });
}

// Check for platform in URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const platform = urlParams.get('platform');
    if (platform) {
        currentFilter = platform;
        setTimeout(() => {
            const btn = document.querySelector(`[data-platform="${platform}"]`);
            if (btn) btn.click();
        }, 500);
    }
});

// Attach to window
window.startTask = startTask;