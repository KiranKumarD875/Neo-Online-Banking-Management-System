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
        transferForm.addEventListener('submit', initiateTransfer);

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

let pendingTransferData = null;
let pendingTransferPayload = null;
let pendingTransferType = null;
let countdownInterval = null;

async function initiateTransfer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transferData = Object.fromEntries(formData);
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    let payload = {};
    let transferType = '';

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
        if (!transferData.beneficiaryId) {
            showMessage('errorMessage', 'Please select a beneficiary for external transfer.', true);
            return;
        }
        payload = {
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount,
            beneficiaryId: transferData.beneficiaryId,
            amount: transferData.amount,
            mode: transferData.mode
        };
        transferType = 'External Transfer to Beneficiary';
    } else {
        if (transferData.fromAccount === transferData.toAccount) {
            showMessage('errorMessage', 'Cannot transfer to the same account', true);
            return;
        }
        payload = {
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount,
            amount: transferData.amount,
            mode: transferData.mode
        };
        transferType = 'Internal Transfer';
    }

    // Store pending data
    pendingTransferData = transferData;
    pendingTransferPayload = payload;
    pendingTransferType = transferType;

    showPaymentModal(transferData.mode, transferData.amount);
}

function showPaymentModal(mode, amount) {
    const modal = document.getElementById('paymentModal');
    const modalTitle = document.getElementById('paymentModalTitle');
    const modalBody = document.getElementById('paymentModalBody');
    const confirmBtn = document.getElementById('confirmTransferBtn');
    const cancelBtn = document.getElementById('cancelTransferBtn');
    const closeBtn = document.querySelector('.close-modal');

    // Reset UI
    if (countdownInterval) clearInterval(countdownInterval);
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm & Pay';
    
    let contentHtml = '';
    
    if (mode === 'UPI') {
        modalTitle.textContent = 'UPI Payment';
        contentHtml = `
            <div class="payment-detail" style="text-align: center;">
                <p style="margin-bottom: 15px;">Amount to pay: <strong>₹${amount}</strong></p>
                <div class="qr-code-placeholder"></div>
                <p style="margin-bottom: 10px;">Scan QR Code using any UPI App</p>
                <div class="countdown-timer" id="upiTimer">02:00</div>
                <p>OR</p>
                <div style="margin-top: 10px;">
                    <input type="text" id="upiIdInput" placeholder="Enter UPI ID (e.g., user@bank)" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;">
                </div>
            </div>
        `;
    } else {
        modalTitle.textContent = `${mode} Transfer Confirmation`;
        contentHtml = `
            <div class="payment-detail">
                <p><strong>Transfer Mode:</strong> ${mode}</p>
                <p><strong>Amount:</strong> ₹${amount}</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b;">
                    <p style="font-size: 0.9rem; color: #b45309;"><strong>Note:</strong> ${mode} transfers may take some time depending on bank processing hours. Please verify the beneficiary details before confirming.</p>
                </div>
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="termsCheckbox" required>
                        <span style="font-size: 0.9rem;">I confirm the recipient details are correct.</span>
                    </label>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = contentHtml;
    modal.style.display = 'block';

    if (mode === 'UPI') {
        startTimer(120, document.getElementById('upiTimer'));
    }

    // Clean up old event listeners by cloning button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', async function() {
        if (mode !== 'UPI') {
            const checkbox = document.getElementById('termsCheckbox');
            if (!checkbox.checked) {
                alert("Please confirm the recipient details first.");
                return;
            }
        } else {
            const upiId = document.getElementById('upiIdInput').value;
            // Optionally validate UPI ID if entered, but QR is also an option.
        }

        newConfirmBtn.disabled = true;
        newConfirmBtn.textContent = 'Processing...';
        
        await executeTransfer();
        closeModal();
    });

    const closeModal = () => {
        modal.style.display = 'none';
        if (countdownInterval) clearInterval(countdownInterval);
    };

    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target == modal) closeModal();
    };
}

function startTimer(duration, display) {
    let timer = duration, minutes, seconds;
    countdownInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(countdownInterval);
            display.textContent = "EXPIRED";
            document.getElementById('confirmTransferBtn').disabled = true;
        }
    }, 1000);
}

async function executeTransfer() {
    try {
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pendingTransferPayload),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('successMessage', `${pendingTransferType} successful! Reference: ${result.reference_number}`, false);
            document.getElementById('transferForm').reset();
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