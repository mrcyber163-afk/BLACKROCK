// public/assets/js/utils.js
// Utility functions used across all pages

// Show notification
export function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notification
    const existing = document.querySelector('.notification-popup');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-popup ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Show loading
export function showLoading() {
    const existing = document.querySelector('.loading-overlay');
    if (existing) return;
    
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
}

// Hide loading
export function hideLoading() {
    const loader = document.querySelector('.loading-overlay');
    if (loader) loader.remove();
}

// Validate Zambian phone
export function validateZambianPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^[97][0-9]{8}$/.test(cleaned);
}

// Format phone to international
export function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return '+260' + cleaned;
}

// Validate email
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Format date
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Time ago
export function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
}

// Copy to clipboard
export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}

// Generate referral code
export function generateReferralCode(username) {
    const prefix = username.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
}

// Format currency
export function formatCurrency(amount) {
    return `${parseFloat(amount || 0).toFixed(2)} ZMW`;
}

// Get greeting based on time
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 20) return 'Evening';
    return 'Night';
}

// Check if user is authenticated
export function requireAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = 'login.html';
            }
        });
    });
}

// Log error
export function logError(error, context = '') {
    console.error(`Error ${context}:`, error);
    // You can also send to a logging service
}

// Show confirm dialog
export function confirmAction(message) {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}