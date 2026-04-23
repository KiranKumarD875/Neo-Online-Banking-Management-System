// Beneficiaries JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadBeneficiaries();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Setup beneficiary form
    const beneficiaryForm = document.getElementById('beneficiaryForm');
    if (beneficiaryForm) {
        beneficiaryForm.addEventListener('submit', handleAddBeneficiary);
    }
    
    // IFSC code validation
    const ifscInput = document.getElementById('ifsc');
    if (ifscInput) {
        ifscInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
});

async function loadBeneficiaries() {
    try {
        const response = await fetch('/api/beneficiaries', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load beneficiaries');
        }
        
        const data = await response.json();
        displayBeneficiaries(data.beneficiaries);
        
    } catch (error) {
        console.error('Error loading beneficiaries:', error);
        document.getElementById('beneficiariesList').innerHTML = '<p>Error loading beneficiaries. Please try again.</p>';
    }
}

function displayBeneficiaries(beneficiaries) {
    const beneficiariesList = document.getElementById('beneficiariesList');
    
    if (!beneficiaries || beneficiaries.length === 0) {
        beneficiariesList.innerHTML = '<p>No beneficiaries found. Add a beneficiary above!</p>';
        return;
    }
    
    beneficiariesList.innerHTML = '';
    
    beneficiaries.forEach(beneficiary => {
        const beneficiaryCard = document.createElement('div');
        beneficiaryCard.className = 'beneficiary-card';
        
        let contactInfo = [];
        if (beneficiary.AccountNumber) {
            contactInfo.push(`Account: ${beneficiary.AccountNumber}`);
        }
        if (beneficiary.IFSC) {
            contactInfo.push(`IFSC: ${beneficiary.IFSC}`);
        }
        if (beneficiary.UPI_ID) {
            contactInfo.push(`UPI: ${beneficiary.UPI_ID}`);
        }
        
        beneficiaryCard.innerHTML = `
            <button class="delete-btn" onclick="deleteBeneficiary(${beneficiary.BeneficiaryID})">Delete</button>
            <div class="beneficiary-name">${beneficiary.BeneficiaryName}</div>
            <div class="beneficiary-details">
                ${contactInfo.join('<br>')}
                <br><small>Added: ${formatDate(beneficiary.AddedOn)}</small>
            </div>
        `;
        
        beneficiariesList.appendChild(beneficiaryCard);
    });
}

async function handleAddBeneficiary(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const beneficiaryData = Object.fromEntries(formData);
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Validation
    if (!beneficiaryData.beneficiaryName) {
        showMessage('errorMessage', 'Beneficiary name is required', true);
        return;
    }
    
    // At least one of account details or UPI should be provided
    const hasAccountDetails = beneficiaryData.accountNumber && beneficiaryData.ifsc;
    const hasUPI = beneficiaryData.upiId;
    
    if (!hasAccountDetails && !hasUPI) {
        showMessage('errorMessage', 'Please provide either account details (Account Number + IFSC) or UPI ID', true);
        return;
    }
    
    // IFSC validation if provided
    if (beneficiaryData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(beneficiaryData.ifsc)) {
        showMessage('errorMessage', 'Invalid IFSC code format', true);
        return;
    }
    
    // UPI ID validation if provided
    if (beneficiaryData.upiId && !/^[\w.-]+@[\w.-]+$/.test(beneficiaryData.upiId)) {
        showMessage('errorMessage', 'Invalid UPI ID format', true);
        return;
    }
    
    try {
        const response = await fetch('/api/beneficiaries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(beneficiaryData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('successMessage', 'Beneficiary added successfully!', false);
            e.target.reset();
            loadBeneficiaries(); // Refresh beneficiaries list
        } else {
            showMessage('errorMessage', result.error, true);
        }
    } catch (error) {
        showMessage('errorMessage', 'Network error. Please try again.', true);
    }
}

async function deleteBeneficiary(beneficiaryId) {
    if (!confirm('Are you sure you want to delete this beneficiary?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/beneficiaries/${beneficiaryId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success message briefly
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                successMessage.textContent = 'Beneficiary deleted successfully!';
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            }
            
            loadBeneficiaries(); // Refresh beneficiaries list
        } else {
            alert(result.error || 'Failed to delete beneficiary');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
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