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
