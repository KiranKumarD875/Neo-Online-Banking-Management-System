// Loans JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadLoans();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Setup loan form
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', handleLoanApplication);
    }
    
    // Setup EMI calculator
    const loanTypeSelect = document.getElementById('loanType');
    const loanAmountInput = document.getElementById('loanAmount');
    const tenureInput = document.getElementById('tenureMonths');
    
    if (loanTypeSelect && loanAmountInput && tenureInput) {
        [loanTypeSelect, loanAmountInput, tenureInput].forEach(input => {
            input.addEventListener('input', calculateEMI);
        });
    }
});

const interestRates = {
    'Home': 8.5,
    'Car': 9.5,
    'Education': 7.5,
    'Personal': 12.0
};

function calculateEMI() {
    const loanType = document.getElementById('loanType').value;
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const tenureMonths = parseInt(document.getElementById('tenureMonths').value) || 0;
    
    if (!loanType || !loanAmount || !tenureMonths) {
        updateEMIDisplay(0, 0, 0);
        return;
    }
    
    const interestRate = interestRates[loanType];
    const monthlyRate = interestRate / (12 * 100);
    
    let emi = 0;
    if (monthlyRate === 0) {
        emi = loanAmount / tenureMonths;
    } else {
        emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    }
    
    const totalAmount = emi * tenureMonths;
    const totalInterest = totalAmount - loanAmount;
    
    updateEMIDisplay(emi, totalInterest, totalAmount);
}

function updateEMIDisplay(emi, totalInterest, totalAmount) {
    document.getElementById('emiAmount').textContent = formatCurrency(emi);
    document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
}

async function loadLoans() {
    try {
        const response = await fetch('/api/loans', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load loans');
        }
        
        const data = await response.json();
        displayLoans(data.loans);
        
    } catch (error) {
        console.error('Error loading loans:', error);
        document.getElementById('loansList').innerHTML = '<p>Error loading loans. Please try again.</p>';
    }
}

function displayLoans(loans) {
    const loansList = document.getElementById('loansList');
    
    if (!loans || loans.length === 0) {
        loansList.innerHTML = '<p>No loans found. Apply for a loan above!</p>';
        return;
    }
    
    loansList.innerHTML = '';
    
    loans.forEach(loan => {
        const loanCard = document.createElement('div');
        loanCard.className = 'loan-card';
        
        // Calculate EMI for display
        const interestRate = loan.InterestRate;
        const monthlyRate = interestRate / (12 * 100);
        const tenureMonths = Math.round((new Date(loan.EndDate) - new Date(loan.StartDate)) / (1000 * 60 * 60 * 24 * 30));
        
        let emi = 0;
        if (monthlyRate === 0) {
            emi = loan.LoanAmount / tenureMonths;
        } else {
            emi = (loan.LoanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                  (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        }
        
        loanCard.innerHTML = `
            <div class="loan-header">
                <div class="loan-type">${loan.LoanType} Loan</div>
                <div class="loan-amount">${formatCurrency(loan.LoanAmount)}</div>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <div class="loan-detail-label">Interest Rate</div>
                    <div class="loan-detail-value">${loan.InterestRate}%</div>
                </div>
                <div class="loan-detail">
                    <div class="loan-detail-label">Monthly EMI</div>
                    <div class="loan-detail-value">${formatCurrency(emi)}</div>
                </div>
                <div class="loan-detail">
                    <div class="loan-detail-label">Start Date</div>
                    <div class="loan-detail-value">${formatDate(loan.StartDate)}</div>
                </div>
                <div class="loan-detail">
                    <div class="loan-detail-label">End Date</div>
                    <div class="loan-detail-value">${formatDate(loan.EndDate)}</div>
                </div>
                <div class="loan-detail">
                    <div class="loan-detail-label">Status</div>
                    <div class="loan-detail-value">
                        <span class="status-${loan.Status.toLowerCase()}">${loan.Status}</span>
                    </div>
                </div>
            </div>
        `;
        
        loansList.appendChild(loanCard);
    });
}

async function handleLoanApplication(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loanData = Object.fromEntries(formData);
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Validation
    if (!loanData.loanType) {
        showMessage('errorMessage', 'Please select a loan type', true);
        return;
    }
    
    if (!loanData.loanAmount || parseFloat(loanData.loanAmount) < 10000) {
        showMessage('errorMessage', 'Loan amount must be at least ₹10,000', true);
        return;
    }
    
    if (!loanData.tenureMonths || parseInt(loanData.tenureMonths) < 6) {
        showMessage('errorMessage', 'Tenure must be at least 6 months', true);
        return;
    }
    
    try {
        const response = await fetch('/api/loans/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loanData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('successMessage', 
                `Loan application submitted successfully! Monthly EMI: ${formatCurrency(result.monthly_emi)}`, false);
            e.target.reset();
            updateEMIDisplay(0, 0, 0);
            loadLoans(); // Refresh loans list
        } else {
            showMessage('errorMessage', result.error, true);
        }
    } catch (error) {
        showMessage('errorMessage', 'Network error. Please try again.', true);
    }
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Auto-hide after 7 seconds for success messages
        if (!isError) {
            setTimeout(() => {
                element.style.display = 'none';
            }, 7000);
        }
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