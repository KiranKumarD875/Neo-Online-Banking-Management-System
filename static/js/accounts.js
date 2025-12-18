// // Accounts JavaScript
// document.addEventListener('DOMContentLoaded', function() {
//     // Check if we are on the accounts dashboard page before attempting to load accounts
//     if (document.getElementById('accountsList')) {
//         loadAccounts();
//     }
    
//     // --- NEW: Account Creation Logic (for create_account.html) ---
//     // If the 'Create All Accounts' form exists, set up its submission handler
//     const createAllAccountsForm = document.getElementById('createAllAccountsForm');
//     if (createAllAccountsForm) {
//         createAllAccountsForm.addEventListener('submit', function(e) {
//             e.preventDefault();
//             handleAccountCreation('/api/create_all_accounts', {}); // Assuming this is the existing endpoint
//         });
//     }
    
//     // If the 'Create Single Account' button exists, set up its click handler
//     const createSingleAccountBtn = document.getElementById('createSingleAccountBtn');
//     if (createSingleAccountBtn) {
//         createSingleAccountBtn.addEventListener('click', function() {
//             // Get the selected radio button value
//             const selectedAccountType = document.querySelector('input[name="accountType"]:checked');
            
//             if (selectedAccountType) {
//                 const accountType = selectedAccountType.value; // e.g., 'savings', 'personal', 'business'
                
//                 // Call the creation handler with the selected account type
//                 handleAccountCreation('/api/create_single_account', { account_type: accountType });
//             } else {
//                 document.getElementById('errorMessage').textContent = 'Please select an account type.';
//                 document.getElementById('errorMessage').style.display = 'block';
//             }
//         });
//     }
//     // --- END NEW: Account Creation Logic ---

//     // Setup logout button
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', function(e) {
//             e.preventDefault();
//             logout();
//         });
//     }
// });

// // --- NEW: General Account Creation Handler ---
// async function handleAccountCreation(endpoint, payload) {
//     const errorMessage = document.getElementById('errorMessage');
//     const successMessage = document.getElementById('successMessage');
    
//     errorMessage.style.display = 'none';
//     successMessage.style.display = 'none';
    
//     try {
//         const response = await fetch(endpoint, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(payload),
//             credentials: 'include'
//         });
        
//         const result = await response.json();
        
//         if (response.ok) {
//             // Success message based on action
//             let msg = result.message || 'Account(s) created successfully!';
            
//             if (payload.account_type) {
//                 msg = `${payload.account_type.charAt(0).toUpperCase() + payload.account_type.slice(1)} account created successfully!`;
//             }

//             successMessage.textContent = msg;
//             successMessage.style.display = 'block';
            
//             // Redirect to login or dashboard after a short delay
//             setTimeout(() => {
//                 window.location.href = '/'; // Or '/dashboard' if they are logged in
//             }, 3000);
//         } else {
//             errorMessage.textContent = result.error || 'Account creation failed. Please try again.';
//             errorMessage.style.display = 'block';
//         }
//     } catch (error) {
//         console.error('Account Creation Error:', error);
//         errorMessage.textContent = 'Network error during account creation.';
//         errorMessage.style.display = 'block';
//     }
// }
// // --- END NEW: General Account Creation Handler ---


// async function loadAccounts() {
//     try {
//         const response = await fetch('/api/accounts', {
//             credentials: 'include'
//         });
        
//         if (response.status === 401) {
//             window.location.href = '/';
//             return;
//         }
        
//         if (!response.ok) {
//             throw new Error('Failed to load accounts');
//         }
        
//         const data = await response.json();
//         displayAccounts(data.accounts);
        
//     } catch (error) {
//         console.error('Error loading accounts:', error);
//         document.getElementById('accountsList').innerHTML = '<p>Error loading accounts. Please try again.</p>';
//     }
// }

// function displayAccounts(accounts) {
//     const accountsList = document.getElementById('accountsList');
    
//     if (!accounts || accounts.length === 0) {
//         accountsList.innerHTML = '<p>No accounts found.</p>';
//         return;
//     }
    
//     accountsList.innerHTML = '';
    
//     accounts.forEach(account => {
//         const accountCard = document.createElement('div');
//         accountCard.className = 'account-detail-card';
        
//         accountCard.innerHTML = `
//             <div class="account-header">
//                 <div class="account-info">
//                     <h3>${account.AccountType} Account</h3>
//                     <div class="account-number">Account Number: ${account.AccountNumber}</div>
//                 </div>
//                 <div class="account-balance-large">${formatCurrency(account.Balance)}</div>
//             </div>
//             <div class="account-details">
//                 <div class="detail-row">
//                     <span>Status:</span>
//                     <span class="status-${account.Status.toLowerCase()}">${account.Status}</span>
//                 </div>
//                 <div class="detail-row">
//                     <span>Opened:</span>
//                     <span>${formatDate(account.CreatedAt)}</span>
//                 </div>
//             </div>
//             <div class="account-actions">
//                 <button class="btn-primary" onclick="viewTransactions(${account.AccountID})">
//                     View Transactions
//                 </button>
//                 <button class="btn-secondary" onclick="showDepositModal(${account.AccountID}, '${account.AccountType}')">
//                     Add Money
//                 </button>
//             </div>
//         `;
        
//         accountsList.appendChild(accountCard);
//     });
// }

// function viewTransactions(accountId) {
//     // Redirect to transactions page with account filter
//     window.location.href = `/transactions?account=${accountId}`;
// }

// // Show deposit modal
// function showDepositModal(accountId, accountType) {
//     // ... (rest of the showDepositModal function remains the same)
//     // Create modal overlay
//     const modalOverlay = document.createElement('div');
//     modalOverlay.className = 'modal-overlay';
//     modalOverlay.style.cssText = `
//         position: fixed;
//         top: 0;
//         left: 0;
//         width: 100%;
//         height: 100%;
//         background: rgba(0, 0, 0, 0.5);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         z-index: 1000;
//     `;
    
//     // Create modal content
//     const modalContent = document.createElement('div');
//     modalContent.style.cssText = `
//         background: white;
//         padding: 30px;
//         border-radius: 15px;
//         box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
//         max-width: 500px;
//         width: 90%;
//         max-height: 90vh;
//         overflow-y: auto;
//     `;
    
//     modalContent.innerHTML = `
//         <h3>Add Money to ${accountType} Account</h3>
//         <form id="depositForm" class="deposit-form">
//             <div id="depositErrorMessage" class="error-message" style="display: none;"></div>
//             <div id="depositSuccessMessage" class="success-message" style="display: none;"></div>
            
//             <div class="form-group">
//                 <label for="depositAmount">Amount to Deposit (₹)</label>
//                 <input type="number" id="depositAmount" name="amount" min="1" step="0.01" required>
//             </div>
            
//             <div class="form-group">
//                 <label for="depositMode">Payment Mode</label>
//                 <select id="depositMode" name="mode" required>
//                     <option value="">Select Payment Mode</option>
//                     <option value="UPI">UPI</option>
//                     <option value="NetBanking">Net Banking</option>
//                     <option value="Card">Debit/Credit Card</option>
//                     <option value="Cash">Cash Deposit</option>
//                 </select>
//             </div>
            
//             <div class="form-group">
//                 <button type="submit" class="btn-primary">Deposit Money</button>
//                 <button type="button" class="btn-secondary" onclick="closeDepositModal()">Cancel</button>
//             </div>
//         </form>
//     `;
    
//     modalOverlay.appendChild(modalContent);
//     document.body.appendChild(modalOverlay);
    
//     // Store modal reference for closing
//     window.currentModal = modalOverlay;
    
//     // Handle deposit form submission
//     const depositForm = document.getElementById('depositForm');
//     depositForm.addEventListener('submit', function(e) {
//         e.preventDefault();
//         handleDeposit(accountId);
//     });
    
//     // Close modal when clicking outside
//     modalOverlay.addEventListener('click', function(e) {
//         if (e.target === modalOverlay) {
//             closeDepositModal();
//         }
//     });
// }

// // Close deposit modal
// function closeDepositModal() {
//     if (window.currentModal) {
//         document.body.removeChild(window.currentModal);
//         window.currentModal = null;
//     }
// }

// // Handle deposit
// async function handleDeposit(accountId) {
//     const amount = document.getElementById('depositAmount').value;
//     const mode = document.getElementById('depositMode').value;
//     const errorMessage = document.getElementById('depositErrorMessage');
//     const successMessage = document.getElementById('depositSuccessMessage');
    
//     // Clear previous messages
//     errorMessage.style.display = 'none';
//     successMessage.style.display = 'none';
    
//     if (!amount || !mode) {
//         errorMessage.textContent = 'Please fill all fields';
//         errorMessage.style.display = 'block';
//         return;
//     }
    
//     if (parseFloat(amount) <= 0) {
//         errorMessage.textContent = 'Amount must be positive';
//         errorMessage.style.display = 'block';
//         return;
//     }
    
//     try {
//         const response = await fetch('/api/deposit', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 accountId: accountId,
//                 amount: amount,
//                 mode: mode
//             }),
//             credentials: 'include'
//         });
        
//         const result = await response.json();
        
//         if (response.ok) {
//             successMessage.textContent = `Deposit successful! New balance: ${formatCurrency(result.new_balance)}`;
//             successMessage.style.display = 'block';
            
//             // Refresh accounts list
//             setTimeout(() => {
//                 // Only load accounts if we are on the dashboard (where accountsList exists)
//                 if (document.getElementById('accountsList')) {
//                     loadAccounts();
//                 }
//                 closeDepositModal();
//             }, 2000);
//         } else {
//             errorMessage.textContent = result.error;
//             errorMessage.style.display = 'block';
//         }
//     } catch (error) {
//         errorMessage.textContent = 'Network error. Please try again.';
//         errorMessage.style.display = 'block';
//     }
// }

// function formatCurrency(amount) {
//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: 'INR'
//     }).format(amount);
// }

// function formatDate(dateString) {
//     return new Date(dateString).toLocaleDateString('en-IN', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric'
//     });
// }

// function logout() {
//     fetch('/api/logout', {
//         method: 'POST',
//         credentials: 'include'
//     }).then(() => {
//         window.location.href = '/';
//     });
// }



// Accounts JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if we are on the accounts dashboard page before attempting to load accounts
    if (document.getElementById('accountsList')) {
        loadAccounts();
    }
    
    // --- MODIFIED: Account Creation Logic (for create_account.html) ---
    
    const createSelectedAccountsBtn = document.getElementById('createSelectedAccountsBtn');
    const createAllAccountsShortcutBtn = document.getElementById('createAllAccountsShortcutBtn');

    if (createSelectedAccountsBtn) {
        // A. Handle creation of whatever accounts are checked (one, two, or three)
        createSelectedAccountsBtn.addEventListener('click', function() {
            handleSelectedAccountCreation();
        });
    }

    if (createAllAccountsShortcutBtn) {
        // B. Handle the shortcut to create all 3 accounts
        createAllAccountsShortcutBtn.addEventListener('click', function() {
            // Check all boxes first
            document.querySelectorAll('.account-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            // Then call the same handler
            handleSelectedAccountCreation();
        });
    }
    // --- END MODIFIED: Account Creation Logic ---

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});


// --- NEW UNIFIED: Account Creation Handler ---
async function handleSelectedAccountCreation() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Collect all selected account types
    const selectedAccounts = Array.from(document.querySelectorAll('input[name="accountType"]:checked'))
                               .map(checkbox => checkbox.value); // e.g., ['savings', 'personal']
    
    if (selectedAccounts.length === 0) {
        errorMessage.textContent = 'Please select at least one account to create.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        // Send the list of selected account types to the single, flexible server endpoint
        const response = await fetch('/api/create_selected_accounts', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ account_types: selectedAccounts }), // Send the list of selected types
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            let msg = result.message || 'Account(s) created successfully!';
            
            successMessage.textContent = msg;
            successMessage.style.display = 'block';
            
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = '/'; // Redirects to the Flask root route for login
            }, 3000);
        } else {
            errorMessage.textContent = result.error || 'Account creation failed. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Account Creation Error:', error);
        errorMessage.textContent = 'Network error during account creation.';
        errorMessage.style.display = 'block';
    }
}
// --- END NEW UNIFIED: Account Creation Handler ---

// Existing functions (loadAccounts, displayAccounts, viewTransactions, showDepositModal, 
// closeDepositModal, handleDeposit, formatCurrency, formatDate, logout) follow here.
// You should ensure these functions are included below this point.

async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load accounts');
        }
        
        const data = await response.json();
        displayAccounts(data.accounts);
        
    } catch (error) {
        console.error('Error loading accounts:', error);
        document.getElementById('accountsList').innerHTML = '<p>Error loading accounts. Please try again.</p>';
    }
}

function displayAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    
    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = '<p>No accounts found.</p>';
        return;
    }
    
    accountsList.innerHTML = '';
    
    accounts.forEach(account => {
        const accountCard = document.createElement('div');
        accountCard.className = 'account-detail-card';
        
        accountCard.innerHTML = `
            <div class="account-header">
                <div class="account-info">
                    <h3>${account.AccountType} Account</h3>
                    <div class="account-number">Account Number: ${account.AccountNumber}</div>
                </div>
                <div class="account-balance-large">${formatCurrency(account.Balance)}</div>
            </div>
            <div class="account-details">
                <div class="detail-row">
                    <span>Status:</span>
                    <span class="status-${account.Status.toLowerCase()}">${account.Status}</span>
                </div>
                <div class="detail-row">
                    <span>Opened:</span>
                    <span>${formatDate(account.CreatedAt)}</span>
                </div>
            </div>
            <div class="account-actions">
                <button class="btn-primary" onclick="viewTransactions(${account.AccountID})">
                    View Transactions
                </button>
                <button class="btn-secondary" onclick="showDepositModal(${account.AccountID}, '${account.AccountType}')">
                    Add Money
                </button>
            </div>
        `;
        
        accountsList.appendChild(accountCard);
    });
}

function viewTransactions(accountId) {
    // Redirect to transactions page with account filter
    window.location.href = `/transactions?account=${accountId}`;
}

// Show deposit modal
function showDepositModal(accountId, accountType) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
        <h3>Add Money to ${accountType} Account</h3>
        <form id="depositForm" class="deposit-form">
            <div id="depositErrorMessage" class="error-message" style="display: none;"></div>
            <div id="depositSuccessMessage" class="success-message" style="display: none;"></div>
            
            <div class="form-group">
                <label for="depositAmount">Amount to Deposit (₹)</label>
                <input type="number" id="depositAmount" name="amount" min="1" step="0.01" required>
            </div>
            
            <div class="form-group">
                <label for="depositMode">Payment Mode</label>
                <select id="depositMode" name="mode" required>
                    <option value="">Select Payment Mode</option>
                    <option value="UPI">UPI</option>
                    <option value="NetBanking">Net Banking</option>
                    <option value="Card">Debit/Credit Card</option>
                    <option value="Cash">Cash Deposit</option>
                </select>
            </div>
            
            <div class="form-group">
                <button type="submit" class="btn-primary">Deposit Money</button>
                <button type="button" class="btn-secondary" onclick="closeDepositModal()">Cancel</button>
            </div>
        </form>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Store modal reference for closing
    window.currentModal = modalOverlay;
    
    // Handle deposit form submission
    const depositForm = document.getElementById('depositForm');
    depositForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleDeposit(accountId);
    });
    
    // Close modal when clicking outside
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeDepositModal();
        }
    });
}

// Close deposit modal
function closeDepositModal() {
    if (window.currentModal) {
        document.body.removeChild(window.currentModal);
        window.currentModal = null;
    }
}

// Handle deposit
async function handleDeposit(accountId) {
    const amount = document.getElementById('depositAmount').value;
    const mode = document.getElementById('depositMode').value;
    const errorMessage = document.getElementById('depositErrorMessage');
    const successMessage = document.getElementById('depositSuccessMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    if (!amount || !mode) {
        errorMessage.textContent = 'Please fill all fields';
        errorMessage.style.display = 'block';
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        errorMessage.textContent = 'Amount must be positive';
        errorMessage.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accountId: accountId,
                amount: amount,
                mode: mode
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            successMessage.textContent = `Deposit successful! New balance: ${formatCurrency(result.new_balance)}`;
            successMessage.style.display = 'block';
            
            // Refresh accounts list
            setTimeout(() => {
                // Only load accounts if we are on the dashboard (where accountsList exists)
                if (document.getElementById('accountsList')) {
                    loadAccounts();
                }
                closeDepositModal();
            }, 2000);
        } else {
            errorMessage.textContent = result.error;
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Network error. Please try again.';
        errorMessage.style.display = 'block';
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
        month: 'long',
        day: 'numeric'
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