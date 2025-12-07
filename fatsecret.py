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


# Built-in food database for fallback when API is unavailable
FALLBACK_FOODS = [
    {"food_id": "f1", "food_name": "Chicken Breast (grilled)", "calories": 165, "serving": "100g", "protein": 31, "carbs": 0, "fat": 3.6},
    {"food_id": "f2", "food_name": "Chicken Thigh", "calories": 209, "serving": "100g", "protein": 26, "carbs": 0, "fat": 11},
    {"food_id": "f3", "food_name": "Salmon (baked)", "calories": 208, "serving": "100g", "protein": 20, "carbs": 0, "fat": 13},
    {"food_id": "f4", "food_name": "Egg (large, boiled)", "calories": 78, "serving": "1 egg", "protein": 6, "carbs": 0.6, "fat": 5},
    {"food_id": "f5", "food_name": "Rice (white, cooked)", "calories": 130, "serving": "100g", "protein": 2.7, "carbs": 28, "fat": 0.3},
    {"food_id": "f6", "food_name": "Rice (brown, cooked)", "calories": 112, "serving": "100g", "protein": 2.6, "carbs": 24, "fat": 0.9},
    {"food_id": "f7", "food_name": "Bread (white, 1 slice)", "calories": 79, "serving": "1 slice", "protein": 2.7, "carbs": 15, "fat": 1},
    {"food_id": "f8", "food_name": "Bread (whole wheat)", "calories": 81, "serving": "1 slice", "protein": 4, "carbs": 14, "fat": 1},
    {"food_id": "f9", "food_name": "Pasta (cooked)", "calories": 131, "serving": "100g", "protein": 5, "carbs": 25, "fat": 1.1},
    {"food_id": "f10", "food_name": "Oatmeal (cooked)", "calories": 71, "serving": "100g", "protein": 2.5, "carbs": 12, "fat": 1.5},
    {"food_id": "f11", "food_name": "Banana", "calories": 89, "serving": "1 medium", "protein": 1.1, "carbs": 23, "fat": 0.3},
    {"food_id": "f12", "food_name": "Apple", "calories": 52, "serving": "1 medium", "protein": 0.3, "carbs": 14, "fat": 0.2},
    {"food_id": "f13", "food_name": "Orange", "calories": 47, "serving": "1 medium", "protein": 0.9, "carbs": 12, "fat": 0.1},
    {"food_id": "f14", "food_name": "Strawberries", "calories": 32, "serving": "100g", "protein": 0.7, "carbs": 8, "fat": 0.3},
    {"food_id": "f15", "food_name": "Blueberries", "calories": 57, "serving": "100g", "protein": 0.7, "carbs": 14, "fat": 0.3},
    {"food_id": "f16", "food_name": "Broccoli", "calories": 34, "serving": "100g", "protein": 2.8, "carbs": 7, "fat": 0.4},
    {"food_id": "f17", "food_name": "Spinach", "calories": 23, "serving": "100g", "protein": 2.9, "carbs": 3.6, "fat": 0.4},
    {"food_id": "f18", "food_name": "Sweet Potato", "calories": 86, "serving": "100g", "protein": 1.6, "carbs": 20, "fat": 0.1},
    {"food_id": "f19", "food_name": "Potato (baked)", "calories": 93, "serving": "100g", "protein": 2.5, "carbs": 21, "fat": 0.1},
    {"food_id": "f20", "food_name": "Avocado", "calories": 160, "serving": "100g", "protein": 2, "carbs": 9, "fat": 15},
    {"food_id": "f21", "food_name": "Greek Yogurt", "calories": 100, "serving": "170g", "protein": 17, "carbs": 6, "fat": 0.7},
    {"food_id": "f22", "food_name": "Milk (whole)", "calories": 149, "serving": "1 cup", "protein": 8, "carbs": 12, "fat": 8},
    {"food_id": "f23", "food_name": "Milk (skim)", "calories": 83, "serving": "1 cup", "protein": 8, "carbs": 12, "fat": 0.2},
    {"food_id": "f24", "food_name": "Cheese (cheddar)", "calories": 113, "serving": "1 oz", "protein": 7, "carbs": 0.4, "fat": 9},
    {"food_id": "f25", "food_name": "Peanut Butter", "calories": 94, "serving": "1 tbsp", "protein": 4, "carbs": 3, "fat": 8},
    {"food_id": "f26", "food_name": "Almonds", "calories": 164, "serving": "1 oz", "protein": 6, "carbs": 6, "fat": 14},
    {"food_id": "f27", "food_name": "Beef (ground, lean)", "calories": 250, "serving": "100g", "protein": 26, "carbs": 0, "fat": 15},
    {"food_id": "f28", "food_name": "Steak (sirloin)", "calories": 271, "serving": "100g", "protein": 26, "carbs": 0, "fat": 18},
    {"food_id": "f29", "food_name": "Turkey Breast", "calories": 135, "serving": "100g", "protein": 30, "carbs": 0, "fat": 1},
    {"food_id": "f30", "food_name": "Tuna (canned)", "calories": 116, "serving": "100g", "protein": 26, "carbs": 0, "fat": 1},
    {"food_id": "f31", "food_name": "Shrimp", "calories": 99, "serving": "100g", "protein": 24, "carbs": 0.2, "fat": 0.3},
    {"food_id": "f32", "food_name": "Butter Chicken", "calories": 210, "serving": "100g", "protein": 12, "carbs": 8, "fat": 14},
    {"food_id": "f33", "food_name": "Pizza (cheese)", "calories": 266, "serving": "1 slice", "protein": 11, "carbs": 33, "fat": 10},
    {"food_id": "f34", "food_name": "Burger (beef)", "calories": 295, "serving": "1 patty", "protein": 17, "carbs": 24, "fat": 14},
    {"food_id": "f35", "food_name": "French Fries", "calories": 312, "serving": "100g", "protein": 3.4, "carbs": 41, "fat": 15},
    {"food_id": "f36", "food_name": "Ice Cream (vanilla)", "calories": 137, "serving": "1/2 cup", "protein": 2, "carbs": 16, "fat": 7},
    {"food_id": "f37", "food_name": "Chocolate (dark)", "calories": 155, "serving": "1 oz", "protein": 1.4, "carbs": 17, "fat": 9},
    {"food_id": "f38", "food_name": "Coffee (black)", "calories": 2, "serving": "1 cup", "protein": 0.3, "carbs": 0, "fat": 0},
    {"food_id": "f39", "food_name": "Orange Juice", "calories": 112, "serving": "1 cup", "protein": 1.7, "carbs": 26, "fat": 0.5},
    {"food_id": "f40", "food_name": "Protein Shake", "calories": 150, "serving": "1 scoop", "protein": 25, "carbs": 5, "fat": 2},
]

def search_fallback_foods(query):
    """Search the built-in food database."""
    query_lower = query.lower()
    results = []
    for food in FALLBACK_FOODS:
        if query_lower in food["food_name"].lower():
            results.append(food)
    return results[:10]  # Limit to 10 results


@fatsecret_bp.route("/search", methods=["GET"])
@jwt_required()
def search_foods():
    """Search for foods using FatSecret API with fallback to built-in database."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400
    
    token = get_fatsecret_token()
    
    # Try FatSecret API first if we have a token
    if token:
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
                print(f"FatSecret raw response: {data}")  # Debug log
                
                # Check if we got an error response - fall back to local database
                if "error" in data:
                    print(f"FatSecret API error: {data['error']} - using fallback database")
                    # Fall through to fallback below
                else:
                    foods_data = data.get("foods", {}).get("food", [])
                    
                    # Normalize to list
                    if isinstance(foods_data, dict):
                        foods_data = [foods_data]
                    
                    if foods_data:  # Only return if we got results
                        # Parse and format results
                        foods = []
                        for food in foods_data:
                            description = food.get("food_description", "")
                            calories = 0
                            protein = 0
                            carbs = 0
                            fat = 0
                            
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
                        
        except Exception as e:
            print(f"FatSecret search error: {e} - using fallback database")
    
    # Fallback to built-in food database
    fallback_results = search_fallback_foods(query)
    if fallback_results:
        return jsonify({"foods": fallback_results, "source": "fallback", "is_fallback": True}), 200
    
    # If no fallback results, return empty
    return jsonify({"foods": [], "message": f"No foods found for '{query}'", "is_fallback": True}), 200


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
