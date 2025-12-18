from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime, timedelta
import secrets
import decimal
import json
import uuid
import re
from functools import wraps

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'NeoBanking2',
    'user': 'root',
    'password': 'Kiran123'  
}

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def generate_account_number():
    """Generate unique account number"""
    return str(uuid.uuid4().int)[:12]

def generate_reference_number():
    """Generate unique reference number for transactions"""
    return f"TXN{str(uuid.uuid4().int)[:10]}"

def calculate_emi(principal, rate, tenure):
    """Calculate EMI using compound interest formula"""
    monthly_rate = rate / (12 * 100)
    if monthly_rate == 0:
        return principal / tenure
    return (principal * monthly_rate * ((1 + monthly_rate) ** tenure)) / (((1 + monthly_rate) ** tenure) - 1)

def login_required(f):
    """Decorator for routes that require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'customer_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

class DecimalEncoder(json.JSONEncoder):
    """JSON encoder for decimal values"""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = DecimalEncoder

# Routes for serving HTML pages
@app.route('/')
def home():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/create-account')
def create_account_page():
    return render_template('create_account.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/accounts')
def accounts():
    return render_template('accounts.html')

@app.route('/transactions')
def transactions():
    return render_template('transactions.html')

@app.route('/loans')
def loans():
    return render_template('loans.html')

@app.route('/beneficiaries')
def beneficiaries():
    return render_template('beneficiaries.html')

@app.route('/services')
def services():
    return render_template('services.html')

# API Routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'dob', 'email', 'phone', 'street', 'city', 'state', 'username', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate phone number
        if not re.match(r'^\d{10}$', data['phone']):
            return jsonify({'error': 'Phone number must be 10 digits'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT Email FROM Customers WHERE Email = %s", (data['email'],))
        if cursor.fetchone():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Check if username already exists
        cursor.execute("SELECT Username FROM Logins WHERE Username = %s", (data['username'],))
        if cursor.fetchone():
            return jsonify({'error': 'Username already exists'}), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Insert customer
        customer_query = """
        INSERT INTO Customers (FirstName, LastName, DOB, Email, Phone, Street, City, State)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        customer_data = (data['firstName'], data['lastName'], data['dob'], data['email'], 
                        data['phone'], data['street'], data['city'], data['state'])
        cursor.execute(customer_query, customer_data)
        customer_id = cursor.lastrowid
        
        # Insert login credentials
        login_query = """
        INSERT INTO Logins (CustomerID, Username, PasswordHash)
        VALUES (%s, %s, %s)
        """
        cursor.execute(login_query, (customer_id, data['username'], password_hash.decode('utf-8')))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        # Store customer_id in a temporary session key to be used for account creation.
        session['temp_customer_id'] = customer_id
        
        return jsonify({
            'message': 'Registration successful! Please create your accounts.',
            'customer_id': customer_id, 
            'redirect': '/create-account'
        }), 201
        
    except Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

def _create_single_account_db(customer_id, account_type, connection):
    """Internal function to handle single account creation logic."""
    # Ensure only valid types are processed
    if account_type.lower() not in ['savings', 'personal', 'business']:
        return None, f"Invalid account type: {account_type}"

    account_type_title = account_type.title()
    account_number = generate_account_number()
    # Initial balance: ₹1000 for Savings, ₹0 for others
    initial_balance = 0.00 if account_type.lower() == 'savings' else 0.00
    
    cursor = connection.cursor()
    
    account_query = """
    INSERT INTO Accounts (CustomerID, AccountNumber, AccountType, Balance)
    VALUES (%s, %s, %s, %s)
    """
    try:
        cursor.execute(account_query, (customer_id, account_number, account_type_title, initial_balance))
        account_info = {
            'account_id': cursor.lastrowid,
            'account_number': account_number,
            'account_type': account_type_title,
            'balance': initial_balance
        }
        cursor.close()
        return account_info, None
    except Error as e:
        cursor.close()
        return None, f'Database insert error: {str(e)}'


# NEW UNIFIED: API route to create selected account(s)
@app.route('/api/create_selected_accounts', methods=['POST'])
def create_selected_accounts():
    connection = None
    try:
        data = request.get_json()
        account_types_raw = data.get('account_types', [])
        
        # Get customer ID from session (set during registration)
        customer_id = session.get('temp_customer_id') 
        
        if not customer_id:
            return jsonify({'error': 'Session expired. Please register or log in.'}), 400
        
        if not account_types_raw or not isinstance(account_types_raw, list):
            return jsonify({'error': 'Please select at least one account type.'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        # Verify customer exists
        cursor = connection.cursor()
        cursor.execute("SELECT CustomerID FROM Customers WHERE CustomerID = %s", (customer_id,))
        if not cursor.fetchone():
            connection.close()
            return jsonify({'error': 'Customer not found'}), 404
        cursor.close()

        created_accounts = []
        
        # Loop through the list of selected account types from the frontend
        for account_type in account_types_raw:
            account_info, error = _create_single_account_db(customer_id, account_type, connection)
            if error:
                connection.rollback()
                connection.close()
                return jsonify({'error': f'Failed to create {account_type} account: {error}'}), 500
            created_accounts.append(account_info)
        
        connection.commit()
        connection.close()
        
        # Clear temporary customer ID from session after successful account creation
        session.pop('temp_customer_id', None)
        
        message = f"Successfully created {len(created_accounts)} account(s)!"
        
        return jsonify({
            'message': message,
            'accounts': created_accounts
        }), 201
        
    except Error as e:
        # Handle MySQL specific errors
        if connection and connection.is_connected():
            connection.rollback()
            connection.close()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        # Handle general Python errors
        if connection and connection.is_connected():
            connection.rollback()
            connection.close()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get user login info with customer details
        query = """
        SELECT l.LoginID, l.CustomerID, l.Username, l.PasswordHash,
               c.FirstName, c.LastName, c.Email
        FROM Logins l
        JOIN Customers c ON l.CustomerID = c.CustomerID
        WHERE l.Username = %s
        """
        cursor.execute(query, (data['username'],))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Verify password
        if bcrypt.checkpw(data['password'].encode('utf-8'), user['PasswordHash'].encode('utf-8')):
            # Update last login
            update_query = "UPDATE Logins SET LastLogin = NOW() WHERE LoginID = %s"
            cursor.execute(update_query, (user['LoginID'],))
            connection.commit()
            
            # Set session
            session['customer_id'] = user['CustomerID']
            session['username'] = user['Username']
            session['full_name'] = f"{user['FirstName']} {user['LastName']}"

            # Clear any stale temporary registration ID
            session.pop('temp_customer_id', None)
            
            cursor.close()
            connection.close()
            
            return jsonify({
                'message': 'Login successful',
                'customer_id': user['CustomerID'],
                'username': user['Username'],
                'full_name': f"{user['FirstName']} {user['LastName']}"
            }), 200
        else:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Invalid username or password'}), 401
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        customer_id = session['customer_id']
        
        # Get customer info
        cursor.execute("SELECT * FROM Customers WHERE CustomerID = %s", (customer_id,))
        customer = cursor.fetchone()
        
        # Get accounts
        cursor.execute("""
            SELECT AccountID, AccountNumber, AccountType, Balance, Status, CreatedAt
            FROM Accounts WHERE CustomerID = %s AND Status != 'Closed'
            ORDER BY CreatedAt DESC
        """, (customer_id,))
        accounts = cursor.fetchall()
        
        # Get recent transactions (last 5)
        cursor.execute("""
            SELECT t.*, a.AccountType 
            FROM Transactions t
            JOIN Accounts a ON t.AccountID = a.AccountID
            WHERE a.CustomerID = %s
            ORDER BY t.TransactionDate DESC
            LIMIT 5
        """, (customer_id,))
        recent_transactions = cursor.fetchall()
        
        # Get total balance
        cursor.execute("""
            SELECT SUM(Balance) as total_balance
            FROM Accounts WHERE CustomerID = %s AND Status = 'Active'
        """, (customer_id,))
        total_balance = cursor.fetchone()['total_balance'] or 0
        
        # Get active loans
        cursor.execute("""
            SELECT COUNT(*) as loan_count, SUM(LoanAmount) as total_loans
            FROM Loans WHERE CustomerID = %s AND Status = 'Active'
        """, (customer_id,))
        loan_info = cursor.fetchone()
        
        # Get beneficiaries count
        cursor.execute("""
            SELECT COUNT(*) as beneficiary_count
            FROM Beneficiaries WHERE CustomerID = %s
        """, (customer_id,))
        beneficiary_count = cursor.fetchone()['beneficiary_count']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'customer': customer,
            'accounts': accounts,
            'recent_transactions': recent_transactions,
            'total_balance': float(total_balance),
            'loan_count': loan_info['loan_count'],
            'total_loans': float(loan_info['total_loans'] or 0),
            'beneficiary_count': beneficiary_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/accounts', methods=['GET'])
@login_required
def get_accounts():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT AccountID, AccountNumber, AccountType, Balance, Status, CreatedAt
            FROM Accounts WHERE CustomerID = %s
            ORDER BY CreatedAt DESC
        """, (session['customer_id'],))
        accounts = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'accounts': accounts}), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/deposit', methods=['POST'])
@login_required
def self_deposit():
    try:
        data = request.get_json()
        
        required_fields = ['accountId', 'amount', 'mode']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        amount = decimal.Decimal(str(data['amount']))
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Start transaction
        cursor.execute("START TRANSACTION")
        
        # Verify account belongs to user
        cursor.execute("""
            SELECT AccountID, Balance, AccountType 
            FROM Accounts 
            WHERE AccountID = %s AND CustomerID = %s AND Status = 'Active'
        """, (data['accountId'], session['customer_id']))
        
        account = cursor.fetchone()
        if not account:
            cursor.execute("ROLLBACK")
            return jsonify({'error': 'Account not found'}), 404
        
        # Update account balance
        new_balance = account['Balance'] + amount
        cursor.execute("""
            UPDATE Accounts SET Balance = %s WHERE AccountID = %s
        """, (new_balance, data['accountId']))
        
        # Create deposit transaction
        cursor.execute("""
            INSERT INTO Transactions 
            (AccountID, Amount, TransactionType, Mode, Status)
            VALUES (%s, %s, 'Deposit', %s, 'Success')
        """, (data['accountId'], amount, data['mode']))
        
        cursor.execute("COMMIT")
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Deposit successful',
            'new_balance': float(new_balance)
        }), 200
        
    except Exception as e:
        if 'cursor' in locals():
            cursor.execute("ROLLBACK")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/transfer', methods=['POST'])
@login_required
def transfer_funds():
    try:
        data = request.get_json()
        
        required_fields = ['fromAccount', 'toAccount', 'amount', 'mode']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        amount = decimal.Decimal(str(data['amount']))
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Start transaction
        cursor.execute("START TRANSACTION")
        
        # Verify source account belongs to user and has sufficient balance
        cursor.execute("""
            SELECT AccountID, Balance 
            FROM Accounts 
            WHERE AccountID = %s AND CustomerID = %s AND Status = 'Active'
        """, (data['fromAccount'], session['customer_id']))
        
        from_account = cursor.fetchone()
        if not from_account:
            cursor.execute("ROLLBACK")
            return jsonify({'error': 'Source account not found'}), 404
        
        if from_account['Balance'] < amount:
            cursor.execute("ROLLBACK")
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Update source account balance
        new_from_balance = from_account['Balance'] - amount
        cursor.execute("""
            UPDATE Accounts SET Balance = %s WHERE AccountID = %s
        """, (new_from_balance, data['fromAccount']))
        
        destination_id = data.get('toAccount')
        beneficiary_id = data.get('beneficiaryId')
        transaction_description = 'Transfer Out' # Default description for the DEBIT


    #     # Create debit transaction
    #     debit_ref = generate_reference_number()
    #     cursor.execute("""
    #         INSERT INTO Transactions 
    #         (AccountID, Amount, TransactionType, Mode, Status)
    #         VALUES (%s, %s, 'Debit', %s, 'Success')
    #     """, (data['fromAccount'], amount, data['mode']))
        
    #     # Check if it's internal transfer (to another account of same user)
    #     if data['toAccount'] != 'external':
    #         # Verify destination account belongs to same user
    #         cursor.execute("""
    #             SELECT AccountID FROM Accounts 
    #             WHERE AccountID = %s AND CustomerID = %s AND Status = 'Active'
    #         """, (data['toAccount'], session['customer_id']))
            
    #         to_account = cursor.fetchone()
    #         if to_account:
    #             # Internal transfer - update destination account
    #             cursor.execute("""
    #                 UPDATE Accounts SET Balance = Balance + %s WHERE AccountID = %s
    #             """, (amount, data['toAccount']))
                
    #             cursor.execute("""
    #                 INSERT INTO Transactions 
    #                 (AccountID, Amount, TransactionType, Mode, Status)
    #                 VALUES (%s, %s, 'Credit', %s, 'Success')
    #             """, (data['toAccount'], amount, data['mode']))
        
    #     cursor.execute("COMMIT")
    #     cursor.close()
    #     connection.close()
        
    #     return jsonify({
    #         'message': 'Transfer successful',
    #         'reference_number': debit_ref,
    #         'new_balance': float(new_from_balance)
    #     }), 200
        
    # except Exception as e:
    #     if 'cursor' in locals():
    #         cursor.execute("ROLLBACK")
    #     return jsonify({'error': f'Server error: {str(e)}'}), 500

    # 3. Determine Destination (Internal vs. External/Beneficiary)
        is_beneficiary_transfer = destination_id == 'external' and beneficiary_id
        
        if is_beneficiary_transfer:
            # Case 1: Transfer to a saved beneficiary (External Transfer)
            
            # Fetch beneficiary details
            cursor.execute("""
                SELECT BeneficiaryName, AccountNumber, UPI_ID
                FROM Beneficiaries 
                WHERE BeneficiaryID = %s AND CustomerID = %s
            """, (beneficiary_id, session['customer_id']))
            
            beneficiary = cursor.fetchone()
            
            if not beneficiary:
                cursor.execute("ROLLBACK")
                return jsonify({'error': 'Beneficiary not found or unauthorized for this customer'}), 404

            # Construct clear description for the debit log
            destination_detail = beneficiary.get('AccountNumber') or beneficiary.get('UPI_ID') or 'External Account'
            transaction_description = f"External Transfer to {beneficiary['BeneficiaryName']} ({destination_detail})"
            
            # No local credit operation needed (money leaves the system).

        elif destination_id and destination_id != 'external':
            # Case 2: Internal Transfer (Account to Account)
            
            # Verify destination account belongs to same user
            cursor.execute("""
                SELECT AccountID FROM Accounts 
                WHERE AccountID = %s AND CustomerID = %s AND Status = 'Active'
            """, (destination_id, session['customer_id']))
            
            to_account = cursor.fetchone()
            if to_account:
                # Internal transfer - update destination account
                cursor.execute("""
                    UPDATE Accounts SET Balance = Balance + %s WHERE AccountID = %s
                """, (amount, destination_id))
                
                # Create the CREDIT transaction log
                cursor.execute("""
                    INSERT INTO Transactions 
                    (AccountID, Amount, TransactionType, Mode, Status, Description)
                    VALUES (%s, %s, 'Credit', %s, 'Success', 'Internal Transfer Credit')
                """, (destination_id, amount, data['mode']))
                
                transaction_description = 'Internal Transfer Debit' # Description for the DEBIT log

            else:
                 cursor.execute("ROLLBACK")
                 return jsonify({'error': 'Destination account not found or is closed'}), 404
        else:
            # Catch all for invalid destination selection
            cursor.execute("ROLLBACK")
            return jsonify({'error': 'Invalid destination or missing beneficiary ID.'}), 400


        # 4. Create DEBIT transaction log (Always required for a successful transfer)
        debit_ref = generate_reference_number()
        # NOTE: Using INSERT with Description field. Ensure your database schema supports this field.
        cursor.execute("""
            INSERT INTO Transactions 
            (AccountID, Amount, TransactionType, Mode, Status, Description)
            VALUES (%s, %s, 'Debit', %s, 'Success', %s)
        """, (data['fromAccount'], amount, data['mode'], transaction_description))
        
        
        cursor.execute("COMMIT")
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Transfer successful',
            'reference_number': debit_ref,
            'new_balance': float(new_from_balance)
        }), 200
        
    except Exception as e:
        if 'cursor' in locals():
            cursor.execute("ROLLBACK")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/accounts/<int:account_id>/transactions', methods=['GET'])
@login_required
def get_account_transactions(account_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify account belongs to user
        cursor.execute("""
            SELECT CustomerID FROM Accounts WHERE AccountID = %s
        """, (account_id,))
        account = cursor.fetchone()
        
        if not account or account['CustomerID'] != session['customer_id']:
            return jsonify({'error': 'Account not found'}), 404
        
        # Get transactions with pagination
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        offset = (page - 1) * limit
        
        cursor.execute("""
            SELECT * FROM Transactions 
            WHERE AccountID = %s 
            ORDER BY TransactionDate DESC 
            LIMIT %s OFFSET %s
        """, (account_id, limit, offset))
        transactions = cursor.fetchall()
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) as total FROM Transactions WHERE AccountID = %s
        """, (account_id,))
        total = cursor.fetchone()['total']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'transactions': transactions,
            'total': total,
            'page': page,
            'limit': limit
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/beneficiaries', methods=['GET'])
@login_required
def get_beneficiaries():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT * FROM Beneficiaries 
            WHERE CustomerID = %s
            ORDER BY BeneficiaryName
        """, (session['customer_id'],))
        beneficiaries = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'beneficiaries': beneficiaries}), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/beneficiaries', methods=['POST'])
@login_required
def add_beneficiary():
    try:
        data = request.get_json()
        
        required_fields = ['beneficiaryName']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO Beneficiaries 
            (CustomerID, BeneficiaryName, AccountNumber, IFSC, UPI_ID)
            VALUES (%s, %s, %s, %s, %s)
        """, (session['customer_id'], data['beneficiaryName'], 
              data.get('accountNumber'), data.get('ifsc'), data.get('upiId')))
        
        beneficiary_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Beneficiary added successfully',
            'beneficiary_id': beneficiary_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/beneficiaries/<int:beneficiary_id>', methods=['DELETE'])
@login_required
def delete_beneficiary(beneficiary_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Verify beneficiary belongs to user
        cursor.execute("""
            DELETE FROM Beneficiaries 
            WHERE BeneficiaryID = %s AND CustomerID = %s
        """, (beneficiary_id, session['customer_id']))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Beneficiary not found'}), 404
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Beneficiary deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/loans', methods=['GET'])
@login_required
def get_loans():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT * FROM Loans 
            WHERE CustomerID = %s
            ORDER BY StartDate DESC
        """, (session['customer_id'],))
        loans = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'loans': loans}), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/loans/apply', methods=['POST'])
@login_required
def apply_loan():
    try:
        data = request.get_json()
        
        required_fields = ['loanType', 'loanAmount', 'tenureMonths']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Interest rates by loan type
        interest_rates = {
            'Home': 8.5,
            'Car': 9.5,
            'Education': 7.5,
            'Personal': 12.0
        }
        
        loan_amount = float(data['loanAmount'])
        tenure_months = int(data['tenureMonths'])
        interest_rate = interest_rates.get(data['loanType'], 10.0)
        
        # Calculate start and end dates
        start_date = datetime.now().date()
        end_date = start_date.replace(year=start_date.year + (tenure_months // 12))
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO Loans 
            (CustomerID, LoanType, LoanAmount, InterestRate, StartDate, EndDate, Status)
            VALUES (%s, %s, %s, %s, %s, %s, 'Active')
        """, (session['customer_id'], data['loanType'], loan_amount, 
              interest_rate, start_date, end_date))
        
        loan_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        # Calculate EMI
        monthly_emi = calculate_emi(loan_amount, interest_rate, tenure_months)
        
        return jsonify({
            'message': 'Loan application submitted successfully',
            'loan_id': loan_id,
            'monthly_emi': round(monthly_emi, 2),
            'interest_rate': interest_rate
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/services', methods=['GET'])
@login_required
def get_services():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT * FROM Services 
            WHERE CustomerID = %s
            ORDER BY SubscribedOn DESC
        """, (session['customer_id'],))
        services = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({'services': services}), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/services/activate', methods=['POST'])
@login_required
def activate_service():
    try:
        data = request.get_json()
        
        required_fields = ['serviceName', 'providerName']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO Services 
            (CustomerID, ServiceName, ProviderName, Status)
            VALUES (%s, %s, %s, 'Active')
        """, (session['customer_id'], data['serviceName'], data['providerName']))
        
        service_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Service activated successfully',
            'service_id': service_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)