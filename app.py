import os
import requests
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from auth import auth_bp
from goals import goals_bp
from workouts import workouts_bp
from models import db

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")

# Init DB + JWT
db.init_app(app)
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(goals_bp)
app.register_blueprint(workouts_bp)

# ================================
# PAGE ROUTES
# ================================

@app.route('/')
def home():
    return render_template('login.html')

@app.route('/main')
def main_page():
    return render_template('main.html')

@app.route('/goals_page')
def goals_page():
    return render_template('goals.html')

@app.route('/session')
def session_page():
    return render_template('session.html')

# NEW: Exercise Explorer page
@app.route('/exercise')
def exercise_page():
    return render_template('exercise.html')


# ================================
# EXERCISE SEARCH API (No API Key)
# ================================
@app.route("/api/exercises/search")
def exercise_search():
    query = request.args.get("q", "").strip().lower()
    body_part = request.args.get("bodyPart", "").strip().lower()

    BASE = "https://exercisedb-api.vercel.app/api/v1/exercises"

    # Build correct API endpoint
    if query:
        url = f"{BASE}/name/{query}"
    elif body_part and body_part != "all":
        url = f"{BASE}/bodyPart/{body_part}"
    else:
        url = BASE

    print("FETCH →", url)

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print("API ERROR:", e)
        return jsonify({"error": "Failed to load exercises"}), 500

    return jsonify(data[:20])





# ================================
# DB Create Tables
# ================================
with app.app_context():
    db.create_all()


# ================================
# RUN FLASK
# ================================
if __name__ == "__main__":
    app.run(debug=True)
