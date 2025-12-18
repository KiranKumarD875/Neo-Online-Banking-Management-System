-- SecureBank Database Schema
-- Enhanced version with support for multiple account types and internal transfers

-- Create Database
CREATE DATABASE NeoBanking2;
USE NeoBanking2;

-- Customers Table
CREATE TABLE Customers (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    DOB DATE NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15),
    Street VARCHAR(100),
    City VARCHAR(50),
    State VARCHAR(50),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logins Table (credentials)
CREATE TABLE Logins (
    LoginID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    LastLogin TIMESTAMP NULL,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

-- Accounts Table (Enhanced: added AccountNumber, supports multiple types)
CREATE TABLE Accounts (
    AccountID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    AccountNumber VARCHAR(20) UNIQUE NOT NULL,
    AccountType ENUM('Savings', 'Personal', 'Business', 'FixedDeposit', 'Current') NOT NULL,
    Balance DECIMAL(15,2) DEFAULT 0.00,
    Status ENUM('Active', 'Inactive', 'Closed') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
    
    
);

-- Transactions Table (Enhanced: added ToAccountID for internal transfers)
CREATE TABLE Transactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    AccountID INT NOT NULL,
    ToAccountID INT NULL, -- for internal transfers
    Amount DECIMAL(15,2) NOT NULL,
    TransactionType ENUM('Credit', 'Debit', 'Transfer', 'Deposit') NOT NULL,
    Mode ENUM('UPI', 'NEFT', 'IMPS', 'RTGS', 'Cash', 'Card', 'Internal', 'NetBanking') NOT NULL,
    Status ENUM('Success', 'Pending', 'Failed') DEFAULT 'Pending',
    Scheduled BOOLEAN DEFAULT FALSE,
    NextExecution DATE NULL,
    TransactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AccountID) REFERENCES Accounts(AccountID) ON DELETE CASCADE,
    FOREIGN KEY (ToAccountID) REFERENCES Accounts(AccountID) ON DELETE CASCADE
);

-- Loans Table
CREATE TABLE Loans (
    LoanID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    LoanType ENUM('Home', 'Car', 'Education', 'Personal') NOT NULL,
    LoanAmount DECIMAL(15,2) NOT NULL,
    InterestRate DECIMAL(5,2) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Status ENUM('Active', 'Closed', 'Defaulted') DEFAULT 'Active',
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

-- Beneficiaries Table
CREATE TABLE Beneficiaries (
    BeneficiaryID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    BeneficiaryName VARCHAR(100) NOT NULL,
    AccountNumber VARCHAR(20),
    IFSC VARCHAR(11),
    UPI_ID VARCHAR(50),
    AddedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

-- Services Table
CREATE TABLE Services (
    ServiceID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    ServiceName VARCHAR(100) NOT NULL,
    ProviderName VARCHAR(100),
    Status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    SubscribedOn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_customer_email ON Customers(Email);
CREATE INDEX idx_login_username ON Logins(Username);
CREATE INDEX idx_account_number ON Accounts(AccountNumber);
CREATE INDEX idx_account_customer ON Accounts(CustomerID);
CREATE INDEX idx_transaction_account ON Transactions(AccountID);
CREATE INDEX idx_transaction_date ON Transactions(TransactionDate);
CREATE INDEX idx_loan_customer ON Loans(CustomerID);
CREATE INDEX idx_beneficiary_customer ON Beneficiaries(CustomerID);
CREATE INDEX idx_service_customer ON Services(CustomerID);

-- Sample Data (Optional - for testing)
-- You can uncomment and modify these if needed

/*
-- Sample Customers
INSERT INTO Customers (FirstName, LastName, DOB, Email, Phone, Street, City, State) VALUES
('John', 'Doe', '1990-05-15', 'john.doe@example.com', '9876543210', '123 Main St', 'Mumbai', 'Maharashtra'),
('Jane', 'Smith', '1992-08-20', 'jane.smith@example.com', '9876543211', '456 Oak Ave', 'Delhi', 'Delhi'),
('Mike', 'Johnson', '1988-12-10', 'mike.johnson@example.com', '9876543212', '789 Pine Rd', 'Bangalore', 'Karnataka');

-- Sample Logins (passwords should be properly hashed in real application)
-- Password: 'password123' (this is just for example - will be hashed by application)
INSERT INTO Logins (CustomerID, Username, PasswordHash) VALUES
(1, 'johndoe', '$2b$12$example_hash_here'),
(2, 'janesmith', '$2b$12$example_hash_here'),
(3, 'mikejohnson', '$2b$12$example_hash_here');

-- Sample Accounts (3 accounts per customer)
INSERT INTO Accounts (CustomerID, AccountNumber, AccountType, Balance) VALUES
-- John Doe's accounts
(1, '100001000001', 'Savings', 1000.00),
(1, '100001000002', 'Personal', 0.00),
(1, '100001000003', 'Business', 0.00),
-- Jane Smith's accounts
(2, '100002000001', 'Savings', 1000.00),
(2, '100002000002', 'Personal', 0.00),
(2, '100002000003', 'Business', 0.00),
-- Mike Johnson's accounts
(3, '100003000001', 'Savings', 1000.00),
(3, '100003000002', 'Personal', 0.00),
(3, '100003000003', 'Business', 0.00);

-- Sample Transactions
INSERT INTO Transactions (AccountID, ToAccountID, Amount, TransactionType, Mode, Status) VALUES
-- Initial deposits for savings accounts
(1, NULL, 1000.00, 'Deposit', 'Cash', 'Success'),
(4, NULL, 1000.00, 'Deposit', 'Cash', 'Success'),
(7, NULL, 1000.00, 'Deposit', 'Cash', 'Success'),
-- Sample internal transfer
(1, 2, 200.00, 'Transfer', 'Internal', 'Success'),
(2, NULL, 200.00, 'Credit', 'Internal', 'Success');

-- Sample Loans
INSERT INTO Loans (CustomerID, LoanType, LoanAmount, InterestRate, StartDate, EndDate) VALUES
(1, 'Home', 2500000.00, 8.5, '2024-01-01', '2044-01-01'),
(2, 'Car', 800000.00, 9.5, '2024-02-01', '2029-02-01'),
(3, 'Personal', 200000.00, 12.0, '2024-03-01', '2027-03-01');

-- Sample Beneficiaries
INSERT INTO Beneficiaries (CustomerID, BeneficiaryName, AccountNumber, IFSC, UPI_ID) VALUES
(1, 'Jane Smith', '100002000001', 'HDFC0000001', 'jane@paytm'),
(2, 'John Doe', '100001000001', 'ICIC0000001', 'john@gpay'),
(3, 'Family Trust', '987654321001', 'SBI0000001', 'trust@phonepe');

-- Sample Services
INSERT INTO Services (CustomerID, ServiceName, ProviderName, Status) VALUES
(1, 'Mobile Recharge', 'Airtel', 'Active'),
(1, 'Electricity Bill', 'MSEB', 'Active'),
(2, 'DTH Recharge', 'Tata Sky', 'Active'),
(2, 'Internet Bill', 'JioFiber', 'Active'),
(3, 'Insurance Premium', 'LIC', 'Active'),
(3, 'Gas Bill', 'Indane', 'Active');
*/

-- Verification queries
-- Use these to verify the database setup

-- Check all tables
-- SHOW TABLES;

-- Check table structures
-- DESCRIBE Customers;
-- DESCRIBE Accounts;
-- DESCRIBE Transactions;

-- Check if sample data exists (if inserted)
-- SELECT COUNT(*) FROM Customers;
-- SELECT COUNT(*) FROM Accounts;
-- SELECT COUNT(*) FROM Transactions;

-- Database setup complete
-- Make sure to update the database credentials in app.py
-- DB_CONFIG = {
--     'host': 'localhost',
--     'database': 'OnlineBanking',
--     'user': 'your_mysql_username',
--     'password': 'your_mysql_password'
-- }