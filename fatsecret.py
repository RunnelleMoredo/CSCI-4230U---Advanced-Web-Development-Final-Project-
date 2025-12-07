"""
FatSecret API Integration Module
Handles OAuth 2.0 authentication and food search for calorie tracking.
"""

import os
import time
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserProfile

fatsecret_bp = Blueprint("fatsecret", __name__, url_prefix="/api/food")

# FatSecret API endpoints
FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api"

# Token cache
_token_cache = {
    "access_token": None,
    "expires_at": 0
}


def get_fatsecret_token():
    """Get OAuth 2.0 access token from FatSecret API with caching."""
    global _token_cache
    
    # Check if cached token is still valid
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]
    
    client_id = os.getenv("FATSECRET_CLIENT_ID")
    client_secret = os.getenv("FATSECRET_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        return None
    
    try:
        response = requests.post(
            FATSECRET_TOKEN_URL,
            data={"grant_type": "client_credentials", "scope": "basic"},
            auth=(client_id, client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            _token_cache["access_token"] = data.get("access_token")
            _token_cache["expires_at"] = time.time() + data.get("expires_in", 86400)
            return _token_cache["access_token"]
        else:
            print(f"FatSecret token error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret token exception: {e}")
        return None


@fatsecret_bp.route("/search", methods=["GET"])
@jwt_required()
def search_foods():
    """Search for foods using FatSecret API."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400
    
    token = get_fatsecret_token()
    
    if not token:
        # Fallback to demo data if no API credentials
        return jsonify({
            "foods": [
                {"food_id": "demo1", "food_name": query.title(), "calories": 150, "serving": "1 serving", "protein": 10, "carbs": 20, "fat": 5},
            ],
            "demo_mode": True,
            "message": "FatSecret API not configured. Using demo data."
        }), 200
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            data={
                "method": "foods.search",
                "search_expression": query,
                "format": "json",
                "max_results": 10
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            foods_data = data.get("foods", {}).get("food", [])
            
            # Normalize to list
            if isinstance(foods_data, dict):
                foods_data = [foods_data]
            
            # Parse and format results
            foods = []
            for food in foods_data:
                # Parse the description to extract calories
                description = food.get("food_description", "")
                calories = 0
                protein = 0
                carbs = 0
                fat = 0
                
                # FatSecret format: "Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0.00g | Protein: 31.02g"
                if "Calories:" in description:
                    try:
                        cal_part = description.split("Calories:")[1].split("|")[0]
                        calories = int(float(cal_part.replace("kcal", "").strip()))
                    except:
                        pass
                
                if "Fat:" in description:
                    try:
                        fat_part = description.split("Fat:")[1].split("|")[0]
                        fat = float(fat_part.replace("g", "").strip())
                    except:
                        pass
                
                if "Carbs:" in description:
                    try:
                        carbs_part = description.split("Carbs:")[1].split("|")[0]
                        carbs = float(carbs_part.replace("g", "").strip())
                    except:
                        pass
                
                if "Protein:" in description:
                    try:
                        protein_part = description.split("Protein:")[1].split("|")[0]
                        protein = float(protein_part.replace("g", "").strip())
                    except:
                        pass
                
                foods.append({
                    "food_id": food.get("food_id"),
                    "food_name": food.get("food_name"),
                    "brand": food.get("brand_name", ""),
                    "calories": calories,
                    "protein": protein,
                    "carbs": carbs,
                    "fat": fat,
                    "serving": description.split(" - ")[0] if " - " in description else "1 serving"
                })
            
            return jsonify({"foods": foods}), 200
        else:
            return jsonify({"error": "FatSecret API error", "details": response.text}), 500
            
    except Exception as e:
        print(f"FatSecret search error: {e}")
        return jsonify({"error": str(e)}), 500


@fatsecret_bp.route("/bmr", methods=["GET"])
@jwt_required()
def calculate_bmr():
    """Calculate BMR and daily calorie target based on user profile."""
    user_id = get_jwt_identity()
    
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    if not profile:
        return jsonify({"error": "Profile not found"}), 404
    
    # Get profile data
    weight_kg = profile.weight_kg or 70  # Default 70kg
    height_cm = profile.height_cm or 170  # Default 170cm
    
    # Calculate age from date of birth
    age = 25  # Default age
    if profile.date_of_birth:
        from datetime import date
        today = date.today()
        age = today.year - profile.date_of_birth.year
        if (today.month, today.day) < (profile.date_of_birth.month, profile.date_of_birth.day):
            age -= 1
    
    # Mifflin-St Jeor Equation (using male formula as default, could add gender later)
    # Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    
    # Activity level multipliers
    activity_levels = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    # Default to moderate activity
    activity = request.args.get("activity", "moderate")
    multiplier = activity_levels.get(activity, 1.55)
    
    daily_target = int(bmr * multiplier)
    
    return jsonify({
        "bmr": int(bmr),
        "daily_target": daily_target,
        "activity_level": activity,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "age": age
    }), 200
