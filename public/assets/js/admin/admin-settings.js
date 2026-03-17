// public/assets/js/admin/admin-settings.js
import { 
    auth, 
    db,
    rtdb,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    setDoc,
    ref,
    set
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
        loadSettings();
    }
});

// Load settings
async function loadSettings() {
    try {
        const settingsRef = collection(db, 'settings');
        const snapshot = await getDocs(settingsRef);
        
        const settings = {};
        snapshot.forEach(doc => {
            settings[doc.id] = doc.data().value;
        });
        
        // Populate form fields
        document.querySelectorAll('[data-setting]').forEach(el => {
            const key = el.dataset.setting;
            if (settings[key] !== undefined) {
                if (el.type === 'checkbox') {
                    el.checked = settings[key];
                } else {
                    el.value = settings[key];
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save all settings
window.saveSettings = async function() {
    try {
        const settings = {};
        
        document.querySelectorAll('[data-setting]').forEach(el => {
            const key = el.dataset.setting;
            if (el.type === 'checkbox') {
                settings[key] = el.checked;
            } else {
                settings[key] = el.value;
            }
        });
        
        // Save each setting to Firestore
        for (const [key, value] of Object.entries(settings)) {
            await setDoc(doc(db, 'settings', key), { value });
        }
        
        showNotification('All settings saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    }
};

// Toggle payment method
window.togglePayment = function(element) {
    element.classList.toggle('active');
};

// Edit payment methods
window.editPaymentMethods = function() {
    // You can implement a modal for editing payment details
    alert('Edit payment details modal would open here');
};

// Save specific section
window.saveSection = async function(section) {
    const settings = {};
    
    document.querySelectorAll(`[data-section="${section}"]`).forEach(el => {
        const key = el.dataset.setting;
        settings[key] = el.value;
    });
    
    try {
        for (const [key, value] of Object.entries(settings)) {
            await setDoc(doc(db, 'settings', key), { value });
        }
        
        showNotification(`${section} settings saved!`, 'success');
        
    } catch (error) {
        console.error(`Error saving ${section} settings:`, error);
        showNotification('Failed to save settings', 'error');
    }
};

// Reset to defaults
window.resetToDefaults = async function() {
    if (!confirm('Reset all settings to default values?')) return;
    
    const defaults = {
        siteName: 'BlackRock',
        siteUrl: 'https://blackrock.com',
        supportEmail: 'support@blackrock.com',
        supportPhone: '+260 97 123 4567',
        minDeposit: '50',
        minWithdrawal: '50',
        referralBonus: '5',
        welcomeBonus: '100',
        withdrawalFee: '0',
        currency: 'ZMW',
        tiktokReward: '2',
        facebookReward: '3',
        youtubeReward: '4',
        instagramReward: '2'
    };
    
    try {
        for (const [key, value] of Object.entries(defaults)) {
            await setDoc(doc(db, 'settings', key), { value });
        }
        
        showNotification('Settings reset to defaults!', 'success');
        loadSettings();
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        showNotification('Failed to reset settings', 'error');
    }
};

// Export settings
window.exportSettings = function() {
    const settings = {};
    
    document.querySelectorAll('[data-setting]').forEach(el => {
        const key = el.dataset.setting;
        settings[key] = el.value;
    });
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `blackrock-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

// Import settings
window.importSettings = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                
                for (const [key, value] of Object.entries(settings)) {
                    const el = document.querySelector(`[data-setting="${key}"]`);
                    if (el) {
                        el.value = value;
                    }
                }
                
                showNotification('Settings imported! Click Save to apply.', 'success');
                
            } catch (error) {
                console.error('Error importing settings:', error);
                showNotification('Invalid settings file', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
};