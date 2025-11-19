from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Workout, User

workouts_bp = Blueprint("workouts", __name__, url_prefix="/workouts")

def load_user():
    user_id = get_jwt_identity()
    g.current_user = User.query.get(int(user_id))

@workouts_bp.route("/<day>", methods=["GET"])
@jwt_required()
def get_workouts(day):
    load_user()
    workouts = Workout.query.filter_by(user_id=g.current_user.id, day=day).all()

    return jsonify([
        {
            "id": w.id,
            "exercise": w.exercise,
            "sets": w.sets,
            "reps": w.reps,
            "day": w.day
        } for w in workouts
    ])

@workouts_bp.route("/", methods=["POST"])
@jwt_required()
def create_workout():
    load_user()
    data = request.get_json()

    workout = Workout(
        exercise=data["exercise"],
        sets=data["sets"],
        reps=data["reps"],
        day=data["day"],
        user_id=g.current_user.id
    )

    db.session.add(workout)
    db.session.commit()

    return jsonify({"message": "Workout added successfully!"}), 201

@workouts_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_workout(id):
    load_user()

    workout = Workout.query.filter_by(id=id, user_id=g.current_user.id).first()

    if not workout:
        return jsonify({"error": "Workout not found"}), 404

    db.session.delete(workout)
    db.session.commit()

    return jsonify({"message": "Workout deleted"})
