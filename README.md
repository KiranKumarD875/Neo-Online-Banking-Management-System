# Online Banking Management System

A comprehensive banking web application built with Flask backend and HTML/CSS/JS frontend, using MySQL database.

## Prerequisites

Before running the application, make sure you have:

1. **Python 3.7+** installed
2. **MySQL Server** installed and running
3. **pip** (Python package installer)

## Setup Instructions

### Step 1: Database Setup

1. **Start MySQL Server**
   - On Windows: Start MySQL from Services or MySQL Workbench
   - On Mac: `brew services start mysql`
   - On Linux: `sudo systemctl start mysql`

2. **Create Database and Tables**
   - Open MySQL command line or MySQL Workbench
   - Copy and paste your entire database script (the one you provided) to create:
     - Database: `OnlineBanking`
     - All tables: Customers, Logins, Accounts, Transactions, Loans, Beneficiaries, Services
     - Sample data for 5 users

3. **Update Database Configuration**
   - Open `app.py`
   - Find the `DB_CONFIG` section (around line 15)
   - Update the MySQL password:
   ```python
   DB_CONFIG = {
       'host': 'localhost',
       'database': 'OnlineBanking',
       'user': 'root',
       'password': 'YOUR_MYSQL_PASSWORD'  # Enter your MySQL root password here
   }
   ```

### Step 2: Install Python Dependencies

1. **Open Terminal/Command Prompt** in the project directory

2. **Install Required Packages**
   ```bash
   pip install -r requirements.txt
   ```
   
   This will install:
   - Flask (web framework)
   - Flask-CORS (cross-origin requests)
   - mysql-connector-python (MySQL database connection)
   - bcrypt (password hashing)

### Step 3: Run the Application

1. **Start the Flask Server**
   ```bash
   python app.py
   ```

2. **Access the Application**
   - Open your web browser
   - Go to: `http://localhost:5000`
   - You should see the SecureBank login page

## Using the Application

### Login with Sample Data

You can login with any of the 5 sample users. The passwords are currently set as placeholder hashes, so you'll need to:

**Option 1: Register New User**
- Click "Register here" on login page
- Fill out the registration form
- A new account will be created with ₹1000 welcome bonus

**Option 2: Update Sample User Passwords**
- Use the registration process to create a new user, or
- Manually update password hashes in the database

### Main Features

1. **Dashboard**
   - View account balances
   - See recent transactions
   - Quick action buttons

2. **Accounts**
   - View all your accounts
   - Check balances and status
   - View account details

3. **Transactions**
   - Transfer money between accounts
   - View transaction history
   - Filter by account

4. **Loans**
   - Apply for loans (Home, Car, Education, Personal)
   - EMI calculator
   - View existing loans

5. **Beneficiaries**
   - Add beneficiaries with account/UPI details
   - Manage beneficiary list
   - Delete beneficiaries

6. **Services**
   - Activate banking services
   - Bill payments, insurance, etc.
   - View active services

## Project Structure

```
online-banking-system/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/            # HTML templates
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── accounts.html
│   ├── transactions.html
│   ├── loans.html
│   ├── beneficiaries.html
│   └── services.html
└── static/              # Static files
    ├── css/
    │   └── style.css    # Main stylesheet
    └── js/              # JavaScript files
        ├── auth.js
        ├── dashboard.js
        ├── accounts.js
        ├── transactions.js
        ├── loans.js
        ├── beneficiaries.js
        └── services.js
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if MySQL server is running
   - Verify database credentials in `app.py`
   - Ensure `OnlineBanking` database exists

2. **Module Not Found Error**
   - Run `pip install -r requirements.txt`
   - Check if you're in the correct directory

3. **Port Already in Use**
   - Change port in `app.py`: `app.run(debug=True, port=5001)`
   - Or kill the process using port 5000

4. **Login Issues**
   - Register a new user instead of using sample data
   - Check database connection
   - Verify user exists in database

### Database Reset

If you need to reset the database:
```sql
DROP DATABASE OnlineBanking;
-- Then run your original database script again
```

## Security Features

- Password hashing with bcrypt
- Session management
- SQL injection prevention
- Input validation
- CORS protection

## Development

To modify the application:
1. **Backend**: Edit `app.py` for API endpoints
2. **Frontend**: Edit HTML templates and CSS/JS files
3. **Database**: Modify queries in `app.py`

The application uses your exact database schema without any modifications.

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify database connection and credentials
3. Ensure all dependencies are installed
4. Check if the database contains the required tables and data