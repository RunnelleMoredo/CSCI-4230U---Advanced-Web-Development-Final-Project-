import os
import json
import logging
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
from openai import OpenAI
from models import db, User, WorkoutPlan
from auth import auth_bp
from goals import goals_bp
from workout import workout_bp


# ---------------------------------------------------------
# BASIC SETUP
# ---------------------------------------------------------
logging.basicConfig(level=logging.DEBUG)
load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# Init DB + JWT
db.init_app(app)
jwt = JWTManager(app)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(goals_bp)
app.register_blueprint(workout_bp)

# ---------------------------------------------------------
# PAGE ROUTES
# ---------------------------------------------------------
@app.route("/")
def home():
    return render_template("login.html")

@app.route("/main")
def main_page():
    """Level selector page (Beginner / Intermediate)."""
    return render_template("main.html")

@app.route("/main_dashboard")
def main_dashboard():
    """Your original main dashboard with goals/workouts/sessions."""
    return render_template("main_dashboard.html")

@app.route("/ai_workout")
def ai_workout_page():
    """AI workout planner page."""
    return render_template("ai_workout.html")

@app.route("/goals_page")
def goals_page():
    return render_template("goals.html")

@app.route("/session")
def session_page():
    return render_template("session.html")

@app.route("/exercise")
def exercise_page():
    return render_template("exercise.html")

# ---------------------------------------------------------
# AI WORKOUT PLAN ENDPOINTS
# ---------------------------------------------------------
@app.route("/ai/workout-plan", methods=["POST"])
@jwt_required()
def generate_workout_plan():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    goal = data.get("goal")
    experience = data.get("experience")
    days_per_week = data.get("days_per_week")
    equipment = data.get("equipment", "None")
    injuries = data.get("injuries", "None")

    if not all([goal, experience, days_per_week]):
        return jsonify({"error": "goal, experience, and days_per_week are required"}), 400

    prompt = f"""
    You are a professional fitness coach. Create a weekly workout plan in structured JSON.

    User details:
    - Goal: {goal}
    - Experience: {experience}
    - Days per week: {days_per_week}
    - Equipment: {equipment}
    - Injuries: {injuries}

    Format strictly as JSON:
    {{
      "weekly_plan": [
        {{
          "day": "Monday",
          "focus": "Push (Chest/Shoulders/Triceps)",
          "exercises": [
            {{"name": "Push-ups", "sets": 3, "reps": "8–12"}},
            {{"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "8–10"}}
          ],
          "warmup": "5 min brisk walk or dynamic mobility",
          "cooldown": "3 min stretching"
        }}
      ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You are a precise and safe personal trainer."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        raw_content = response.choices[0].message.content
        try:
            plan_json = json.loads(raw_content)
        except json.JSONDecodeError:
            cleaned = raw_content.strip().replace("```json", "").replace("```", "")
            plan_json = json.loads(cleaned)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    plan = WorkoutPlan(
        user_id=user_id,
        goal=goal,
        experience=experience,
        days_per_week=days_per_week,
        equipment=equipment,
        injuries=injuries,
        plan_json=plan_json,
    )
    db.session.add(plan)
    db.session.commit()

    return jsonify({
        "id": plan.id,
        "goal": plan.goal,
        "experience": plan.experience,
        "days_per_week": plan.days_per_week,
        "plan": plan.plan_json,
    }), 201


@app.route("/workout-plans", methods=["GET"])
@jwt_required()
def list_workout_plans():
    user_id = get_jwt_identity()
    plans = (
        WorkoutPlan.query.filter_by(user_id=user_id)
        .order_by(WorkoutPlan.created_at.desc())
        .all()
    )
    return jsonify([
        {
            "id": p.id,
            "goal": p.goal,
            "experience": p.experience,
            "days_per_week": p.days_per_week,
            "equipment": p.equipment,
            "injuries": p.injuries,
            "plan": p.plan_json,
            "created_at": p.created_at.isoformat(),
        }
        for p in plans
    ])


@app.route("/workout-plans/<int:plan_id>", methods=["GET", "PATCH"])
@jwt_required()
def get_or_update_plan(plan_id):
    user_id = get_jwt_identity()
    plan = WorkoutPlan.query.filter_by(id=plan_id, user_id=user_id).first()
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    if request.method == "GET":
        return jsonify({
            "id": plan.id,
            "goal": plan.goal,
            "experience": plan.experience,
            "days_per_week": plan.days_per_week,
            "equipment": plan.equipment,
            "injuries": plan.injuries,
            "plan": plan.plan_json,
        })

    data = request.get_json() or {}
    for field in ["goal", "experience", "days_per_week", "equipment", "injuries", "plan"]:
        if field in data:
            setattr(plan, field if field != "plan" else "plan_json", data[field])

    db.session.commit()
    return jsonify({"message": "Workout plan updated", "id": plan.id})



# ---------------------------------------------------------
# DATABASE INITIALIZATION
# ---------------------------------------------------------
with app.app_context():
    db.create_all()

# ---------------------------------------------------------
# RUN FLASK
# ---------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
