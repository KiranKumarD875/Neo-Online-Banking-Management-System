// Services JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadServices();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Setup service form
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceActivation);
    }
    
    // Update provider placeholder based on service type
    const serviceNameSelect = document.getElementById('serviceName');
    const providerInput = document.getElementById('providerName');
    
    if (serviceNameSelect && providerInput) {
        serviceNameSelect.addEventListener('change', function() {
            const serviceName = this.value;
            updateProviderPlaceholder(serviceName, providerInput);
        });
    }
});

function updateProviderPlaceholder(serviceName, providerInput) {
    const placeholders = {
        'Mobile Recharge': 'e.g., Airtel, Jio, Vi, BSNL',
        'Electricity Bill': 'e.g., BSES, MSEB, KSEB, TNEB',
        'DTH Recharge': 'e.g., Tata Sky, Dish TV, Airtel DTH',
        'Insurance Premium': 'e.g., LIC, HDFC ERGO, ICICI Prudential',
        'Broadband': 'e.g., JioFiber, Airtel Xstream, ACT',
        'Gas Bill': 'e.g., Indane, HP Gas, Bharat Gas',
        'Water Bill': 'e.g., Delhi Jal Board, BWSSB, MCGM'
    };
    
    providerInput.placeholder = placeholders[serviceName] || 'Enter service provider name';
}

async function loadServices() {
    try {
        const response = await fetch('/api/services', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to load services');
        }
        
        const data = await response.json();
        displayServices(data.services);
        
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('servicesList').innerHTML = '<p>Error loading services. Please try again.</p>';
    }
}

function displayServices(services) {
    const servicesList = document.getElementById('servicesList');
    
    if (!services || services.length === 0) {
        servicesList.innerHTML = '<p>No services activated. Activate a service above!</p>';
        return;
    }
    
    servicesList.innerHTML = '';
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        
        serviceCard.innerHTML = `
            <div class="service-name">${service.ServiceName}</div>
            <div class="service-provider">Provider: ${service.ProviderName}</div>
            <div class="service-status ${service.Status.toLowerCase()}">${service.Status}</div>
            <div class="service-date">
                <small>Activated: ${formatDate(service.SubscribedOn)}</small>
            </div>
        `;
        
        servicesList.appendChild(serviceCard);
    });
}

async function handleServiceActivation(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serviceData = Object.fromEntries(formData);
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Validation
    if (!serviceData.serviceName) {
        showMessage('errorMessage', 'Please select a service type', true);
        return;
    }
    
    if (!serviceData.providerName) {
        showMessage('errorMessage', 'Please enter service provider name', true);
        return;
    }
    
    try {
        const response = await fetch('/api/services/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('successMessage', 'Service activated successfully!', false);
            e.target.reset();
            loadServices(); // Refresh services list
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