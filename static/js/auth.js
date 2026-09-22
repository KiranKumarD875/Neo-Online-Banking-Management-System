// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Login successful
                    window.location.href = '/dashboard';
                } else {
                    // Show error
                    errorMessage.textContent = data.error;
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData);
            
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            
            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Validate password confirmation
            if (data.password !== data.confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Validate password strength
            if (data.password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters long';
                errorMessage.style.display = 'block';
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Registration successful - redirect to account creation
                    successMessage.textContent = result.message;
                    successMessage.style.display = 'block';
                    
                    // Store customer ID for account creation
                    sessionStorage.setItem('customer_id', result.customer_id);
                    
                    // Redirect to account creation page after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/create-account';
                    }, 2000);
                } else {
                    // Show error
                    errorMessage.textContent = result.error;
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Account creation form handler
    const createAccountForm = document.getElementById('createAccountForm');
    if (createAccountForm) {
        createAccountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const customerId = sessionStorage.getItem('customer_id');
            if (!customerId) {
                window.location.href = '/register';
                return;
            }
            
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            
            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            try {
                const response = await fetch('/api/create-accounts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        customer_id: customerId,
                        account_types: ['Savings', 'Personal', 'Business']
                    }),
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    successMessage.textContent = result.message;
                    successMessage.style.display = 'block';
                    
                    // Clear session storage
                    sessionStorage.removeItem('customer_id');
                    
                    // Show created accounts
                    displayCreatedAccounts(result.accounts);
                    
                    // Redirect to login after 5 seconds
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 5000);
                } else {
                    errorMessage.textContent = result.error;
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Input validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Only allow digits
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Date validation (must be 18+ years old)
    const dobInput = document.getElementById('dob');
    if (dobInput) {
        const today = new Date();
        const minAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        dobInput.max = minAge.toISOString().split('T')[0];
    }
});

// Display created accounts
function displayCreatedAccounts(accounts) {
    const accountsDisplay = document.getElementById('createdAccounts');
    if (accountsDisplay && accounts.length > 0) {
        accountsDisplay.innerHTML = '<h3>Your Accounts Have Been Created:</h3>';
        
        accounts.forEach(account => {
            const accountDiv = document.createElement('div');
            accountDiv.className = 'created-account-item';
            accountDiv.innerHTML = `
                <div class="account-type-name">${account.account_type} Account</div>
                <div class="account-number">Account Number: ${account.account_number}</div>
                <div class="account-balance">Initial Balance: ₹${account.balance.toFixed(2)}</div>
            `;
            accountsDisplay.appendChild(accountDiv);
        });
        
        accountsDisplay.style.display = 'block';
    }
}

// Common logout function
function logout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        window.location.href = '/';
    });
}

// Handle logout buttons
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Utility functions
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

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'success-message';
        element.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}