from flask import jsonify, request, Blueprint, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from schemas import GoalSchema
from models import User, Goal, db

goals_bp = Blueprint("goals", __name__, url_prefix="/goals")
goal_schema = GoalSchema()
goals_schema = GoalSchema(many=True)

def load_user():
    user_id = get_jwt_identity()
    g.current_user = User.query.get(int(user_id))


# CREATE GOAL
@goals_bp.route("/", methods=["POST"])
@jwt_required()
def create_goal():
    load_user()

    data = request.get_json()
    title = data.get("title")
    description = data.get("description")

    if not title:
        return jsonify({"error": "Title is required"}), 400

    goal = Goal(
        title=title,
        description=description,
        user_id=g.current_user.id
    )

    db.session.add(goal)
    db.session.commit()

    return jsonify({
        "message": "Goal created successfully",
        "goal": goal_schema.dump(goal)
    }), 201


# GET ALL GOALS
@goals_bp.route("/", methods=["GET"])
@jwt_required()
def get_goals():
    load_user()
    goals = Goal.query.filter_by(user_id=g.current_user.id).all()
    return jsonify(goals_schema.dump(goals)), 200


# GET GOAL BY ID
@goals_bp.route("/<int:goal_id>", methods=["GET"])
@jwt_required()
def get_goal(goal_id):
    load_user()
    goal = Goal.query.filter_by(id=goal_id, user_id=g.current_user.id).first()

    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    return jsonify(goal_schema.dump(goal)), 200


# UPDATE GOAL
@goals_bp.route("/<int:goal_id>", methods=["PUT"])
@jwt_required()
def update_goal(goal_id):
    load_user()
    goal = Goal.query.filter_by(id=goal_id, user_id=g.current_user.id).first()

    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    data = request.get_json()
    goal.title = data.get("title", goal.title)
    goal.description = data.get("description", goal.description)

    db.session.commit()

    return jsonify({
        "message": "Goal updated successfully",
        "goal": goal_schema.dump(goal)
    }), 200


# DELETE GOAL
@goals_bp.route("/<int:goal_id>", methods=["DELETE"])
@jwt_required()
def delete_goal(goal_id):
    load_user()
    goal = Goal.query.filter_by(id=goal_id, user_id=g.current_user.id).first()

    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    db.session.delete(goal)
    db.session.commit()

    return jsonify({"message": "Goal deleted"}), 200
