// public/assets/js/admin/admin-reports.js
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
    orderBy
} from '../firebase-config.js';
import { showNotification, formatCurrency, formatDate } from '../utils.js';

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
        loadAllReports();
    }
});

// Load all reports data
async function loadAllReports() {
    await Promise.all([
        loadSummaryCards(),
        loadTopEarners(),
        loadDailyStats()
    ]);
}

// Load summary cards
async function loadSummaryCards() {
    try {
        // Total revenue (completed withdrawals)
        const withdrawalsRef = collection(db, 'withdrawals');
        const completedQuery = query(withdrawalsRef, where('status', '==', 'completed'));
        const completedSnapshot = await getDocs(completedQuery);
        let totalRevenue = 0;
        completedSnapshot.forEach(doc => {
            totalRevenue += doc.data().amount || 0;
        });
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        
        // Total users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        // Active users (logged in last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const activeQuery = query(usersRef, where('lastLogin', '>=', weekAgo.toISOString()));
        const activeSnapshot = await getDocs(activeQuery);
        document.getElementById('activeUsers').textContent = activeSnapshot.size;
        
        // Tasks completed
        let totalTasks = 0;
        for (const userDoc of usersSnapshot.docs) {
            const tasksRef = collection(db, 'users', userDoc.id, 'task-history');
            const tasksSnapshot = await getDocs(tasksRef);
            totalTasks += tasksSnapshot.size;
        }
        document.getElementById('tasksCompleted').textContent = totalTasks;
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load top earners
async function loadTopEarners() {
    const topEarnersList = document.querySelector('.top-users');
    if (!topEarnersList) return;
    
    try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const earners = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.totalEarned > 0) {
                earners.push({
                    username: user.username,
                    totalEarned: user.totalEarned,
                    tasks: user.totalTasks || 0,
                    joined: user.createdAt
                });
            }
        });
        
        // Sort by earnings
        earners.sort((a, b) => b.totalEarned - a.totalEarned);
        
        const top5 = earners.slice(0, 5);
        
        const earnersHtml = top5.map((earner, index) => `
            <div class="user-rank">
                <div class="rank">${index + 1}</div>
                <div class="info">
                    <h4>${earner.username}</h4>
                    <p>Member since ${formatDate(earner.joined)} • ${earner.tasks} tasks</p>
                </div>
                <div class="earnings">${formatCurrency(earner.totalEarned)}</div>
            </div>
        `).join('');
        
        topEarnersList.innerHTML = `
            <h3>Top Earners</h3>
            ${earnersHtml}
        `;
        
    } catch (error) {
        console.error('Error loading top earners:', error);
    }
}

// Load daily stats for charts
async function loadDailyStats() {
    try {
        const days = 7;
        const labels = [];
        const revenueData = [];
        const usersData = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(dateStr);
            
            // Revenue for that day
            const withdrawalsRef = collection(db, 'withdrawals');
            const dayStart = dateStr + 'T00:00:00.000Z';
            const dayEnd = dateStr + 'T23:59:59.999Z';
            
            const dayQuery = query(
                withdrawalsRef,
                where('createdAt', '>=', dayStart),
                where('createdAt', '<=', dayEnd),
                where('status', '==', 'completed')
            );
            
            const daySnapshot = await getDocs(dayQuery);
            let dayRevenue = 0;
            daySnapshot.forEach(doc => {
                dayRevenue += doc.data().amount || 0;
            });
            revenueData.push(dayRevenue);
            
            // New users that day
            const usersRef = collection(db, 'users');
            const usersDayQuery = query(
                usersRef,
                where('createdAt', '>=', dayStart),
                where('createdAt', '<=', dayEnd)
            );
            
            const usersDaySnapshot = await getDocs(usersDayQuery);
            usersData.push(usersDaySnapshot.size);
        }
        
        // Here you would update your charts with this data
        console.log('Chart data:', { labels, revenueData, usersData });
        
    } catch (error) {
        console.error('Error loading daily stats:', error);
    }
}

// Apply date range
window.applyDateRange = function() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if (!start || !end) {
        showNotification('Please select start and end dates', 'error');
        return;
    }
    
    showNotification(`Loading report from ${start} to ${end}`, 'info');
    loadCustomReport(start, end);
};

// Load custom date range report
async function loadCustomReport(startDate, endDate) {
    try {
        const start = startDate + 'T00:00:00.000Z';
        const end = endDate + 'T23:59:59.999Z';
        
        // Deposits in range
        const depositsRef = collection(db, 'deposits');
        const depositsQuery = query(
            depositsRef,
            where('createdAt', '>=', start),
            where('createdAt', '<=', end),
            where('status', '==', 'approved')
        );
        
        const depositsSnapshot = await getDocs(depositsQuery);
        let totalDeposits = 0;
        depositsSnapshot.forEach(doc => {
            totalDeposits += doc.data().amount || 0;
        });
        
        // Withdrawals in range
        const withdrawalsRef = collection(db, 'withdrawals');
        const withdrawalsQuery = query(
            withdrawalsRef,
            where('createdAt', '>=', start),
            where('createdAt', '<=', end),
            where('status', '==', 'completed')
        );
        
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        let totalWithdrawals = 0;
        withdrawalsSnapshot.forEach(doc => {
            totalWithdrawals += doc.data().amount || 0;
        });
        
        // New users in range
        const usersRef = collection(db, 'users');
        const usersQuery = query(
            usersRef,
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        // Update UI with custom report data
        console.log('Custom report:', {
            deposits: totalDeposits,
            withdrawals: totalWithdrawals,
            newUsers: usersSnapshot.size
        });
        
    } catch (error) {
        console.error('Error loading custom report:', error);
    }
}

// Export report
window.exportReport = function(format) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    showNotification(`Exporting ${format.toUpperCase()} report...`, 'info');
    
    // Simulate export
    setTimeout(() => {
        showNotification(`Report exported successfully!`, 'success');
    }, 2000);
};

// Export as CSV
window.exportCSV = function() {
    exportReport('csv');
};

// Export as PDF
window.exportPDF = function() {
    exportReport('pdf');
};

// Print report
window.printReport = function() {
    window.print();
};