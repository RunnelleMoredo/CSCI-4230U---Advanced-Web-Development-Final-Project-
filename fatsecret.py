"""
Food API Integration Module
Supports CalorieNinjas (primary) and USDA FoodData Central (fallback).
"""

import os
import time
import json
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, UserProfile

fatsecret_bp = Blueprint("fatsecret", __name__, url_prefix="/api/food")

# CalorieNinjas API (Primary - accurate nutrition data)
CALORIENINJAS_API_URL = "https://api.calorieninjas.com/v1/nutrition"

# USDA FoodData Central API (Fallback)
USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")

# FatSecret API endpoints (Backup)
FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api"

# Token cache for FatSecret
_token_cache = {
    "access_token": None,
    "expires_at": 0
}

# OpenAI API for AI estimation (when no database match found)
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# TheMealDB API for recipe browsing
MEALDB_API_URL = "https://www.themealdb.com/api/json/v1/1"


def estimate_nutrition_with_ai(food_query):
    """Use OpenAI to estimate nutrition for foods not found in database."""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("OpenAI API key not configured")
        return None
    
    prompt = f"""You are a nutrition expert. Estimate the nutritional information for: "{food_query}"

Provide your best estimate based on typical recipes, portion sizes, and ingredients.
If this is a restaurant dish, base it on typical restaurant portions.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
    "food_name": "Name of the food",
    "calories": 0,
    "protein": 0.0,
    "carbs": 0.0,
    "fat": 0.0,
    "serving": "typical serving description",
    "confidence": "high/medium/low",
    "notes": "Brief note about assumptions made"
}}

Be realistic with calorie estimates. A typical fast food meal is 800-1200 calories. A salad is 150-400 calories."""

    try:
        response = requests.post(
            OPENAI_API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a nutrition expert that returns only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 500
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Clean up the response (remove markdown code blocks if present)
            text = text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            text = text.strip()
            
            # Parse JSON
            nutrition_data = json.loads(text)
            
            return [{
                "food_name": nutrition_data.get("food_name", food_query.title()),
                "calories": round(nutrition_data.get("calories", 0)),
                "protein": round(float(nutrition_data.get("protein", 0)), 1),
                "carbs": round(float(nutrition_data.get("carbs", 0)), 1),
                "fat": round(float(nutrition_data.get("fat", 0)), 1),
                "serving": nutrition_data.get("serving", "1 serving"),
                "source": "ai_estimate",
                "confidence": nutrition_data.get("confidence", "medium"),
                "notes": nutrition_data.get("notes", "AI-estimated values")
            }]
        else:
            print(f"OpenAI API error: {response.status_code} - {response.text}")
            
    except json.JSONDecodeError as e:
        print(f"OpenAI JSON parse error: {e}")
    except Exception as e:
        print(f"OpenAI estimation error: {e}")
    
    return None


def search_calorieninjas(query, max_results=5):
    """Search foods using CalorieNinjas API."""
    api_key = os.getenv("CALORIENINJAS_API_KEY")
    
    if not api_key:
        print("CalorieNinjas API key not configured")
        return None
    
    try:
        response = requests.get(
            CALORIENINJAS_API_URL,
            params={"query": query},
            headers={"X-Api-Key": api_key},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            foods = []
            
            for item in data.get("items", [])[:max_results]:
                foods.append({
                    "food_name": item.get("name", query).title(),
                    "calories": round(item.get("calories", 0)),
                    "protein": round(item.get("protein_g", 0), 1),
                    "carbs": round(item.get("carbohydrates_total_g", 0), 1),
                    "fat": round(item.get("fat_total_g", 0), 1),
                    "fiber": round(item.get("fiber_g", 0), 1),
                    "sugar": round(item.get("sugar_g", 0), 1),
                    "serving": item.get("serving_size_g", 100),
                    "source": "calorieninjas"
                })
            
            if foods:
                print(f"CalorieNinjas returned {len(foods)} results for '{query}'")
                return foods
        else:
            print(f"CalorieNinjas API error: {response.status_code}")
            
    except Exception as e:
        print(f"CalorieNinjas search error: {e}")
    
    return None


def search_usda_foods(query, max_results=10):
    """Search foods using USDA FoodData Central API."""
    api_key = os.getenv("USDA_API_KEY", "DEMO_KEY")
    
    try:
        response = requests.get(
            USDA_API_URL,
            params={
                "api_key": api_key,
                "query": query,
                "pageSize": max_results,
                "dataType": ["Survey (FNDDS)", "Foundation", "SR Legacy", "Branded"]
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            foods = []
            
            for food in data.get("foods", [])[:max_results]:
                # Extract nutrients
                nutrients = {n.get("nutrientName", ""): n.get("value", 0) for n in food.get("foodNutrients", [])}
                
                calories = nutrients.get("Energy", 0)
                protein = nutrients.get("Protein", 0)
                fat = nutrients.get("Total lipid (fat)", 0)
                carbs = nutrients.get("Carbohydrate, by difference", 0)
                
                foods.append({
                    "food_id": food.get("fdcId"),
                    "food_name": food.get("description", "Unknown"),
                    "brand": food.get("brandOwner", ""),
                    "calories": round(calories),
                    "protein": round(protein, 1),
                    "carbs": round(carbs, 1),
                    "fat": round(fat, 1),
                    "serving": "100g"
                })
            
            return foods
        else:
            print(f"USDA API error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"USDA API exception: {e}")
        return None


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
            data={"grant_type": "client_credentials", "scope": "premier barcode nlp"},
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


# ============================================
# FatSecret Premier API Functions
# ============================================

def search_fatsecret_foods(query, max_results=20):
    """Search foods using FatSecret foods.search.v4 API."""
    token = get_fatsecret_token()
    if not token:
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "foods.search.v4",
                "search_expression": query,
                "max_results": max_results,
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            foods = data.get("foods_search", {}).get("results", {}).get("food", [])
            if isinstance(foods, dict):
                foods = [foods]
            return foods
        else:
            print(f"FatSecret search error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret search exception: {e}")
        return None


def get_food_by_barcode(barcode):
    """Get food by barcode using FatSecret food.find_id_for_barcode.v2 API."""
    token = get_fatsecret_token()
    if not token:
        print("FatSecret barcode: No token available")
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "food.find_id_for_barcode.v2",
                "barcode": barcode,
                "format": "json"
            }
        )
        
        print(f"FatSecret barcode response status: {response.status_code}")
        print(f"FatSecret barcode response: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            # Check multiple possible response formats
            food_id = None
            if "food_id" in data:
                food_id_obj = data.get("food_id")
                if isinstance(food_id_obj, dict):
                    food_id = food_id_obj.get("value")
                else:
                    food_id = food_id_obj
            
            print(f"FatSecret barcode food_id: {food_id}")
            
            if food_id:
                # Now get the full food details
                return get_food_by_id(food_id)
            
            # Check for error in response
            if "error" in data:
                print(f"FatSecret barcode API error: {data.get('error')}")
            
            return None
        else:
            print(f"FatSecret barcode error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret barcode exception: {e}")
        return None


def get_food_by_id(food_id):
    """Get food details by ID using FatSecret food.get.v4 API."""
    token = get_fatsecret_token()
    if not token:
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "food.get.v4",
                "food_id": food_id,
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("food")
        else:
            print(f"FatSecret food.get error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret food.get exception: {e}")
        return None


def get_fatsecret_autocomplete(query, max_results=10):
    """Get autocomplete suggestions using FatSecret foods.autocomplete.v2 API."""
    token = get_fatsecret_token()
    if not token:
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "foods.autocomplete.v2",
                "expression": query,
                "max_results": max_results,
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            suggestions = data.get("suggestions", {}).get("suggestion", [])
            if isinstance(suggestions, str):
                suggestions = [suggestions]
            return suggestions
        else:
            print(f"FatSecret autocomplete error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret autocomplete exception: {e}")
        return None


def search_fatsecret_nlp(text_input):
    """Search foods using FatSecret NLP (Natural Language Processing) API.
    
    This API can understand natural language like:
    - "2 eggs and a glass of milk"
    - "large coffee with cream"
    - "chicken breast 200g with rice"
    """
    token = get_fatsecret_token()
    if not token:
        print("FatSecret NLP: No token available")
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "natural_language.get",
                "text": text_input,
                "format": "json"
            }
        )
        
        print(f"FatSecret NLP response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            foods = data.get("natural_language", {}).get("foods", {}).get("food", [])
            if isinstance(foods, dict):
                foods = [foods]
            return foods
        else:
            print(f"FatSecret NLP error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret NLP exception: {e}")
        return None


def get_fatsecret_categories():
    """Get food categories using FatSecret food_categories.get.v2 API."""
    token = get_fatsecret_token()
    if not token:
        return None
    
    try:
        response = requests.post(
            FATSECRET_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "method": "food_categories.get.v2",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            categories = data.get("food_categories", {}).get("food_category", [])
            return categories
        else:
            print(f"FatSecret categories error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FatSecret categories exception: {e}")
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
    """Search for foods using USDA API (primary) with fallback to local database."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400
    
    # Try USDA FoodData Central API first (free, no IP restrictions)
    usda_results = search_usda_foods(query)
    if usda_results:
        print(f"USDA API returned {len(usda_results)} results for '{query}'")
        return jsonify({"foods": usda_results, "source": "usda"}), 200
    
    # Fallback to built-in food database
    print(f"USDA API failed, using fallback for '{query}'")
    fallback_results = search_fallback_foods(query)
    if fallback_results:
        return jsonify({"foods": fallback_results, "source": "fallback", "is_fallback": True}), 200
    
    # If no results at all
    return jsonify({"foods": [], "message": f"No foods found for '{query}'", "is_fallback": True}), 200


# ============================================
# FatSecret Premier API Endpoints
# ============================================

@fatsecret_bp.route("/fatsecret-search", methods=["GET"])
@jwt_required()
def fatsecret_search():
    """Search foods using FatSecret Premier foods.search.v4 API."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing search query ?q="}), 400
    
    foods = search_fatsecret_foods(query)
    
    if foods:
        # Format the results for frontend consumption
        formatted_foods = []
        for food in foods:
            # Get the first serving info
            servings = food.get("servings", {}).get("serving", [])
            if isinstance(servings, dict):
                servings = [servings]
            
            serving = servings[0] if servings else {}
            
            formatted_foods.append({
                "food_id": food.get("food_id"),
                "food_name": food.get("food_name"),
                "brand_name": food.get("brand_name", ""),
                "food_type": food.get("food_type", ""),
                "calories": float(serving.get("calories", 0)) if serving else 0,
                "protein": float(serving.get("protein", 0)) if serving else 0,
                "carbs": float(serving.get("carbohydrate", 0)) if serving else 0,
                "fat": float(serving.get("fat", 0)) if serving else 0,
                "serving": serving.get("serving_description", "1 serving") if serving else "1 serving",
                "serving_id": serving.get("serving_id") if serving else None,
            })
        
        return jsonify({
            "success": True,
            "foods": formatted_foods,
            "source": "fatsecret",
            "count": len(formatted_foods)
        }), 200
    
    return jsonify({
        "success": False,
        "error": "No results found or FatSecret API unavailable",
        "foods": []
    }), 200


@fatsecret_bp.route("/barcode/<barcode>", methods=["GET"])
@jwt_required()
def barcode_lookup(barcode):
    """Look up food by barcode using FatSecret Premier API."""
    if not barcode or len(barcode) < 8:
        return jsonify({"error": "Invalid barcode"}), 400
    
    food = get_food_by_barcode(barcode)
    
    if food:
        # Get the first serving info
        servings = food.get("servings", {}).get("serving", [])
        if isinstance(servings, dict):
            servings = [servings]
        
        serving = servings[0] if servings else {}
        
        formatted_food = {
            "food_id": food.get("food_id"),
            "food_name": food.get("food_name"),
            "brand_name": food.get("brand_name", ""),
            "food_type": food.get("food_type", ""),
            "calories": float(serving.get("calories", 0)) if serving else 0,
            "protein": float(serving.get("protein", 0)) if serving else 0,
            "carbs": float(serving.get("carbohydrate", 0)) if serving else 0,
            "fat": float(serving.get("fat", 0)) if serving else 0,
            "serving": serving.get("serving_description", "1 serving") if serving else "1 serving",
            "serving_id": serving.get("serving_id") if serving else None,
            "all_servings": [
                {
                    "serving_id": s.get("serving_id"),
                    "serving_description": s.get("serving_description"),
                    "calories": float(s.get("calories", 0)),
                    "protein": float(s.get("protein", 0)),
                    "carbs": float(s.get("carbohydrate", 0)),
                    "fat": float(s.get("fat", 0)),
                }
                for s in servings
            ]
        }
        
        return jsonify({
            "success": True,
            "food": formatted_food,
            "barcode": barcode
        }), 200
    
    return jsonify({
        "success": False,
        "error": f"No food found for barcode {barcode}",
        "barcode": barcode
    }), 404


@fatsecret_bp.route("/autocomplete", methods=["GET"])
@jwt_required()
def autocomplete():
    """Get autocomplete suggestions using FatSecret Premier API."""
    query = request.args.get("q", "").strip()
    if not query or len(query) < 2:
        return jsonify({"suggestions": []}), 200
    
    suggestions = get_fatsecret_autocomplete(query)
    
    if suggestions:
        return jsonify({
            "success": True,
            "suggestions": suggestions,
            "query": query
        }), 200
    
    return jsonify({
        "success": False,
        "suggestions": [],
        "query": query
    }), 200


@fatsecret_bp.route("/test-fatsecret", methods=["GET"])
@jwt_required()
def test_fatsecret():
    """Test FatSecret API connection and credentials."""
    import os
    
    client_id = os.getenv("FATSECRET_CLIENT_ID")
    client_secret = os.getenv("FATSECRET_CLIENT_SECRET")
    
    results = {
        "client_id_present": bool(client_id),
        "client_id_length": len(client_id) if client_id else 0,
        "client_secret_present": bool(client_secret),
        "client_secret_length": len(client_secret) if client_secret else 0,
    }
    
    # Try to get token
    token = get_fatsecret_token()
    results["token_obtained"] = bool(token)
    results["token_length"] = len(token) if token else 0
    
    if token:
        # Try a simple search
        foods = search_fatsecret_foods("chicken", max_results=3)
        results["search_works"] = bool(foods)
        results["search_count"] = len(foods) if foods else 0
        
        # Try barcode lookup
        barcode_result = get_food_by_barcode("049000042566")
        results["barcode_works"] = bool(barcode_result)
        if barcode_result:
            results["barcode_food_name"] = barcode_result.get("food_name", "Unknown")
    
    return jsonify(results), 200


@fatsecret_bp.route("/nlp", methods=["POST"])
@jwt_required()
def nlp_search():
    """Natural Language food search using FatSecret NLP API.
    
    This endpoint can understand natural language like:
    - "2 eggs and a glass of milk"
    - "large coffee with cream"
    - "chicken breast 200g with rice"
    """
    data = request.get_json() or {}
    text_input = data.get("text", "").strip()
    
    if not text_input:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    
    foods = search_fatsecret_nlp(text_input)
    
    if foods:
        # Format the results
        formatted_foods = []
        for food in foods:
            # Extract serving info
            serving = food.get("serving", {})
            
            formatted_foods.append({
                "food_id": food.get("food_id"),
                "food_name": food.get("food_name"),
                "food_type": food.get("food_type", ""),
                "brand_name": food.get("brand_name", ""),
                "quantity": food.get("food_entry_quantity", 1),
                "serving_description": serving.get("serving_description", "1 serving"),
                "calories": float(serving.get("calories", 0)),
                "protein": float(serving.get("protein", 0)),
                "carbs": float(serving.get("carbohydrate", 0)),
                "fat": float(serving.get("fat", 0)),
                "fiber": float(serving.get("fiber", 0)),
                "sugar": float(serving.get("sugar", 0)),
            })
        
        # Calculate total nutrition
        total = {
            "calories": sum(f["calories"] for f in formatted_foods),
            "protein": sum(f["protein"] for f in formatted_foods),
            "carbs": sum(f["carbs"] for f in formatted_foods),
            "fat": sum(f["fat"] for f in formatted_foods),
        }
        
        return jsonify({
            "success": True,
            "input_text": text_input,
            "foods": formatted_foods,
            "total": total,
            "source": "fatsecret-nlp"
        }), 200
    
    return jsonify({
        "success": False,
        "error": "Could not parse food from text",
        "input_text": text_input
    }), 200


@fatsecret_bp.route("/categories", methods=["GET"])
@jwt_required()
def get_categories():
    """Get food categories using FatSecret Premier API."""
    categories = get_fatsecret_categories()
    
    if categories:
        return jsonify({
            "success": True,
            "categories": categories
        }), 200
    
    return jsonify({
        "success": False,
        "error": "Failed to fetch categories",
        "categories": []
    }), 200


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
    gender = getattr(profile, 'gender', 'male') or 'male'
    
    # Calculate age from date of birth
    age = 25  # Default age
    if profile.date_of_birth:
        from datetime import date
        today = date.today()
        age = today.year - profile.date_of_birth.year
        if (today.month, today.day) < (profile.date_of_birth.month, profile.date_of_birth.day):
            age -= 1
    
    # Mifflin-St Jeor Equation (gender-aware)
    # Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
    # Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender == 'female':
        bmr -= 161
    else:
        bmr += 5
    
    # Use saved activity level from profile if available
    activity = getattr(profile, 'activity_level', None) or request.args.get("activity", "moderate")
    
    # Activity level multipliers
    activity_levels = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    multiplier = activity_levels.get(activity, 1.55)
    tdee = int(bmr * multiplier)
    
    # Use saved daily calorie target if user has set a goal
    daily_target = getattr(profile, 'daily_calorie_target', None) or tdee
    goal_type = getattr(profile, 'goal_type', 'maintain') or 'maintain'
    target_weight = getattr(profile, 'target_weight_kg', None)
    goal_weeks = getattr(profile, 'goal_timeline_weeks', None)
    
    return jsonify({
        "bmr": int(bmr),
        "tdee": tdee,
        "daily_target": daily_target,
        "activity_level": activity,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "age": age,
        "gender": gender,
        "goal_type": goal_type,
        "target_weight_kg": target_weight,
        "goal_timeline_weeks": goal_weeks,
        "has_goal": daily_target != tdee
    }), 200


@fatsecret_bp.route("/set-goal", methods=["POST"])
@jwt_required()
def set_goal():
    """Save user's calorie/weight goal settings."""
    from datetime import datetime
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({"success": False, "error": "Profile not found"}), 404
    
    # Update goal fields
    profile.goal_type = data.get("goal_type", "maintain")
    profile.target_weight_kg = data.get("target_weight_kg")
    profile.goal_timeline_weeks = data.get("goal_timeline_weeks")
    profile.activity_level = data.get("activity_level", "moderate")
    profile.gender = data.get("gender", "male")
    profile.daily_calorie_target = data.get("daily_calorie_target")
    profile.goal_set_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Goal saved successfully",
            "daily_target": profile.daily_calorie_target
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@fatsecret_bp.route("/ai-meal", methods=["POST"])
@jwt_required()
def search_ai_meal():
    """Search for meal options using CalorieNinjas API."""
    data = request.get_json() or {}
    meal_query = data.get("meal_name", "").strip()
    
    if not meal_query:
        return jsonify({"success": False, "error": "Please provide a meal name"}), 400
    
    # Primary: CalorieNinjas API
    ninja_results = search_calorieninjas(meal_query, max_results=5)
    if ninja_results and len(ninja_results) > 0:
        return jsonify({
            "success": True,
            "meals": ninja_results,
            "source": "calorieninjas"
        }), 200
    
    # Fallback 1: USDA database
    usda_results = search_usda_foods(meal_query, max_results=5)
    if usda_results and len(usda_results) > 0:
        return jsonify({
            "success": True,
            "meals": usda_results,
            "source": "usda"
        }), 200
    
    # Fallback 2: Local database
    fallback = search_fallback_foods(meal_query)
    if fallback and len(fallback) > 0:
        return jsonify({
            "success": True,
            "meals": fallback,
            "source": "fallback"
        }), 200
    
    # Fallback 3: AI estimation (for restaurant meals, custom foods, etc.)
    ai_estimate = estimate_nutrition_with_ai(meal_query)
    if ai_estimate and len(ai_estimate) > 0:
        return jsonify({
            "success": True,
            "meals": ai_estimate,
            "source": "ai_estimate",
            "is_estimate": True
        }), 200
    
    return jsonify({
        "success": False,
        "error": "No meals found. Try a different search term."
    }), 200


@fatsecret_bp.route("/ai-estimate", methods=["POST"])
@jwt_required()
def get_ai_estimate():
    """Force AI estimation for a food query (bypasses database search)."""
    data = request.get_json() or {}
    meal_query = data.get("meal_name", "").strip()
    
    if not meal_query:
        return jsonify({"success": False, "error": "Please provide a meal name"}), 400
    
    # Directly use OpenAI estimation
    ai_estimate = estimate_nutrition_with_ai(meal_query)
    if ai_estimate and len(ai_estimate) > 0:
        return jsonify({
            "success": True,
            "meals": ai_estimate,
            "source": "ai_estimate",
            "is_estimate": True
        }), 200
    
    return jsonify({
        "success": False,
        "error": "AI estimation failed. Please try again."
    }), 200


@fatsecret_bp.route("/scan-image", methods=["POST"])
@jwt_required()
def scan_image_nutrition():
    """Scan an image to extract nutrition information using CalorieNinjas."""
    api_key = os.getenv("CALORIENINJAS_API_KEY")
    
    if not api_key:
        return jsonify({"success": False, "error": "CalorieNinjas API not configured"}), 500
    
    # Get the image data from the request
    data = request.get_json() or {}
    image_data = data.get("image", "")
    
    if not image_data:
        return jsonify({"success": False, "error": "No image provided"}), 400
    
    # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    if "," in image_data:
        image_data = image_data.split(",")[1]
    
    try:
        # Call CalorieNinjas Image Text Nutrition API
        response = requests.post(
            "https://api.calorieninjas.com/v1/imagetextnutrition",
            headers={"X-Api-Key": api_key},
            files={"image": ("image.jpg", __import__("base64").b64decode(image_data), "image/jpeg")},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            items = result.get("items", [])
            
            if items:
                foods = []
                # Filter out nutrition label field names that aren't actual foods
                invalid_names = ["total", "sugars", "sugar", "protein", "carbohydrate", 
                                "carbohydrates", "fat", "fats", "calories", "sodium", 
                                "fiber", "cholesterol", "saturated", "trans", "iron",
                                "calcium", "vitamin", "potassium", "daily", "value"]
                
                for item in items:
                    name = item.get("name", "").lower().strip()
                    # Skip items that are just nutrition label fields
                    if name in invalid_names or len(name) < 3:
                        continue
                    # Skip items with unreasonably high values (likely parsing errors)
                    if item.get("calories", 0) > 5000:
                        continue
                        
                    foods.append({
                        "food_name": item.get("name", "Unknown").title(),
                        "calories": round(item.get("calories", 0)),
                        "protein": round(item.get("protein_g", 0), 1),
                        "carbs": round(item.get("carbohydrates_total_g", 0), 1),
                        "fat": round(item.get("fat_total_g", 0), 1),
                        "serving": item.get("serving_size_g", 100),
                        "source": "image_scan"
                    })
                
                if foods:
                    return jsonify({
                        "success": True,
                        "foods": foods,
                        "message": f"Found {len(foods)} food item(s) in image"
                    }), 200
                else:
                    return jsonify({
                        "success": False,
                        "error": "Could not identify foods. This works best with menus and ingredient lists, not nutrition facts labels. Try searching for the food name instead."
                    }), 200
            else:
                return jsonify({
                    "success": False,
                    "error": "No nutrition information found in image. Try a clearer photo of a nutrition label."
                }), 200
        else:
            print(f"CalorieNinjas image scan error: {response.status_code} - {response.text}")
            return jsonify({
                "success": False,
                "error": "Could not scan image. Try a clearer photo."
            }), 200
            
    except Exception as e:
        print(f"Image scan error: {e}")
        return jsonify({
            "success": False,
            "error": "Image scanning failed. Please try again."
        }), 200


# ============================================
# TheMealDB Recipe Browser Integration
# ============================================

@fatsecret_bp.route("/recipes/search", methods=["GET"])
@jwt_required()
def search_recipes():
    """Search recipes from TheMealDB."""
    query = request.args.get("q", "").strip()
    
    if not query:
        return jsonify({"success": False, "error": "Please provide a search term"}), 400
    
    try:
        response = requests.get(
            f"{MEALDB_API_URL}/search.php",
            params={"s": query},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            meals = data.get("meals") or []
            
            recipes = []
            for meal in meals[:10]:  # Limit to 10 results
                recipes.append({
                    "id": meal.get("idMeal"),
                    "name": meal.get("strMeal"),
                    "category": meal.get("strCategory"),
                    "area": meal.get("strArea"),
                    "thumbnail": meal.get("strMealThumb"),
                    "tags": meal.get("strTags", "").split(",") if meal.get("strTags") else []
                })
            
            return jsonify({
                "success": True,
                "recipes": recipes,
                "count": len(recipes)
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to search recipes"}), 200
            
    except Exception as e:
        print(f"Recipe search error: {e}")
        return jsonify({"success": False, "error": "Recipe search failed"}), 200


@fatsecret_bp.route("/recipes/categories", methods=["GET"])
@jwt_required()
def get_recipe_categories():
    """Get all meal categories from TheMealDB."""
    try:
        response = requests.get(
            f"{MEALDB_API_URL}/categories.php",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            categories = []
            
            for cat in data.get("categories", []):
                categories.append({
                    "id": cat.get("idCategory"),
                    "name": cat.get("strCategory"),
                    "thumbnail": cat.get("strCategoryThumb"),
                    "description": cat.get("strCategoryDescription", "")[:100] + "..."
                })
            
            return jsonify({
                "success": True,
                "categories": categories
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to get categories"}), 200
            
    except Exception as e:
        print(f"Categories error: {e}")
        return jsonify({"success": False, "error": "Failed to get categories"}), 200


@fatsecret_bp.route("/recipes/by-category", methods=["GET"])
@jwt_required()
def get_recipes_by_category():
    """Get recipes by category from TheMealDB."""
    category = request.args.get("category", "").strip()
    
    if not category:
        return jsonify({"success": False, "error": "Please provide a category"}), 400
    
    try:
        response = requests.get(
            f"{MEALDB_API_URL}/filter.php",
            params={"c": category},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            meals = data.get("meals") or []
            
            recipes = []
            for meal in meals[:12]:  # Limit to 12 results
                recipes.append({
                    "id": meal.get("idMeal"),
                    "name": meal.get("strMeal"),
                    "thumbnail": meal.get("strMealThumb")
                })
            
            return jsonify({
                "success": True,
                "recipes": recipes,
                "category": category
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to get recipes"}), 200
            
    except Exception as e:
        print(f"Recipes by category error: {e}")
        return jsonify({"success": False, "error": "Failed to get recipes"}), 200


@fatsecret_bp.route("/recipes/details/<meal_id>", methods=["GET"])
@jwt_required()
def get_recipe_details(meal_id):
    """Get full recipe details with calculated nutrition."""
    try:
        # Get recipe details from TheMealDB
        response = requests.get(
            f"{MEALDB_API_URL}/lookup.php",
            params={"i": meal_id},
            timeout=10
        )
        
        if response.status_code != 200 or not response.json().get("meals"):
            return jsonify({"success": False, "error": "Recipe not found"}), 404
        
        meal = response.json()["meals"][0]
        
        # Extract ingredients and measurements
        ingredients = []
        for i in range(1, 21):
            ingredient = meal.get(f"strIngredient{i}", "").strip()
            measure = meal.get(f"strMeasure{i}", "").strip()
            
            if ingredient:
                ingredients.append({
                    "ingredient": ingredient,
                    "measure": measure,
                    "nutrition": None  # Will be filled by calculate endpoint
                })
        
        recipe = {
            "id": meal.get("idMeal"),
            "name": meal.get("strMeal"),
            "category": meal.get("strCategory"),
            "area": meal.get("strArea"),
            "instructions": meal.get("strInstructions"),
            "thumbnail": meal.get("strMealThumb"),
            "youtube": meal.get("strYoutube"),
            "source": meal.get("strSource"),
            "tags": meal.get("strTags", "").split(",") if meal.get("strTags") else [],
            "ingredients": ingredients
        }
        
        return jsonify({
            "success": True,
            "recipe": recipe
        }), 200
        
    except Exception as e:
        print(f"Recipe details error: {e}")
        return jsonify({"success": False, "error": "Failed to get recipe details"}), 200


@fatsecret_bp.route("/recipes/calculate-nutrition", methods=["POST"])
@jwt_required()
def calculate_recipe_nutrition():
    """Calculate total nutrition for a recipe using CalorieNinjas."""
    data = request.get_json() or {}
    ingredients = data.get("ingredients", [])
    
    if not ingredients:
        return jsonify({"success": False, "error": "No ingredients provided"}), 400
    
    # Build query string for CalorieNinjas (all ingredients at once)
    query_parts = []
    for ing in ingredients:
        measure = ing.get("measure", "")
        ingredient = ing.get("ingredient", "")
        if ingredient:
            query_parts.append(f"{measure} {ingredient}".strip())
    
    query = ", ".join(query_parts)
    
    # Get nutrition from CalorieNinjas
    api_key = os.getenv("CALORIENINJAS_API_KEY")
    if not api_key:
        return jsonify({"success": False, "error": "CalorieNinjas API not configured"}), 500
    
    try:
        response = requests.get(
            CALORIENINJAS_API_URL,
            params={"query": query},
            headers={"X-Api-Key": api_key},
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            
            # Calculate totals
            total_calories = 0
            total_protein = 0
            total_carbs = 0
            total_fat = 0
            
            ingredient_nutrition = []
            for item in items:
                calories = item.get("calories", 0)
                protein = item.get("protein_g", 0)
                carbs = item.get("carbohydrates_total_g", 0)
                fat = item.get("fat_total_g", 0)
                
                total_calories += calories
                total_protein += protein
                total_carbs += carbs
                total_fat += fat
                
                ingredient_nutrition.append({
                    "name": item.get("name", "Unknown").title(),
                    "calories": round(calories),
                    "protein": round(protein, 1),
                    "carbs": round(carbs, 1),
                    "fat": round(fat, 1),
                    "serving": item.get("serving_size_g", 100)
                })
            
            return jsonify({
                "success": True,
                "total": {
                    "calories": round(total_calories),
                    "protein": round(total_protein, 1),
                    "carbs": round(total_carbs, 1),
                    "fat": round(total_fat, 1)
                },
                "ingredients": ingredient_nutrition,
                "servings": 4  # Estimate 4 servings per recipe
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to calculate nutrition"}), 200
            
    except Exception as e:
        print(f"Nutrition calculation error: {e}")
        return jsonify({"success": False, "error": "Nutrition calculation failed"}), 200
