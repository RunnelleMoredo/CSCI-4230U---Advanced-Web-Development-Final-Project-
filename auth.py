from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from schemas import UserSchema
from marshmallow import ValidationError

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
user_schema = UserSchema()

@auth_bp.route('/signup', methods=['POST'])
def signup():
    
    try:
        data = user_schema.load(request.json)
    except ValidationError as error:
        return jsonify({"error": "Validation Failed", "messages": error.messages}), 400

    username = data.get("username")
    password = data.get("password")

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "user already exists"}), 409
    
    new_user = User(username=username)
    new_user.set_password(password)
    
    try:
        db.session.add(new_user)
        db.session.commit()    
        return jsonify({"message": "User created successfully"}), 201
    
    except Exception as e:
        return jsonify({"error": "failed to create user"}), 500
        

    
@auth_bp.route('/login', methods=['POST'])
def login():
    
    try:
        data = user_schema.load(request.json)
    except ValidationError as error:
        return jsonify({"error": "Validation Failed", "messages": error.messages}), 400
    
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.verify_password(password):
        return jsonify({"error": "Incorrect username or password"}), 401
    
    try:
        access_token = create_access_token(identity=str(user.id)) 
        return jsonify({"message": "Login successful", "access_token": access_token}), 200
    
    except Exception as e:
        return jsonify({"error": "login failed"}), 500

    
#JUST FOR TESTING PURPOSES
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    return jsonify({"id": user.id, "username": user.username})