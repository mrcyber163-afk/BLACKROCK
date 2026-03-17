// public/assets/js/admin/admin-users.js
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
    deleteDoc,
    orderBy,
    limit,
    startAfter
} from '../firebase-config.js';
import { showNotification, formatCurrency, validateEmail, validateZambianPhone } from '../utils.js';

let currentUser = null;
let lastVisible = null;
let currentFilter = 'all';
let searchTimeout = null;

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
        loadUsers();
        setupEventListeners();
    }
});

// Load users with pagination
async function loadUsers(searchTerm = '') {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        let usersQuery;
        const usersRef = collection(db, 'users');
        
        if (searchTerm) {
            // Search by username or email (simple contains - you might need a better search solution)
            usersQuery = query(
                usersRef,
                orderBy('username'),
                limit(20)
            );
        } else {
            usersQuery = query(
                usersRef,
                orderBy('createdAt', 'desc'),
                limit(20)
            );
        }
        
        const snapshot = await getDocs(usersQuery);
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        const users = [];
        snapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            if (searchTerm) {
                if (user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
                    users.push(user);
                }
            } else {
                users.push(user);
            }
        });
        
        displayUsers(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = '<div class="error-message">Failed to load users</div>';
    }
}

// Display users in table
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-data"><i class="fas fa-users"></i><p>No users found</p></div>';
        return;
    }
    
    usersList.innerHTML = users.map((user, index) => `
        <div class="user-row">
            <span>${index + 1}</span>
            <span>${user.username || 'N/A'}</span>
            <span>${user.email || 'N/A'}</span>
            <span>${user.phone || 'N/A'}</span>
            <span>${formatCurrency(user.balance)}</span>
            <td>
                <span class="user-status status-${user.status === 'active' ? 'active' : 'pending'}">
                    ${user.status || 'pending'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view" onclick="viewUser('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${user.status === 'suspended' ? 'btn-activate' : 'btn-suspend'}" 
                            onclick="toggleUserStatus('${user.id}', '${user.status}')">
                        <i class="fas fa-${user.status === 'suspended' ? 'check' : 'ban'}"></i>
                    </button>
                </div>
            </td>
        </div>
    `).join('');
}

// View user details
window.viewUser = function(userId) {
    window.location.href = `user-details.html?id=${userId}`;
};

// Edit user
window.editUser = function(userId) {
    currentUserId = userId;
    loadUserForEdit(userId);
    document.getElementById('userModal').classList.add('active');
};

// Load user data for edit
async function loadUserForEdit(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const user = userDoc.data();
            document.getElementById('editUsername').value = user.username || '';
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editPhone').value = user.phone?.replace('+260', '') || '';
            document.getElementById('editBalance').value = user.balance || 0;
            document.getElementById('editStatus').value = user.status || 'pending';
            document.getElementById('editLevel').value = user.level || 'VIP 1';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// Save user changes
window.saveUser = async function() {
    const username = document.getElementById('editUsername').value;
    const email = document.getElementById('editEmail').value;
    const phone = document.getElementById('editPhone').value;
    const balance = document.getElementById('editBalance').value;
    const status = document.getElementById('editStatus').value;
    const level = document.getElementById('editLevel').value;
    
    if (!username || !email || !phone) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('Invalid email format', 'error');
        return;
    }
    
    if (!validateZambianPhone(phone)) {
        showNotification('Invalid Zambian phone number', 'error');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'users', currentUserId), {
            username,
            email,
            phone: `+260${phone}`,
            balance: parseFloat(balance),
            status,
            level,
            updatedAt: new Date().toISOString()
        });
        
        showNotification('User updated successfully!', 'success');
        closeModal('userModal');
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Failed to update user', 'error');
    }
};

// Toggle user status (suspend/activate)
window.toggleUserStatus = async function(userId, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    
    try {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        
        await updateDoc(doc(db, 'users', userId), {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        showNotification(`User ${action}d successfully!`, 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Failed to update user status', 'error');
    }
};

// Delete user
window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone!')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'users', userId));
        showNotification('User deleted successfully!', 'success');
        loadUsers();
        closeModal('userModal');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
};

// Filter users by status
window.filterUsers = function(status) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    currentFilter = status;
    loadUsers();
};

// Search users
window.searchUsers = function() {
    clearTimeout(searchTimeout);
    const searchTerm = document.getElementById('searchInput').value;
    
    searchTimeout = setTimeout(() => {
        loadUsers(searchTerm);
    }, 500);
};

// Load more users (pagination)
window.loadMoreUsers = function() {
    if (lastVisible) {
        // Implement pagination here
        console.log('Load more...');
    }
};

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchUsers);
    }
}