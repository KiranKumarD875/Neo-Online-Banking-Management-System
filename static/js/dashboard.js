// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        // Update user name
        const userNameElement = document.getElementById('userName');
        if (userNameElement && data.customer) {
            userNameElement.textContent = `Welcome, ${data.customer.FirstName} ${data.customer.LastName}!`;
        }
        
        // Update statistics
        document.getElementById('totalBalance').textContent = formatCurrency(data.total_balance);
        document.getElementById('accountCount').textContent = data.accounts.length;
        document.getElementById('loanCount').textContent = data.loan_count;
        document.getElementById('beneficiaryCount').textContent = data.beneficiary_count;
        
        // Load accounts
        loadAccounts(data.accounts);
        
        // Load recent transactions
        loadRecentTransactions(data.recent_transactions);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function loadAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    
    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = '<p>No accounts found.</p>';
        return;
    }
    
    accountsList.innerHTML = '';
    
    accounts.forEach(account => {
        const accountCard = document.createElement('div');
        accountCard.className = 'account-card';
        accountCard.innerHTML = `
            <div class="account-type">${account.AccountType} Account</div>
            <div class="account-number">A/C: ${account.AccountNumber}</div>
            <div class="account-balance">${formatCurrency(account.Balance)}</div>
            <div class="account-status">Status: ${account.Status}</div>
        `;
        
        accountsList.appendChild(accountCard);
    });
}

function loadRecentTransactions(transactions) {
    const recentTransactionsBody = document.getElementById('recentTransactions');
    
    if (!transactions || transactions.length === 0) {
        recentTransactionsBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent transactions</td></tr>';
        return;
    }
    
    recentTransactionsBody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.TransactionDate)}</td>
            <td><span class="transaction-type ${transaction.TransactionType.toLowerCase()}">${transaction.TransactionType}</span></td>
            <td>${formatCurrency(transaction.Amount)}</td>
            <td>${transaction.Mode}</td>
            <td><span class="status-${transaction.Status.toLowerCase()}">${transaction.Status}</span></td>
        `;
        
        recentTransactionsBody.appendChild(row);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function logout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        window.location.href = '/';
    });
}