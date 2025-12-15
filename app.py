import os
import json
import logging
from flask import Flask, jsonify, request, render_template, redirect, url_for
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
from openai import OpenAI
from models import db, User, WorkoutPlan
from auth import auth_bp
from workout import workout_bp
from profile import profile_bp
from fatsecret import fatsecret_bp


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
app.register_blueprint(workout_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(fatsecret_bp)


# ---------------------------------------------------------
# PAGE ROUTES
# ---------------------------------------------------------
@app.route("/")
def home():
    return render_template("login.html")


@app.route("/goal_setup")
def goal_setup():
    """Goal setup page after signup."""
    return render_template("goal_setup.html")


@app.route("/fitness_level")
def fitness_level():
    """Page where users pick Beginner or Intermediate."""
    return render_template("fitness_level.html")


@app.route("/main_dashboard")
def main_dashboard():
    """User's main dashboard."""
    return render_template("main_dashboard.html")


@app.route("/ai_workout")
def ai_workout_page():
    """AI workout planner page."""
    return render_template("ai_workout.html")


@app.route("/goals_page")
def goals_page():
    return render_template("goals.html")


@app.route("/calorie_tracker")
def calorie_tracker_page():
    """Calorie tracker page."""
    return render_template("calorie_tracker.html")


@app.route("/calorie_goal")
def calorie_goal_page():
    """Calorie goal setup page."""
    return render_template("calorie_goal.html")


@app.route("/food_search")
def food_search_page():
    """Food search page with CalorieNinjas API."""
    return render_template("food_search.html")


@app.route("/session")
def session_page():
    """Workout session page."""
    return render_template("session.html")


@app.route("/exercise")
def exercise_page():
    return render_template("exercise.html")


@app.route("/profile_page")
def profile_page():
    """User profile page."""
    return render_template("profile.html")


@app.route("/forgot_password")
def forgot_password_page():
    """Forgot password page."""
    return render_template("forgot_password.html")


@app.route("/reset_password")
def reset_password_page():
    """Reset password page."""
    return render_template("reset_password.html")


# ---------------------------------------------------------
# LEGACY REDIRECTS + SESSION COMPLETION
# ---------------------------------------------------------
@app.route("/main")
def redirect_old_main():
    """Redirect old /main URLs to dashboard."""
    return redirect(url_for("main_dashboard"))


@app.route("/session/complete")
def complete_session_redirect():
    """Redirect user to dashboard after completing a session."""
    logging.info("Workout session completed — redirecting to dashboard.")
    return redirect(url_for("main_dashboard"))


# ---------------------------------------------------------
# EXERCISE SEARCH API (External ExerciseDB)
# ---------------------------------------------------------
@app.route("/api/exercises/search", methods=["GET"])
@jwt_required()
def api_exercise_search():
    """Search exercises from ExerciseDB API."""
    import requests as req
    
    query = request.args.get("q", "")
    body_part = request.args.get("bodyPart", "")
    
    if not query and not body_part:
        return jsonify({"error": "Please provide a search query or body part"}), 400
    
    # ExerciseDB API
    EXERCISE_API_URL = "https://www.exercisedb.dev/api/v1/exercises"
    
    try:
        if query:
            url = f"{EXERCISE_API_URL}/search?q={query}"
        elif body_part:
            url = f"{EXERCISE_API_URL}/bodyPart/{body_part}"
        else:
            url = f"{EXERCISE_API_URL}?limit=20"
        
        response = req.get(url, timeout=10)
        
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch exercises from API"}), 500
        
        data = response.json()
        exercises = data.get("data", []) if isinstance(data, dict) else data
        
        # Clean and format the response
        cleaned = [{
            "name": ex.get("name", "Unknown"),
            "bodyPart": ex.get("bodyPart", ex.get("targetMuscles", [""])[0] if ex.get("targetMuscles") else ""),
            "target": ex.get("target", ", ".join(ex.get("targetMuscles", []))),
            "equipment": ex.get("equipment", ", ".join(ex.get("equipments", []))),
            "gifUrl": ex.get("gifUrl", ""),
        } for ex in exercises[:20]]  # Limit to 20 results
        
        return jsonify(cleaned), 200
        
    except Exception as e:
        logging.error(f"Exercise search error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------
# AI WORKOUT PLAN ENDPOINTS
# ---------------------------------------------------------
@app.route("/ai/workout-plan", methods=["POST"])
@jwt_required()
def generate_workout_plan():
    """Generate an AI-powered workout plan and save to DB."""
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


@app.route("/ai/workout-plan/save", methods=["POST"])
@jwt_required()
def save_ai_workout_as_routine():
    """Accepts any AI workout text, parses or reconstructs a structured plan, and saves it."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    raw_plan = data.get("plan")
    user_goal = data.get("goal", "AI Routine")

    # --- 1️⃣ Try to parse as JSON ---
    try:
        if isinstance(raw_plan, str):
            cleaned = (
                raw_plan.strip()
                .replace("```json", "")
                .replace("```", "")
                .replace("“", '"')
                .replace("”", '"')
            )
            parsed = json.loads(cleaned)
        else:
            parsed = raw_plan
    except Exception:
        parsed = None

    # --- 2️⃣ If it’s not JSON, reconstruct from text ---
    if not parsed or not isinstance(parsed, dict):
        lines = raw_plan.splitlines() if isinstance(raw_plan, str) else []
        current_day = None
        weekly_plan = []
        day_block = {}

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect start of a new day
            if any(day in line.lower() for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]):
                if current_day and day_block:
                    weekly_plan.append(day_block)
                    day_block = {}
                current_day = line.split("–")[0].strip()
                day_block = {"day": current_day, "focus": line, "exercises": []}
                continue

            # Detect exercises
            if "•" in line or "-" in line:
                name_part = line.replace("•", "").replace("-", "").strip()
                sets = 3
                reps = "8–12"
                if "(" in name_part and ")" in name_part:
                    inside = name_part[name_part.find("(")+1:name_part.find(")")]
                    name_part = name_part.split("(")[0].strip()
                    sets = 3
                    reps = inside
                day_block["exercises"].append({"name": name_part, "sets": sets, "reps": reps})

            # Detect warmup / cooldown
            if "warmup" in line.lower():
                day_block["warmup"] = line.split(":")[-1].strip()
            if "cooldown" in line.lower():
                day_block["cooldown"] = line.split(":")[-1].strip()

        if current_day and day_block:
            weekly_plan.append(day_block)

        parsed = {"weekly_plan": weekly_plan}

    # --- 3️⃣ Safety check ---
    if not parsed or "weekly_plan" not in parsed:
        return jsonify({"error": "Invalid AI plan format"}), 400

    from models import Workout
    grouped_days = {}
    for day_entry in parsed["weekly_plan"]:
        day = day_entry.get("day", "Unspecified")
        grouped_days.setdefault(day, []).append(day_entry)

    for day, entries in grouped_days.items():
        exercises = []
        for e in entries:
            for ex in e.get("exercises", []):
                exercises.append(
                    {
                        "name": ex.get("name", "Unnamed Exercise"),
                        "sets": ex.get("sets", 3),
                        "reps": ex.get("reps", "8–12"),
                        "category": e.get("focus", "General"),
                        "warmup": e.get("warmup", ""),
                        "cooldown": e.get("cooldown", ""),
                    }
                )

        if not exercises:
            continue

        new_workout = Workout(
            user_id=user_id,
            title=f"{day} Routine",
            category="AI Generated Plan",
            details={"exercises": exercises, "goal": user_goal},
        )
        db.session.add(new_workout)

    db.session.commit()
    return jsonify({"message": "AI plan saved successfully!"}), 201




@app.route("/workout-plans", methods=["GET"])
@jwt_required()
def list_workout_plans():
    """List all saved AI workout plans for the logged-in user."""
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
    """View or edit a specific saved workout plan."""
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
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()
    
    # Only create tables if they don't exist
    if not existing_tables:
        db.create_all()
        print("Database tables created.")
    else:
        # Tables exist, just ensure our models' columns exist
        print(f"Database already has {len(existing_tables)} tables, skipping create_all()")
        
        # --- AUTO MIGRATION FOR MISSING COLUMNS ---
        try:
            from sqlalchemy import text
            
            # Check user_profiles columns
            # This works for both SQLite and PostgreSQL
            # We try to add columns, catch error if they exist (simplest cross-db approach without Alembic)
            
            with db.engine.connect() as conn:
                transaction = conn.begin()
                try:
                    # SQLite syntax is different for ALTER TABLE, but adding columns is standard
                    # However, SQLite handles ADD COLUMN IF NOT EXISTS differently or not at all depending on version
                    # So we use a try-except block for each column
                    
                    columns_to_ensure = [
                        ("gender", "VARCHAR(20) DEFAULT 'male'"),
                        ("goal_type", "VARCHAR(20) DEFAULT 'maintain'"),
                        ("target_weight_kg", "FLOAT"),
                        ("goal_timeline_weeks", "INTEGER"),
                        ("activity_level", "VARCHAR(20) DEFAULT 'moderate'"),
                        ("daily_calorie_target", "INTEGER"),
                        ("goal_set_at", "TIMESTAMP")
                    ]
                    
                    for col_name, col_def in columns_to_ensure:
                        try:
                            # Try to add the column. If it fails, we assume it exists.
                            conn.execute(text(f"ALTER TABLE user_profiles ADD COLUMN {col_name} {col_def}"))
                            print(f"Migrated: Added {col_name} to user_profiles")
                        except Exception as e:
                            # If column exists, DB throws error. We ignore it.
                            pass
                    
                    # Check saved_workout_history columns
                    history_columns = [
                        ("total_volume", "INTEGER DEFAULT 0"),
                        ("total_sets", "INTEGER DEFAULT 0"),
                        ("total_reps", "INTEGER DEFAULT 0")
                    ]
                    
                    for col_name, col_def in history_columns:
                        try:
                            # Try to add the column. If it fails, we assume it exists.
                            conn.execute(text(f"ALTER TABLE saved_workout_history ADD COLUMN {col_name} {col_def}"))
                            print(f"Migrated: Added {col_name} to saved_workout_history")
                        except Exception as e:
                            pass
                            
                    transaction.commit()
                    print("Migration check complete.")
                except Exception as e:
                    transaction.rollback()
                    print(f"Migration error: {e}")
                    
        except Exception as e:
            print(f"Auto-migration failed: {e}")


# ---------------------------------------------------------
# RUN FLASK
# ---------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
