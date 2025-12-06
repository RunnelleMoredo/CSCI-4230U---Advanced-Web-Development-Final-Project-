from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.sqlite import JSON

db = SQLAlchemy()


# ---------------------------------------------------------
# USER MODEL
# ---------------------------------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # Relationships
    goals = db.relationship("Goal", backref="user", lazy=True)
    sessions = db.relationship("Session", backref="user", lazy=True)
    workout_plans = db.relationship("WorkoutPlan", backref="user", lazy=True)
    workouts = db.relationship("Workout", backref="user", lazy=True)  # 🟢 new link

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)


# ---------------------------------------------------------
# GOAL MODEL
# ---------------------------------------------------------
class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)


# ---------------------------------------------------------
# SESSION MODEL
# ---------------------------------------------------------
class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    duration_seconds = db.Column(db.Integer)
    details = db.Column(db.JSON)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)


# ---------------------------------------------------------
# AI WORKOUT PLAN MODEL
# ---------------------------------------------------------
class WorkoutPlan(db.Model):
    __tablename__ = "workout_plans"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    goal = db.Column(db.String(255), nullable=False)
    experience = db.Column(db.String(50), nullable=False)
    days_per_week = db.Column(db.Integer, nullable=False)
    equipment = db.Column(db.String(255))
    injuries = db.Column(db.String(255))
    plan_json = db.Column(JSON, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ---------------------------------------------------------
# REAL WORKOUT MODEL (for saved routines)
# ---------------------------------------------------------
class Workout(db.Model):
    __tablename__ = "workouts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(255))
    sets = db.Column(db.Integer)
    reps = db.Column(db.Integer)
    notes = db.Column(db.Text)
    details = db.Column(db.JSON, nullable=True)  # ✅ Added field for AI workout structure
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ---------------------------------------------------------
# USER PROFILE MODEL
# ---------------------------------------------------------
class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    display_name = db.Column(db.String(100))
    email = db.Column(db.String(255))
    date_of_birth = db.Column(db.Date)
    height_cm = db.Column(db.Float)
    weight_kg = db.Column(db.Float)
    profile_image_url = db.Column(db.Text)  # Can store Base64 or URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship back to user
    user = db.relationship("User", backref=db.backref("profile", uselist=False))


# ---------------------------------------------------------
# SAVED WORKOUT HISTORY MODEL (Server-side storage)
# ---------------------------------------------------------
class SavedWorkoutHistory(db.Model):
    __tablename__ = "saved_workout_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    workout_name = db.Column(db.String(255))
    duration_seconds = db.Column(db.Integer)
    exercises = db.Column(db.JSON)
    progress_photo = db.Column(db.Text)  # Base64 image data
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship back to user
    user = db.relationship("User", backref="saved_history")
