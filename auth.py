from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from marshmallow import ValidationError
from schemas import UserSchema
from datetime import timedelta

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
user_schema = UserSchema()


# ---------------------------------------------------------
# SIGNUP (Frontend calls this as /auth/register)
# ---------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = user_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation Failed", "messages": err.messages}), 400

    username = data.get("username")
    password = data.get("password")

    # Check duplicate
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "User already exists"}), 409

    # Create and store new user
    new_user = User(username=username)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()

        # Auto-login: create JWT immediately after signup
        token = create_access_token(identity=str(new_user.id), expires_delta=timedelta(hours=12))
        return jsonify({
            "message": "User created successfully",
            "access_token": token,
            "username": new_user.username
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create user", "details": str(e)}), 500


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = user_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation Failed", "messages": err.messages}), 400

    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if not user or not user.verify_password(password):
        return jsonify({"error": "Incorrect username or password"}), 401

    try:
        token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=12))
        return jsonify({
            "message": "Login successful",
            "access_token": token,
            "username": user.username
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed", "details": str(e)}), 500


# ---------------------------------------------------------
# AUTH TEST ROUTE
# ---------------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return current authenticated user info"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"id": user.id, "username": user.username})


# ---------------------------------------------------------
# FORGOT PASSWORD - Request reset email
# ---------------------------------------------------------
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        from email_utils import generate_reset_token, send_reset_email
        from models import UserProfile
        
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Find user by email in their profile (case-insensitive)
        try:
            from sqlalchemy import func
            profile = UserProfile.query.filter(func.lower(UserProfile.email) == email).first()
        except Exception as e:
            # If email column doesn't exist, try simple query
            print(f"Email lookup error (column might not exist): {e}")
            profile = None
        
        if profile:
            user = User.query.get(profile.user_id)
            if user:
                # Generate reset token
                token = generate_reset_token(email)
                
                # Build reset URL
                reset_url = request.host_url.rstrip('/') + f"/reset_password?token={token}"
                
                # Send email
                send_reset_email(email, reset_url)
        
        # Always return success to prevent email enumeration
        return jsonify({
            "message": "If an account with that email exists, a password reset link has been sent."
        }), 200
    except Exception as e:
        print(f"Forgot password error: {e}")
        return jsonify({"error": "An error occurred. Please try again."}), 500


# ---------------------------------------------------------
# RESET PASSWORD - Actually reset the password
# ---------------------------------------------------------
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    from email_utils import verify_reset_token
    from models import UserProfile
    
    data = request.get_json() or {}
    token = data.get("token", "")
    new_password = data.get("password", "")
    
    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400
    
    if len(new_password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    
    # Verify token
    email = verify_reset_token(token)
    if not email:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    
    # Find user by email
    profile = UserProfile.query.filter_by(email=email).first()
    if not profile:
        return jsonify({"error": "User not found"}), 404
    
    user = User.query.get(profile.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update password
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password has been reset successfully"}), 200

