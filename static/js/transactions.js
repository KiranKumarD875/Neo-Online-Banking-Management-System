// Transactions JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadAccounts();
    loadAllTransactions();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Setup transfer form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);

        // --- NEW: Dynamic Destination Field Logic Setup ---
        const toAccountSelect = document.getElementById('toAccount');
        const beneficiarySelect = document.getElementById('beneficiaryId');
        const beneficiaryGroup = document.getElementById('beneficiaryGroup');

        if (toAccountSelect && beneficiarySelect && beneficiaryGroup) {
            toAccountSelect.addEventListener('change', handleToAccountChange);
            
            // Ensure initial state is correctly applied
            beneficiarySelect.required = false; 
            beneficiaryGroup.style.display = 'none';
        }
        // --- END NEW LOGIC SETUP ---
    }
    
    // Setup account filter
    const accountFilter = document.getElementById('accountFilter');
    if (accountFilter) {
        accountFilter.addEventListener('change', function() {
            const selectedAccountId = this.value;
            if (selectedAccountId) {
                loadAccountTransactions(selectedAccountId);
            } else {
                loadAllTransactions();
            }
        });
    }
});

// --- NEW FUNCTION: Handles visibility and loading based on 'To Account' selection ---
function handleToAccountChange(e) {
    const selectedValue = e.target.value;
    const beneficiaryGroup = document.getElementById('beneficiaryGroup');
    const beneficiarySelect = document.getElementById('beneficiaryId');
    const toAccountSelect = document.getElementById('toAccount');

    if (selectedValue === 'external') {
        // Show beneficiary selection
        beneficiaryGroup.style.display = 'block';
        
        // Disable internal account submission, enable beneficiary submission
        toAccountSelect.required = false; 
        beneficiarySelect.required = true;

        // Load saved beneficiaries
        loadBeneficiaryOptions();

    } else {
        // Hide beneficiary selection
        beneficiaryGroup.style.display = 'none';
        
        // Enable internal account submission, disable beneficiary submission
        toAccountSelect.required = true;
        beneficiarySelect.required = false;
    }
}

// --- NEW FUNCTION: Fetches and populates the Beneficiary dropdown ---
async function loadBeneficiaryOptions() {
    const beneficiarySelect = document.getElementById('beneficiaryId');
    beneficiarySelect.innerHTML = '<option value="">-- Loading Beneficiaries... --</option>';

    try {
        const response = await fetch('/api/beneficiaries', { credentials: 'include' });
        const data = await response.json();

        if (response.ok && data.beneficiaries.length > 0) {
            let options = '<option value="">-- Select Saved Beneficiary --</option>';
            data.beneficiaries.forEach(b => {
                // Use Account Number (last 4 digits) or UPI ID as identifier
                const identifier = b.AccountNumber ? `A/C: ${b.AccountNumber.slice(-4)}` : `UPI: ${b.UPI_ID}`;
                options += `<option value="${b.BeneficiaryID}">
                                ${b.BeneficiaryName} (${identifier})
                            </option>`;
            });
            beneficiarySelect.innerHTML = options;
        } else {
            beneficiarySelect.innerHTML = '<option value="">No active beneficiaries found. Add one first!</option>';
        }
    } catch (error) {
        console.error("Error loading beneficiaries:", error);
        beneficiarySelect.innerHTML = '<option value="">Error loading list</option>';
    }
}
// --- END NEW FUNCTIONS ---

async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        populateAccountSelectors(data.accounts);
        
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function populateAccountSelectors(accounts) {
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const accountFilterSelect = document.getElementById('accountFilter');
    
    // Preserve the 'External Transfer' option
    const externalOption = '<option value="external">External Transfer (To Beneficiary)</option>';

    // Clear existing options (except default)
    fromAccountSelect.innerHTML = '<option value="">Select Account</option>';
    toAccountSelect.innerHTML = '<option value="">Select Destination</option>' + externalOption;
    accountFilterSelect.innerHTML = '<option value="">All Accounts</option>';
    
    accounts.forEach(account => {
        // Only show active accounts for transfers
        if (account.Status === 'Active') {
            const option1 = document.createElement('option');
            option1.value = account.AccountID;
            option1.textContent = `${account.AccountType} - ${formatCurrency(account.Balance)}`;
            fromAccountSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = account.AccountID;
            option2.textContent = `${account.AccountType} Account`;
            toAccountSelect.appendChild(option2);
        }
        
        // All accounts for filter
        const option3 = document.createElement('option');
        option3.value = account.AccountID;
        option3.textContent = `${account.AccountType} Account`;
        accountFilterSelect.appendChild(option3);
    });
}

async function handleTransfer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transferData = Object.fromEntries(formData);
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    let payload = {};

    // Validation
    if (!transferData.fromAccount) {
        showMessage('errorMessage', 'Please select a source account', true);
        return;
    }
    
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
        showMessage('errorMessage', 'Please enter a valid positive amount', true);
        return;
    }

    if (transferData.toAccount === 'external') {
        // External Transfer (to Beneficiary)
        if (!transferData.beneficiaryId) {
            showMessage('errorMessage', 'Please select a beneficiary for external transfer.', true);
            return;
        }

        payload = {
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount, // 'external'
            beneficiaryId: transferData.beneficiaryId, // Send the ID
            amount: transferData.amount,
            mode: transferData.mode
        };
        var transferType = 'External Transfer to Beneficiary';

    } else {

    // if (!transferData.amount || transferData.amount <= 0) {
    //     showMessage('errorMessage', 'Please enter a valid amount', true);
    //     return;
    // }
    
        if (transferData.fromAccount === transferData.toAccount) {
            showMessage('errorMessage', 'Cannot transfer to the same account', true);
            return;
        }
        
        // Internal Transfer (between own accounts)
        payload = {
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount,
            amount: transferData.amount,
            mode: transferData.mode
        };
        var transferType = 'Internal Transfer';
    }

    // // Show transfer type in success message
    // const isInternalTransfer = transferData.toAccount !== 'external';
    // const transferType = isInternalTransfer ? 'Internal Transfer' : 'External Transfer';
    
    try {
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transferData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('successMessage', `${transferType} successful! Reference: ${result.reference_number}`, false);
            e.target.reset();
            loadAccounts(); // Refresh account balances
            loadAllTransactions(); // Refresh transactions
        } else {
            showMessage('errorMessage', result.error, true);
        }
    } catch (error) {
        showMessage('errorMessage', 'Network error. Please try again.', true);
    }
}

async function loadAllTransactions() {
    try {
        const response = await fetch('/api/accounts', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        
        // Get all transactions from all accounts
        let allTransactions = [];
        for (const account of data.accounts) {
            const transResponse = await fetch(`/api/accounts/${account.AccountID}/transactions?limit=50`, {
                credentials: 'include'
            });
            const transData = await transResponse.json();
            
            // Add account type to each transaction
            const transactionsWithAccount = transData.transactions.map(t => ({
                ...t,
                AccountType: account.AccountType
            }));
            
            allTransactions = allTransactions.concat(transactionsWithAccount);
        }
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(b.TransactionDate) - new Date(a.TransactionDate));
        
        displayTransactions(allTransactions);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsList').innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading transactions</td></tr>';
    }
}

async function loadAccountTransactions(accountId) {
    try {
        const response = await fetch(`/api/accounts/${accountId}/transactions?limit=50`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load transactions');
        }
        
        const data = await response.json();
        displayTransactions(data.transactions);
        
    } catch (error) {
        console.error('Error loading account transactions:', error);
        document.getElementById('transactionsList').innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading transactions</td></tr>';
    }
}

function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="6" style="text-align: center;">No transactions found</td></tr>';
        return;
    }
    
    transactionsList.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.TransactionDate)}</td>
            <td><span class="transaction-type ${transaction.TransactionType.toLowerCase()}">${transaction.TransactionType}</span></td>
            <td>${formatCurrency(transaction.Amount)}</td>
            <td>${transaction.Mode}</td>
            <td><span class="status-${transaction.Status.toLowerCase()}">${transaction.Status}</span></td>
            <td>${transaction.AccountType || 'N/A'}</td>
        `;
        
        transactionsList.appendChild(row);
    });
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
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