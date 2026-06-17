from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
import os
import secrets
import traceback
import json

# Get absolute path for the project directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Development Mode - Set to False in production
app.config['DEV_MODE'] = True

# Email Configuration (Update with your email settings)
# If DEV_MODE is True, email verification is optional
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'  # Update with your email
app.config['MAIL_PASSWORD'] = 'your-app-password'     # Update with your app password
app.config['MAIL_DEFAULT_SENDER'] = 'your-email@gmail.com'

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please login to access the dashboard.'

# Only initialize mail if credentials are provided
if app.config['MAIL_USERNAME'] != 'your-email@gmail.com' and app.config['MAIL_PASSWORD'] != 'your-app-password':
    mail = Mail(app)
    app.config['MAIL_ENABLED'] = True
else:
    mail = None
    app.config['MAIL_ENABLED'] = False

# User Model
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create database tables
with app.app_context():
    db.create_all()

# Load the trained model and data using absolute paths
model_path = os.path.join(BASE_DIR, 'sales_model.pkl')
csv_path = os.path.join(BASE_DIR, 'Sales.csv')

print(f"Loading model from: {model_path}")
print(f"Loading CSV from: {csv_path}")

model = joblib.load(model_path)
df = pd.read_csv(csv_path)

# Convert Date column to datetime
df['Date'] = pd.to_datetime(df['Date'])

# Create label encoding mappings from the CSV data
# This ensures the same encoding used during training is applied during prediction
from sklearn.preprocessing import LabelEncoder

# Create and fit label encoders
product_encoder = LabelEncoder()
category_encoder = LabelEncoder()
region_encoder = LabelEncoder()

# Fit encoders on the training data
product_encoder.fit(df['Product'])
category_encoder.fit(df['Category'])
region_encoder.fit(df['Region'])

# Create encoding dictionaries for easy lookup
product_mapping = {product: idx for idx, product in enumerate(product_encoder.classes_)}
category_mapping = {category: idx for idx, category in enumerate(category_encoder.classes_)}
region_mapping = {region: idx for idx, region in enumerate(region_encoder.classes_)}

print("Product mapping:", product_mapping)
print("Category mapping:", category_mapping)
print("Region mapping:", region_mapping)

# Extract unique values for dropdowns
products = sorted(df['Product'].unique().tolist())
categories = sorted(df['Category'].unique().tolist())
regions = sorted(df['Region'].unique().tolist())

@app.route('/')
def index():
    """Redirect to login if not authenticated, otherwise show dashboard"""
    if current_user.is_authenticated:
        # In dev mode, skip verification check
        if not app.config['DEV_MODE'] and not current_user.is_verified:
            return redirect(url_for('verify'))
        return render_template('index.html')
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        try:
            user = User.query.filter_by(email=email).first()
            
            if user and check_password_hash(user.password, password):
                # In dev mode, allow login without verification
                if not app.config['DEV_MODE'] and not user.is_verified:
                    flash('Please verify your email before logging in.', 'warning')
                    return redirect(url_for('verify', email=email))
                
                login_user(user)
                flash('Login successful!', 'success')
                return redirect(url_for('index'))
            else:
                flash('Invalid email or password.', 'error')
        except Exception as e:
            print(f"Login error: {str(e)}")
            import traceback
            traceback.print_exc()
            flash(f'Login error: {str(e)}', 'error')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """Handle user registration"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        try:
            name = request.form.get('name')
            email = request.form.get('email')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            
            # Validation
            if not name or not email or not password:
                flash('All fields are required.', 'error')
                return render_template('signup.html')
            
            if password != confirm_password:
                flash('Passwords do not match.', 'error')
                return render_template('signup.html')
            
            if len(password) < 6:
                flash('Password must be at least 6 characters long.', 'error')
                return render_template('signup.html')
            
            # Check if user already exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                flash('Email already registered. Please login.', 'error')
                return redirect(url_for('login'))
            
            # Create new user
            verification_token = secrets.token_urlsafe(32)
            hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
            
            # In dev mode, auto-verify user
            is_verified = app.config['DEV_MODE']
            
            new_user = User(
                email=email,
                password=hashed_password,
                name=name,
                verification_token=verification_token if not app.config['DEV_MODE'] else None,
                is_verified=is_verified
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            # Send verification email only if mail is enabled and not in dev mode
            if app.config['MAIL_ENABLED'] and not app.config['DEV_MODE']:
                try:
                    send_verification_email(email, verification_token)
                    flash('Registration successful! Please check your email to verify your account.', 'success')
                    return redirect(url_for('verify', email=email))
                except Exception as e:
                    flash(f'Registration successful but email sending failed: {str(e)}', 'warning')
                    return redirect(url_for('verify', email=email))
            else:
                # In dev mode or if mail not configured
                if app.config['DEV_MODE']:
                    flash('Registration successful! You can now login (Development Mode - Email Verification Skipped)', 'success')
                    return redirect(url_for('login'))
                else:
                    flash('Registration successful! Email verification is disabled. You can now login.', 'success')
                    return redirect(url_for('login'))
        except Exception as e:
            print(f"Signup error: {str(e)}")
            import traceback
            traceback.print_exc()
            flash(f'Signup error: {str(e)}', 'error')
            return render_template('signup.html')
    
    return render_template('signup.html')

@app.route('/verify')
def verify():
    """Email verification page"""
    if current_user.is_authenticated and current_user.is_verified:
        return redirect(url_for('index'))
    
    email = request.args.get('email', '')
    return render_template('verify.html', email=email)

@app.route('/verify/<token>')
def verify_email(token):
    """Verify email with token"""
    user = User.query.filter_by(verification_token=token).first()
    
    if user:
        user.is_verified = True
        user.verification_token = None
        db.session.commit()
        flash('Email verified successfully! You can now login.', 'success')
        return redirect(url_for('login'))
    else:
        flash('Invalid or expired verification link.', 'error')
        return redirect(url_for('verify'))

@app.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    email = request.form.get('email')
    user = User.query.filter_by(email=email).first()
    
    if user and not user.is_verified:
        verification_token = secrets.token_urlsafe(32)
        user.verification_token = verification_token
        db.session.commit()
        
        try:
            send_verification_email(email, verification_token)
            flash('Verification email sent successfully!', 'success')
        except Exception as e:
            flash(f'Failed to send verification email: {str(e)}', 'error')
    else:
        flash('Email not found or already verified.', 'error')
    
    return redirect(url_for('verify', email=email))

@app.route('/logout')
@login_required
def logout():
    """Handle user logout"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

def send_verification_email(email, token):
    """Send verification email to user"""
    if not app.config['MAIL_ENABLED'] or not mail:
        raise Exception("Email is not configured. Please set up email credentials in app.py.")
    
    verify_url = url_for('verify_email', token=token, _external=True)
    
    msg = Message(
        'Verify Your Email - RetailIQ Dashboard',
        recipients=[email]
    )
    msg.html = f'''
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Welcome to RetailIQ!</h2>
            <p>Thank you for registering with RetailIQ Sales Forecasting Dashboard.</p>
            <p>Please click the button below to verify your email address and activate your account:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" style="background: linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{verify_url}</p>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">This link will expire in 24 hours. If you didn't create an account with RetailIQ, please ignore this email.</p>
        </div>
    </body>
    </html>
    '''
    
    mail.send(msg)

@app.route('/predict', methods=['POST'])
def predict():
    """Handle sales prediction requests"""
    try:
        data = request.json
        
        print("=" * 50)
        print("RECEIVED PREDICTION REQUEST")
        print("=" * 50)
        print("Received Data:", data)
        
        # Extract features from request
        product = data.get('product')
        category = data.get('category')
        region = data.get('region')
        quantity_sold = float(data.get('quantity_sold', 0))
        unit_price = float(data.get('unit_price', 0))
        discount = float(data.get('discount', 0))
        date_str = data.get('date')
        
        print(f"Product (text): {product}")
        print(f"Category (text): {category}")
        print(f"Region (text): {region}")
        print(f"Quantity Sold: {quantity_sold}")
        print(f"Unit Price: {unit_price}")
        print(f"Discount: {discount}")
        print(f"Date: {date_str}")
        
        # Validate required fields
        if not product or not category or not region:
            raise ValueError("Product, Category, and Region are required")
        
        # Convert text values to numeric encoded values using label mappings
        try:
            product_encoded = product_mapping[product]
            category_encoded = category_mapping[category]
            region_encoded = region_mapping[region]
        except KeyError as e:
            raise ValueError(f"Invalid value for {str(e)}. Valid values are: Product={list(product_mapping.keys())}, Category={list(category_mapping.keys())}, Region={list(region_mapping.keys())}")
        
        print(f"Product (encoded): {product_encoded}")
        print(f"Category (encoded): {category_encoded}")
        print(f"Region (encoded): {region_encoded}")
        
        # Parse date
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            raise ValueError("Invalid date format. Please use YYYY-MM-DD format")
        
        year = date_obj.year
        month = date_obj.month
        day = date_obj.day
        
        print(f"Year: {year}, Month: {month}, Day: {day}")
        
        # Create feature array in the same order as training
        # Order: Product, Category, Region, Quantity_Sold, Unit_Price, Discount, Year, Month, Day
        features = np.array([[
            product_encoded, category_encoded, region_encoded,
            quantity_sold, unit_price, discount,
            year, month, day
        ]], dtype=np.float64)
        
        # Create feature names to match training
        feature_names = ['Product', 'Category', 'Region', 'Quantity_Sold', 'Unit_Price', 'Discount', 'Year', 'Month', 'Day']
        features_df = pd.DataFrame(features, columns=feature_names)
        
        print(f"Features array: {features}")
        print(f"Features shape: {features.shape}")
        print(f"Features dtype: {features.dtype}")
        print(f"Feature values - Product: {product_encoded}, Category: {category_encoded}, Region: {region_encoded}")
        print(f"Feature values - Qty: {quantity_sold}, Price: {unit_price}, Discount: {discount}")
        print(f"Feature values - Year: {year}, Month: {month}, Day: {day}")
        print(f"Features DataFrame:\n{features_df}")
        
        # Make prediction
        prediction = model.predict(features_df)[0]
        print(f"Raw prediction: {prediction}")
        print(f"Prediction type: {type(prediction)}")
        
        # Calculate confidence indicator based on prediction range
        confidence = min(95, max(70, int(85 + (quantity_sold * unit_price / 10000) * 5)))
        
        response = {
            'success': True,
            'predicted_sales': round(float(prediction), 2),
            'confidence': confidence,
            'forecast_summary': f"Based on the input parameters, the predicted sales revenue is ₹{round(float(prediction), 2):,.2f} with {confidence}% confidence."
        }
        
        print("Prediction successful!")
        print("=" * 50)
        
        return jsonify(response)
        
    except Exception as e:
        print("=" * 50)
        print("PREDICTION ERROR")
        print("=" * 50)
        print(f"Error: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        print("=" * 50)
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/analytics')
def analytics():
    """Provide analytics data for charts"""
    try:
        print("=" * 50)
        print("ANALYTICS REQUEST")
        print("=" * 50)
        
        # Create a copy of df to avoid modifying the global variable
        analytics_df = df.copy()
        
        # Monthly Sales Trend
        analytics_df['YearMonth'] = analytics_df['Date'].dt.to_period('M')
        monthly_sales = analytics_df.groupby('YearMonth')['Sales'].sum().reset_index()
        monthly_sales['YearMonth'] = monthly_sales['YearMonth'].astype(str)
        monthly_data = {
            'labels': monthly_sales['YearMonth'].tolist(),
            'values': monthly_sales['Sales'].tolist()
        }
        print(f"Monthly sales data points: {len(monthly_data['labels'])}")
        
        # Drop the temporary YearMonth column to avoid any serialization issues
        analytics_df = analytics_df.drop(columns=['YearMonth'], errors='ignore')
        
        # Product Wise Revenue
        product_revenue = analytics_df.groupby('Product')['Sales'].sum().sort_values(ascending=False)
        product_data = {
            'labels': product_revenue.index.tolist(),
            'values': product_revenue.values.tolist()
        }
        print(f"Product revenue data points: {len(product_data['labels'])}")
        
        # Category Performance
        category_performance = analytics_df.groupby('Category')['Sales'].sum().sort_values(ascending=False)
        category_data = {
            'labels': category_performance.index.tolist(),
            'values': category_performance.values.tolist()
        }
        print(f"Category performance data points: {len(category_data['labels'])}")
        
        # Region Wise Sales
        region_sales = analytics_df.groupby('Region')['Sales'].sum().sort_values(ascending=False)
        region_data = {
            'labels': region_sales.index.tolist(),
            'values': region_sales.values.tolist()
        }
        print(f"Region sales data points: {len(region_data['labels'])}")
        
        # Sales Distribution (by quantity ranges)
        analytics_df['Quantity_Range'] = pd.cut(analytics_df['Quantity_Sold'], 
                                     bins=[0, 5, 10, 15, 20, float('inf')],
                                     labels=['1-5', '6-10', '11-15', '16-20', '20+'])
        sales_distribution = analytics_df.groupby('Quantity_Range')['Sales'].sum()
        distribution_data = {
            'labels': sales_distribution.index.tolist(),
            'values': sales_distribution.values.tolist()
        }
        print(f"Sales distribution data points: {len(distribution_data['labels'])}")
        
        # Revenue Growth Analysis (cumulative)
        df_sorted = analytics_df.sort_values('Date')
        df_sorted['Cumulative_Sales'] = df_sorted['Sales'].cumsum()
        growth_data = {
            'labels': df_sorted['Date'].dt.strftime('%Y-%m-%d').tolist(),
            'values': df_sorted['Cumulative_Sales'].tolist()
        }
        print(f"Revenue growth data points: {len(growth_data['labels'])}")
        
        # KPI Metrics
        total_sales = analytics_df['Sales'].sum()
        total_orders = len(analytics_df)
        average_sales = analytics_df['Sales'].mean()
        highest_sale = analytics_df['Sales'].max()
        
        kpi_data = {
            'total_sales': round(float(total_sales), 2),
            'total_orders': int(total_orders),
            'average_sales': round(float(average_sales), 2),
            'highest_sale': round(float(highest_sale), 2)
        }
        print(f"KPI Metrics - Total Sales: {kpi_data['total_sales']}, Orders: {kpi_data['total_orders']}")
        
        # Recent Transactions for table - show transactions sorted by Order_ID
        recent_transactions = analytics_df.sort_values('Order_ID', ascending=True).head(200)
        # Convert datetime objects to strings for JSON serialization
        recent_transactions = recent_transactions.copy()
        recent_transactions['Date'] = recent_transactions['Date'].dt.strftime('%Y-%m-%d')
        transactions_data = recent_transactions.to_dict('records')
        print(f"Recent transactions: {len(transactions_data)}")
        
        response = {
            'success': True,
            'monthly_sales': monthly_data,
            'product_revenue': product_data,
            'category_performance': category_data,
            'region_sales': region_data,
            'sales_distribution': distribution_data,
            'revenue_growth': growth_data,
            'kpi_metrics': kpi_data,
            'recent_transactions': transactions_data,
            'dropdowns': {
                'products': products,
                'categories': categories,
                'regions': regions
            }
        }
        
        print("Analytics data prepared successfully")
        print("=" * 50)
        
        # Manually convert to JSON to catch serialization errors
        try:
            json.dumps(response)
        except TypeError as e:
            print(f"JSON Serialization Error: {e}")
            print("Attempting to fix serialization issues...")
            
            # Fix any remaining serialization issues
            if 'sales_distribution' in response and 'labels' in response['sales_distribution']:
                response['sales_distribution']['labels'] = [str(label) for label in response['sales_distribution']['labels']]
        
        return jsonify(response)
        
    except Exception as e:
        print("=" * 50)
        print("ANALYTICS ERROR")
        print("=" * 50)
        print(f"Error: {str(e)}")
        traceback.print_exc()
        print("=" * 50)
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/dropdown-data')
def dropdown_data():
    """Provide dropdown options"""
    return jsonify({
        'products': products,
        'categories': categories,
        'regions': regions
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
