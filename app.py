import os
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from auth import auth_bp
from models import db

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")

db.init_app(app)
jwt = JWTManager(app)

app.register_blueprint(auth_bp)

@app.route('/')
def home():
    return render_template('login.html')

@app.route('/main')
def main_page():
    return render_template('main.html')

with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True)