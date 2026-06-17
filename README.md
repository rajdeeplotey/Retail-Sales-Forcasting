# RetailIQ - AI-Powered Retail Sales Forecasting Dashboard

A professional, production-ready retail sales forecasting dashboard with user authentication and email verification.

## Features

- **AI-Powered Predictions** - Machine learning model for real-time sales forecasting
- **User Authentication** - Secure login/signup with email verification
- **Interactive Analytics** - 6 different Chart.js visualizations
- **KPI Dashboard** - Total sales, orders, average sales, highest sale
- **Data Table** - Searchable, sortable transaction history
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Professional UI** - Premium SaaS analytics platform appearance

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure email settings in `app.py`:
```python
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'  # Update with your email
app.config['MAIL_PASSWORD'] = 'your-app-password'     # Update with your app password
app.config['MAIL_DEFAULT_SENDER'] = 'your-email@gmail.com'
```

### Email Configuration Setup

For Gmail:
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security > App Passwords
4. Generate a new app password
5. Use the app password in `app.py`

For other email providers, update the SMTP settings accordingly.

## Running the Application

```bash
python app.py
```

The application will be available at: http://127.0.0.1:5000

## Authentication Flow

1. **Sign Up** - Users register with name, email, and password
2. **Email Verification** - Verification email sent to user's email
3. **Verify Email** - User clicks verification link to activate account
4. **Login** - Verified users can login to access the dashboard
5. **Logout** - Users can securely logout

## Project Structure

```
retail-sales-project/
│
├── app.py                          # Flask application with authentication
├── Sales.csv                       # Retail sales dataset
├── sales_model.pkl                 # Trained ML model
├── users.db                        # SQLite user database (auto-created)
├── requirements.txt                # Python dependencies
├── README.md                       # This file
│
├── templates/
│   ├── index.html                  # Main dashboard
│   ├── login.html                  # Login page
│   ├── signup.html                 # Registration page
│   └── verify.html                 # Email verification page
│
└── static/
    ├── css/
    │   └── style.css               # Professional styling
    │
    ├── js/
    │   └── dashboard.js            # Interactive functionality
    │
    └── images/                     # Image assets
```

## Security Features

- Password hashing with Werkzeug
- Email verification required for account activation
- Session management with Flask-Login
- Protected routes with `@login_required` decorator
- CSRF protection (Flask-WTF can be added for production)

## Technology Stack

- **Backend**: Flask, Flask-Login, Flask-SQLAlchemy, Flask-Mail
- **Frontend**: Bootstrap 5, Chart.js, DataTables
- **Data Processing**: Pandas, NumPy
- **Machine Learning**: Scikit-Learn
- **Database**: SQLite (can be upgraded to PostgreSQL/MySQL)

## Development Notes

- The application runs in debug mode by default
- SQLite database is auto-created on first run
- Email verification requires proper SMTP configuration
- For production, use:
  - Production WSGI server (Gunicorn/uWSGI)
  - Production database (PostgreSQL/MySQL)
  - Environment variables for sensitive data
  - HTTPS/SSL certificates
  - Rate limiting
  - Additional security headers

## License

This project is for demonstration purposes.
