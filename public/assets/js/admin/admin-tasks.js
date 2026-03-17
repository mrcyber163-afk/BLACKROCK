// public/assets/js/admin/admin-tasks.js
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
    orderBy
} from '../firebase-config.js';
import { showNotification } from '../utils.js';

let currentUser = null;
let editingTaskId = null;

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
        loadTasks();
    }
});

// Load all tasks
async function loadTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    try {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        displayTasks(tasks);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksList.innerHTML = '<div class="error-message">Failed to load tasks</div>';
    }
}

// Display tasks in table
function displayTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="no-data"><i class="fas fa-tasks"></i><p>No tasks found</p></div>';
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-row">
            <span>#${task.id.slice(-4)}</span>
            <td><span class="platform-badge platform-${task.platform}">${task.platform}</span></td>
            <span>${task.title}</span>
            <span>${task.reward} ZMW</span>
            <span>${task.maxPerDay || 10}/day</span>
            <td><span class="status-badge status-${task.status || 'active'}">${task.status || 'active'}</span></td>
            <td>
                <button class="action-btn btn-edit" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-toggle" onclick="toggleTaskStatus('${task.id}', '${task.status}')">
                    <i class="fas fa-${task.status === 'active' ? 'eye' : 'eye-slash'}"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </div>
    `).join('');
}

// Show create task modal
window.showCreateTaskModal = function() {
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'Create New Task';
    document.getElementById('taskModal').classList.add('active');
    
    // Clear form
    document.getElementById('taskPlatform').value = 'tiktok';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskUrl').value = '';
    document.getElementById('taskAction').value = '';
    document.getElementById('taskReward').value = '';
    document.getElementById('taskLimit').value = '10';
    document.getElementById('taskStatus').value = 'active';
};

// Edit task
window.editTask = async function(taskId) {
    editingTaskId = taskId;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    
    try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
            const task = taskDoc.data();
            document.getElementById('taskPlatform').value = task.platform || 'tiktok';
            document.getElementById('taskTitle').value = task.title || '';
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskUrl').value = task.videoUrl || '';
            document.getElementById('taskAction').value = task.action || '';
            document.getElementById('taskReward').value = task.reward || '';
            document.getElementById('taskLimit').value = task.maxPerDay || 10;
            document.getElementById('taskStatus').value = task.status || 'active';
        }
    } catch (error) {
        console.error('Error loading task:', error);
        showNotification('Failed to load task', 'error');
    }
    
    document.getElementById('taskModal').classList.add('active');
};

// Close task modal
window.closeTaskModal = function() {
    document.getElementById('taskModal').classList.remove('active');
};

// Save task
window.saveTask = async function() {
    const platform = document.getElementById('taskPlatform').value;
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const videoUrl = document.getElementById('taskUrl').value;
    const action = document.getElementById('taskAction').value;
    const reward = parseFloat(document.getElementById('taskReward').value);
    const maxPerDay = parseInt(document.getElementById('taskLimit').value);
    const status = document.getElementById('taskStatus').value;
    
    if (!title || !description || !videoUrl || !action || !reward) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (reward < 1) {
        showNotification('Reward must be at least 1 ZMW', 'error');
        return;
    }
    
    try {
        const taskData = {
            platform,
            title,
            description,
            videoUrl,
            action,
            reward,
            maxPerDay,
            status,
            updatedAt: new Date().toISOString()
        };
        
        if (editingTaskId) {
            // Update existing task
            await updateDoc(doc(db, 'tasks', editingTaskId), taskData);
            showNotification('Task updated successfully!', 'success');
        } else {
            // Create new task
            taskData.createdAt = new Date().toISOString();
            taskData.createdBy = currentUser.uid;
            await addDoc(collection(db, 'tasks'), taskData);
            showNotification('Task created successfully!', 'success');
        }
        
        closeTaskModal();
        loadTasks();
        
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification('Failed to save task', 'error');
    }
};

// Toggle task status
window.toggleTaskStatus = async function(taskId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        showNotification(`Task ${newStatus === 'active' ? 'activated' : 'deactivated'}!`, 'success');
        loadTasks();
        
    } catch (error) {
        console.error('Error toggling task:', error);
        showNotification('Failed to update task', 'error');
    }
};

// Delete task
window.deleteTask = async function(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        showNotification('Task deleted successfully!', 'success');
        loadTasks();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
};

// Set daily task
window.setDailyTask = async function() {
    const platform = document.querySelector('.platform-option.selected span')?.textContent.toLowerCase();
    const date = document.getElementById('taskDate')?.value;
    const description = document.getElementById('taskDescription')?.value;
    const reward = document.getElementById('taskReward')?.value;
    const maxVideos = document.getElementById('taskMaxVideos')?.value;
    
    if (!platform || !date || !description || !reward) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    try {
        // Check if task already exists for this date
        const dailyRef = collection(db, 'daily-tasks');
        const q = query(dailyRef, where('date', '==', date));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Update existing
            const docId = snapshot.docs[0].id;
            await updateDoc(doc(db, 'daily-tasks', docId), {
                platform,
                description,
                reward: parseFloat(reward),
                maxVideos: parseInt(maxVideos),
                updatedAt: new Date().toISOString()
            });
        } else {
            // Create new
            await addDoc(collection(db, 'daily-tasks'), {
                platform,
                date,
                description,
                reward: parseFloat(reward),
                maxVideos: parseInt(maxVideos),
                createdAt: new Date().toISOString()
            });
        }
        
        showNotification('Daily task updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error setting daily task:', error);
        showNotification('Failed to set daily task', 'error');
    }
};