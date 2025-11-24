from flask import jsonify, request, Blueprint, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Session, db
from schemas import SessionSchema
import requests

EXERCISE_API_URL = "https://www.exercisedb.dev/api/v1/exercises"
TARGET_MUSCLE_URL = "https://www.exercisedb.dev/api/v1/bodyparts"

workout_bp = Blueprint("workout", __name__, url_prefix="/workout")
session_schema = SessionSchema()

def load_user():
    user_id = get_jwt_identity()
    g.current_user = User.query.get(int(user_id))

# @workout_bp.route("/", methods=["GET"])
# def get_target_muscles():
    
#     response = requests.get(EXERCISE_API_URL)

#     if response.status_code != 200:
#         return jsonify({"error": "Failed to fetch data"}), 500

#     data = response.json()
#     return jsonify(data), 200

# @workout_bp.route("/<bodyPartName>/exercises", methods=["GET"])
# def get_workouts(bodyPartName):
    
#     url = f"{TARGET_MUSCLE_URL}/{bodyPartName}/exercises"
#     response = requests.get(url)
    
#     if response.status_code != 200:
#         return jsonify({"error": "Failed to fetch data"}), 500

#     data = response.json()
    
#     cleaned_data = [{
#         'name': exercise.get('name'),
#         'equipments': exercise.get('equipments'),
#         'instructions': exercise.get('instructions'),
#         'secondaryMuscles': exercise.get('secondaryMuscles'),
#         'gifUrl': exercise.get('gifUrl')
#     } for exercise in data.get('data', [])]
    
#     return jsonify(cleaned_data), 200

@workout_bp.route("/search", methods=["GET"])
@jwt_required()
def search_workout():
    
    try:
        load_user()
    except:
        return jsonify({"error": "Could not load current user"}), 400
    
    query = request.args.get('q')
    
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400
    
    url = f"{EXERCISE_API_URL}/search?q={query}"
    response = requests.get(url)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch data"}), 500

    data = response.json()
    
    cleaned_data = [{
        'name': exercise.get('name'),
        'equipments': exercise.get('equipments'),
        'instructions': exercise.get('instructions'),
        'targetMuscles': exercise.get('targetMuscles'),
        'secondaryMuscles': exercise.get('secondaryMuscles'),
        'gifUrl': exercise.get('gifUrl')
    } for exercise in data.get('data', [])]
    
    return jsonify(cleaned_data), 200


@workout_bp.route("/session", methods=["POST"])
@jwt_required()
def save_session():
    
    try:
        load_user()
    except:
        return jsonify({"error": "Could not load current user"}), 400
    
    data = request.get_json()
    
    session = Session(
        user_id=g.current_user.id,
        duration_seconds=data.get("durationSeconds", 0),
        details=data.get("exercises", [])
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({"message": "Session Saved"}), 201