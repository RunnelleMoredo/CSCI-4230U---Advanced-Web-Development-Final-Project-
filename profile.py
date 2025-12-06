from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserProfile, SavedWorkoutHistory
from datetime import datetime

# Blueprint setup
profile_bp = Blueprint("profile", __name__, url_prefix="/profile")


# ---------------------------------------------------------
# GET Profile
# ---------------------------------------------------------
@profile_bp.route("", methods=["GET"])
@jwt_required()
def get_profile():
    """Get the current user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    # Auto-create profile if it doesn't exist
    if not profile:
        profile = UserProfile(user_id=user_id, display_name=user.username)
        db.session.add(profile)
        db.session.commit()
    
    return jsonify({
        "id": profile.id,
        "username": user.username,
        "display_name": profile.display_name or user.username,
        "email": profile.email,
        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "profile_image_url": profile.profile_image_url,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }), 200


# ---------------------------------------------------------
# UPDATE Profile
# ---------------------------------------------------------
@profile_bp.route("", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update the current user's profile."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    # Auto-create profile if it doesn't exist
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
    
    # Update fields if provided
    if "display_name" in data:
        profile.display_name = data["display_name"]
    if "email" in data:
        profile.email = data["email"]
    if "date_of_birth" in data:
        try:
            from datetime import date
            profile.date_of_birth = date.fromisoformat(data["date_of_birth"])
        except (ValueError, TypeError):
            pass  # Invalid date format, skip
    if "height_cm" in data:
        profile.height_cm = data["height_cm"]
    if "weight_kg" in data:
        profile.weight_kg = data["weight_kg"]
    if "profile_image_url" in data:
        profile.profile_image_url = data["profile_image_url"]
    
    db.session.commit()
    
    return jsonify({
        "message": "Profile updated successfully",
        "id": profile.id,
    }), 200


# ---------------------------------------------------------
# GET Saved Workout History
# ---------------------------------------------------------
@profile_bp.route("/history", methods=["GET"])
@jwt_required()
def get_saved_history():
    """Get all saved workout history for the current user."""
    user_id = get_jwt_identity()
    
    history = SavedWorkoutHistory.query.filter_by(user_id=user_id).order_by(
        SavedWorkoutHistory.completed_at.desc()
    ).all()
    
    return jsonify([
        {
            "id": h.id,
            "workout_name": h.workout_name,
            "duration_seconds": h.duration_seconds,
            "exercises": h.exercises,
            "progress_photo": h.progress_photo,
            "completed_at": h.completed_at.isoformat() if h.completed_at else None,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history
    ]), 200


# ---------------------------------------------------------
# SAVE Workout to Profile History
# ---------------------------------------------------------
@profile_bp.route("/history", methods=["POST"])
@jwt_required()
def save_to_history():
    """Save a workout session to the user's profile history."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    workout_name = data.get("workout_name", "Workout")
    duration_seconds = data.get("duration_seconds", 0)
    exercises = data.get("exercises", [])
    progress_photo = data.get("progress_photo")
    completed_at_str = data.get("completed_at")
    
    # Parse completed_at if provided
    completed_at = None
    if completed_at_str:
        try:
            completed_at = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00"))
        except ValueError:
            completed_at = datetime.utcnow()
    else:
        completed_at = datetime.utcnow()
    
    history_entry = SavedWorkoutHistory(
        user_id=user_id,
        workout_name=workout_name,
        duration_seconds=duration_seconds,
        exercises=exercises,
        progress_photo=progress_photo,
        completed_at=completed_at,
    )
    
    db.session.add(history_entry)
    db.session.commit()
    
    return jsonify({
        "message": "Workout saved to profile",
        "id": history_entry.id,
    }), 201


# ---------------------------------------------------------
# DELETE Saved Workout History Entry
# ---------------------------------------------------------
@profile_bp.route("/history/<int:history_id>", methods=["DELETE"])
@jwt_required()
def delete_history_entry(history_id):
    """Delete a saved workout history entry."""
    user_id = get_jwt_identity()
    
    entry = SavedWorkoutHistory.query.filter_by(
        id=history_id, user_id=user_id
    ).first()
    
    if not entry:
        return jsonify({"error": "History entry not found"}), 404
    
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({"message": "History entry deleted"}), 200
