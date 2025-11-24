import os
import requests
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from auth import auth_bp
from goals import goals_bp
from workout import workout_bp
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
app.register_blueprint(workout_bp)

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

# Exercise Explorer page
@app.route('/exercise')
def exercise_page():
    return render_template('exercise.html')


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
