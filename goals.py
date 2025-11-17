from flask import jsonify, request, Blueprint, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from schemas import GoalSchema
from models import User, Goal, db

goals_bp = Blueprint("goals", __name__, url_prefix="/goals")
goal_schema = GoalSchema()

def load_user():
    user_id = get_jwt_identity()
    g.current_user = User.query.get(int(user_id))
    

#Create new Goal
@goals_bp.route("/", methods=["POST"])
@jwt_required()
def create_goal():
    
    try:
        load_user()
    except Exception as e:
        return jsonify({"error": "Could not load current user"}), 400
    
    data = request.get_json()
    title = data.get("title")
    description = data.get("description")
    
    goal = Goal(title=title, description=description, user_id=g.current_user.id)
    db.session.add(goal)
    db.session.commit()
    
    return jsonify({
    "message": "Goal created successfully",
    "goal": {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description
        }
    }), 201



#GET Goal
# @goals_bp.route("/", methods=["GET"])
# @jwt_required