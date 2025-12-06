from flask import jsonify, request, Blueprint, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Workout, WorkoutPlan, Session
from schemas import SessionSchema
import requests

# External ExerciseDB API URLs
EXERCISE_API_URL = "https://www.exercisedb.dev/api/v1/exercises"

# Blueprint setup
workout_bp = Blueprint("workout", __name__, url_prefix="/workout")
session_schema = SessionSchema()


# ---------------------------------------------------------
# Helper: Load current user
# ---------------------------------------------------------
def load_user():
    user_id = get_jwt_identity()
    g.current_user = User.query.get(int(user_id))


# ---------------------------------------------------------
# Get all workouts (manual + AI)
# ---------------------------------------------------------
@workout_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_workouts():
    """Return all workouts for this user — manual and AI-generated."""
    user_id = get_jwt_identity()
    workouts = Workout.query.filter_by(user_id=user_id).order_by(Workout.id.desc()).all()

    output = []
    for w in workouts:
        details = w.details or {}
        exercises = details.get("exercises", [])
        output.append({
            "id": w.id,
            "title": w.title or "Workout",
            "category": w.category or "General",
            "sets": w.sets or (exercises[0].get("sets") if exercises else None),
            "reps": w.reps or (exercises[0].get("reps") if exercises else None),
            "details": details,
            "notes": w.notes or "",
        })
    return jsonify(output), 200


# ---------------------------------------------------------
# Get one workout by ID
# ---------------------------------------------------------
@workout_bp.route("/<int:workout_id>", methods=["GET"])
@jwt_required()
def get_workout_by_id(workout_id):
    """Return a specific workout with its exercises."""
    user_id = get_jwt_identity()
    workout = Workout.query.filter_by(id=workout_id, user_id=user_id).first()
    if not workout:
        return jsonify({"error": "Workout not found"}), 404

    details = workout.details or {}
    return jsonify({
        "id": workout.id,
        "title": workout.title,
        "category": workout.category or "General",
        "details": details,
        "sets": workout.sets,
        "reps": workout.reps,
    }), 200

@workout_bp.route("/<int:workout_id>", methods=["DELETE"])
@jwt_required()
def delete_workout(workout_id):
    """Allow users to delete manual or AI workouts."""
    user_id = get_jwt_identity()
    workout = Workout.query.filter_by(id=workout_id, user_id=user_id).first()

    if not workout:
        return jsonify({"error": "Workout not found"}), 404

    db.session.delete(workout)
    db.session.commit()
    return jsonify({"message": "Workout deleted successfully"}), 200

# ---------------------------------------------------------
# Convert & Save AI workout plan to grouped daily workouts
# ---------------------------------------------------------
@workout_bp.route("/ai/workout-plan/save", methods=["POST"])
@jwt_required()
def save_ai_workout_as_routine():
    """Convert AI weekly plan into one grouped workout per day."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    plan_id = data.get("plan_id")
    if not plan_id:
        return jsonify({"error": "Missing plan_id"}), 400

    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first()
    if not plan:
        return jsonify({"error": "Invalid AI plan ID"}), 400

    weekly_plan = plan.plan_json.get("weekly_plan", [])
    if not weekly_plan:
        return jsonify({"error": "No exercises found in plan"}), 400

    # Create grouped workouts per day
    for day in weekly_plan:
        exercises = []
        for ex in day.get("exercises", []):
            exercises.append({
                "name": ex.get("name"),
                "sets": ex.get("sets", 3),
                "reps": ex.get("reps", 8),
            })

        new_workout = Workout(
            user_id=user_id,
            title=f"{day.get('day', 'Workout')} - {day.get('focus', '')}",
            category="AI Generated Plan",
            sets=len(exercises),
            reps=sum(int(ex.get("reps", 8)) if str(ex.get("reps", '')).isdigit() else 8 for ex in exercises),
            details={"exercises": exercises},  # ✅ now valid JSON
            notes="Auto-created from AI plan",
        )
        db.session.add(new_workout)

    db.session.commit()
    return jsonify({"message": "AI routine saved successfully!"}), 201




# ---------------------------------------------------------
# Exercise Search (External API)
# ---------------------------------------------------------
@workout_bp.route("/search", methods=["GET"])
@jwt_required()
def search_workout():
    """Search exercises from the external ExerciseDB API."""
    try:
        load_user()
    except Exception:
        return jsonify({"error": "Could not load current user"}), 400

    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400

    url = f"{EXERCISE_API_URL}/search?q={query}"
    response = requests.get(url)

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch exercises"}), 500

    data = response.json()

    cleaned_data = [{
        "name": ex.get("name"),
        "equipments": ex.get("equipments"),
        "instructions": ex.get("instructions"),
        "targetMuscles": ex.get("targetMuscles"),
        "secondaryMuscles": ex.get("secondaryMuscles"),
        "gifUrl": ex.get("gifUrl"),
    } for ex in data.get("data", [])]

    return jsonify(cleaned_data), 200


# ---------------------------------------------------------
# Save workout session (manual or AI)
# ---------------------------------------------------------
@workout_bp.route("/session", methods=["POST"])
@jwt_required()
def save_session():
    """Save a user's completed session."""
    try:
        load_user()
    except Exception:
        return jsonify({"error": "Could not load current user"}), 400

    data = request.get_json() or {}
    session = Session(
        user_id=g.current_user.id,
        duration_seconds=data.get("durationSeconds", 0),
        details=data.get("exercises", []),
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({"message": "Session saved successfully"}), 201
