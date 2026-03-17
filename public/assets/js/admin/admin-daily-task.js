// public/assets/js/admin/admin-daily-task.js
import { 
    auth, 
    db,
    onAuthStateChanged,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit
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
        loadCurrentDailyTask();
        loadDailyTaskHistory();
    }
});

// Load current daily task
async function loadCurrentDailyTask() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, where('date', '==', today), limit(1));
        const snapshot = await getDocs(q);
        
        const currentTaskDiv = document.getElementById('currentTaskDisplay');
        if (!currentTaskDiv) return;
        
        if (!snapshot.empty) {
            const task = snapshot.docs[0].data();
            
            currentTaskDiv.innerHTML = `
                <div class="task-display">
                    <i class="fab fa-${task.platform} ${task.platform}" style="font-size: 60px;"></i>
                    <div class="platform">${task.platform.charAt(0).toUpperCase() + task.platform.slice(1)} Videos</div>
                    <div class="date">${formatDate(task.date)}</div>
                    <div class="description">${task.description}</div>
                    <div class="reward">${task.reward} ZMW per video</div>
                    <small style="color: #888; display: block; margin-top: 10px;">Max: ${task.maxVideos || 10} videos per user</small>
                </div>
            `;
            
            // Pre-fill form with current task
            document.getElementById('taskDate').value = task.date;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskReward').value = task.reward || '';
            document.getElementById('taskMaxVideos').value = task.maxVideos || 10;
            
            // Select platform
            document.querySelectorAll('.platform-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.querySelector('span').textContent.toLowerCase() === task.platform) {
                    opt.classList.add('selected');
                }
            });
            
        } else {
            currentTaskDiv.innerHTML = `
                <div class="task-display">
                    <i class="fas fa-calendar-day" style="font-size: 60px; color: #333;"></i>
                    <div class="platform">No Task Set</div>
                    <div class="date">${formatDate(today)}</div>
                    <div class="description">Click "Set as Today's Task" to create today's task</div>
                </div>
            `;
            
            // Set default date to today
            document.getElementById('taskDate').value = today;
        }
        
    } catch (error) {
        console.error('Error loading current daily task:', error);
    }
}

// Load daily task history
async function loadDailyTaskHistory() {
    const historyList = document.getElementById('dailyTaskHistory');
    if (!historyList) return;
    
    try {
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, orderBy('date', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        if (tasks.length === 0) {
            historyList.innerHTML = '<div class="no-data"><i class="fas fa-history"></i><p>No task history</p></div>';
            return;
        }
        
        historyList.innerHTML = tasks.map(task => `
            <div class="history-item" onclick="loadTaskForEdit('${task.id}')">
                <div class="platform">
                    <i class="fab fa-${task.platform} ${task.platform}"></i>
                    <span>${task.platform.charAt(0).toUpperCase() + task.platform.slice(1)}</span>
                </div>
                <span class="date">${formatDate(task.date)}</span>
                <span class="reward">${task.reward} ZMW</span>
                <button class="btn-edit" style="padding: 3px 8px;" onclick="event.stopPropagation(); editHistoryTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading task history:', error);
    }
}

// Select platform
window.selectPlatform = function(platform) {
    document.querySelectorAll('.platform-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
};

// Set daily task
window.setDailyTask = async function(event) {
    event.preventDefault();
    
    const selectedPlatform = document.querySelector('.platform-option.selected span')?.textContent.toLowerCase();
    const date = document.getElementById('taskDate')?.value;
    const description = document.getElementById('taskDescription')?.value;
    const reward = parseFloat(document.getElementById('taskReward')?.value);
    const maxVideos = parseInt(document.getElementById('taskMaxVideos')?.value) || 10;
    
    if (!selectedPlatform) {
        showNotification('Please select a platform', 'error');
        return;
    }
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    if (!description) {
        showNotification('Please enter task description', 'error');
        return;
    }
    
    if (!reward || reward < 1) {
        showNotification('Please enter a valid reward (minimum 1 ZMW)', 'error');
        return;
    }
    
    try {
        // Check if task already exists for this date
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, where('date', '==', date));
        const snapshot = await getDocs(q);
        
        const taskData = {
            platform: selectedPlatform,
            date: date,
            description: description,
            reward: reward,
            maxVideos: maxVideos,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        };
        
        if (!snapshot.empty) {
            // Update existing
            const docId = snapshot.docs[0].id;
            await updateDoc(doc(db, 'daily-tasks', docId), taskData);
            showNotification(`Daily task for ${date} updated successfully!`, 'success');
        } else {
            // Create new
            taskData.createdAt = new Date().toISOString();
            taskData.createdBy = currentUser.uid;
            await addDoc(collection(db, 'daily-tasks'), taskData);
            showNotification('Daily task created successfully!', 'success');
        }
        
        // Reload displays
        loadCurrentDailyTask();
        loadDailyTaskHistory();
        
    } catch (error) {
        console.error('Error setting daily task:', error);
        showNotification('Failed to set daily task', 'error');
    }
};

// Load task for editing
window.loadTaskForEdit = async function(taskId) {
    try {
        const taskDoc = await getDoc(doc(db, 'daily-tasks', taskId));
        if (taskDoc.exists()) {
            const task = taskDoc.data();
            
            document.getElementById('taskDate').value = task.date;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskReward').value = task.reward || '';
            document.getElementById('taskMaxVideos').value = task.maxVideos || 10;
            
            // Select platform
            document.querySelectorAll('.platform-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.querySelector('span').textContent.toLowerCase() === task.platform) {
                    opt.classList.add('selected');
                }
            });
            
            showNotification('Task loaded for editing', 'success');
        }
    } catch (error) {
        console.error('Error loading task:', error);
        showNotification('Failed to load task', 'error');
    }
};

// Edit history task
window.editHistoryTask = async function(taskId) {
    await loadTaskForEdit(taskId);
};

// Delete task
window.deleteTask = async function(taskId) {
    if (!confirm('Are you sure you want to delete this daily task?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'daily-tasks', taskId));
        showNotification('Task deleted successfully!', 'success');
        loadDailyTaskHistory();
        loadCurrentDailyTask();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
};

// Preview task for selected date
window.previewTask = async function() {
    const date = document.getElementById('taskDate')?.value;
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    try {
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, where('date', '==', date));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const task = snapshot.docs[0].data();
            showNotification(`Task exists for ${date}: ${task.platform} - ${task.reward} ZMW`, 'info');
        } else {
            showNotification(`No task set for ${date}`, 'info');
        }
        
    } catch (error) {
        console.error('Error previewing task:', error);
    }
};

// Copy from previous day
window.copyFromPreviousDay = async function() {
    const date = document.getElementById('taskDate')?.value;
    
    if (!date) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    try {
        // Get previous day
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, where('date', '==', prevDateStr));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showNotification('No task found for previous day', 'error');
            return;
        }
        
        const prevTask = snapshot.docs[0].data();
        
        document.getElementById('taskDescription').value = prevTask.description || '';
        document.getElementById('taskReward').value = prevTask.reward || '';
        document.getElementById('taskMaxVideos').value = prevTask.maxVideos || 10;
        
        // Select platform
        document.querySelectorAll('.platform-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.querySelector('span').textContent.toLowerCase() === prevTask.platform) {
                opt.classList.add('selected');
            }
        });
        
        showNotification('Copied from previous day', 'success');
        
    } catch (error) {
        console.error('Error copying from previous day:', error);
        showNotification('Failed to copy from previous day', 'error');
    }
};