/**
 * Calorie Tracker Page JavaScript
 * Handles food search, AI meal lookup, food logging, and calorie calculations
 */

// =======================================
// THEME TOGGLE
// =======================================
const toggle = document.getElementById("theme_toggle_checkbox");
if (toggle) {
    toggle.checked = document.documentElement.classList.contains("dark");
    toggle.addEventListener("change", () => {
        document.documentElement.classList.toggle("dark", toggle.checked);
        localStorage.setItem("theme", toggle.checked ? "dark" : "light");
    });
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
        toggle.checked = false;
    }
}

// =======================================
// LOGOUT
// =======================================
document.getElementById("btn_logout")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/";
});

// =======================================
// CALORIE TRACKER CORE
// =======================================
let dailyCalorieTarget = 2000;
let caloriesConsumed = 0;
let caloriesBurned = 0;
let foodLog = [];

async function initCalorieTracker() {
    const dateEl = document.getElementById("calorie_date");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

    // Load food log from localStorage
    const savedLog = localStorage.getItem("todayFoodLog");
    const savedDate = localStorage.getItem("foodLogDate");
    const today = new Date().toDateString();

    if (savedLog && savedDate === today) {
        foodLog = JSON.parse(savedLog);
        caloriesConsumed = foodLog.reduce((sum, f) => sum + (f.calories || 0), 0);
    } else {
        foodLog = [];
        localStorage.setItem("todayFoodLog", "[]");
        localStorage.setItem("foodLogDate", today);
    }

    // Load burned calories from today's sessions
    const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    const todayStr = new Date().toDateString();
    caloriesBurned = history
        .filter(h => new Date(h.date).toDateString() === todayStr)
        .reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);

    // Fetch personalized BMR target
    const token = localStorage.getItem("access_token");
    if (token) {
        try {
            const res = await fetch("/api/food/bmr", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                dailyCalorieTarget = data.daily_target;
            }
        } catch (e) {
            console.log("Could not fetch BMR, using default");
        }
    }

    updateCalorieDisplay();
    renderFoodLog();
}

function updateCalorieDisplay() {
    const targetEl = document.getElementById("cal_target");
    const consumedEl = document.getElementById("cal_consumed");
    const burnedEl = document.getElementById("cal_burned");
    const remainingEl = document.getElementById("cal_remaining");

    if (targetEl) targetEl.textContent = dailyCalorieTarget.toLocaleString();
    if (consumedEl) consumedEl.textContent = caloriesConsumed.toLocaleString();
    if (burnedEl) burnedEl.textContent = caloriesBurned.toLocaleString();

    const netRemaining = dailyCalorieTarget - caloriesConsumed + caloriesBurned;
    if (remainingEl) {
        remainingEl.textContent = netRemaining.toLocaleString();
        remainingEl.className = `text-3xl font-bold ${netRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`;
    }

    updateMacroChart();
}

function updateMacroChart() {
    const totalProtein = foodLog.reduce((sum, f) => sum + (f.protein || 0), 0);
    const totalCarbs = foodLog.reduce((sum, f) => sum + (f.carbs || 0), 0);
    const totalFat = foodLog.reduce((sum, f) => sum + (f.fat || 0), 0);

    const proteinEl = document.getElementById("totalProteinG");
    const carbsEl = document.getElementById("totalCarbsG");
    const fatEl = document.getElementById("totalFatG");
    const calDisplayEl = document.getElementById("macroCalDisplay");

    if (proteinEl) proteinEl.textContent = Math.round(totalProtein);
    if (carbsEl) carbsEl.textContent = Math.round(totalCarbs);
    if (fatEl) fatEl.textContent = Math.round(totalFat);
    if (calDisplayEl) calDisplayEl.textContent = caloriesConsumed;

    const proteinCal = totalProtein * 4;
    const carbsCal = totalCarbs * 4;
    const fatCal = totalFat * 9;
    const totalMacroCal = proteinCal + carbsCal + fatCal;

    const circumference = 251.2;

    if (totalMacroCal > 0) {
        const proteinRatio = proteinCal / totalMacroCal;
        const carbsRatio = carbsCal / totalMacroCal;
        const fatRatio = fatCal / totalMacroCal;

        const proteinArc = document.getElementById("proteinArc");
        const carbsArc = document.getElementById("carbsArc");
        const fatArc = document.getElementById("fatArc");

        if (proteinArc) {
            proteinArc.setAttribute("stroke-dasharray", `${proteinRatio * circumference} ${circumference}`);
            proteinArc.setAttribute("stroke-dashoffset", "0");
        }
        if (carbsArc) {
            carbsArc.setAttribute("stroke-dasharray", `${carbsRatio * circumference} ${circumference}`);
            carbsArc.setAttribute("stroke-dashoffset", `${-proteinRatio * circumference}`);
        }
        if (fatArc) {
            fatArc.setAttribute("stroke-dasharray", `${fatRatio * circumference} ${circumference}`);
            fatArc.setAttribute("stroke-dashoffset", `${-(proteinRatio + carbsRatio) * circumference}`);
        }
    }
}

function renderFoodLog() {
    const logContainer = document.getElementById("food_log");
    if (!logContainer) return;

    if (foodLog.length === 0) {
        logContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No foods logged yet. Search and add foods above!</p>`;
        updateMacroChart();
        return;
    }

    logContainer.innerHTML = foodLog.map((food, idx) => `
    <div class="flex items-center gap-2 p-3 bg-slate-200 dark:bg-slate-800 rounded-lg">
      <span class="text-2xl">${getFoodEmoji(food.name)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-900 dark:text-white truncate">${food.name}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">${food.serving} • ${food.protein}g P / ${food.carbs}g C / ${food.fat}g F</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-lg font-bold text-amber-500">${food.calories}</span>
        <span class="text-xs text-amber-400">cal</span>
        <button class="text-red-500 hover:bg-red-500/10 rounded p-1 ml-2" onclick="removeFoodFromLog(${idx})">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  `).join("");

    updateMacroChart();
}

function addFoodToLog(food) {
    foodLog.push(food);
    caloriesConsumed += food.calories || 0;
    localStorage.setItem("todayFoodLog", JSON.stringify(foodLog));
    localStorage.setItem("foodLogDate", new Date().toDateString());
    updateCalorieDisplay();
    renderFoodLog();
}

window.removeFoodFromLog = function (idx) {
    const removed = foodLog.splice(idx, 1)[0];
    caloriesConsumed -= removed.calories || 0;
    localStorage.setItem("todayFoodLog", JSON.stringify(foodLog));
    updateCalorieDisplay();
    renderFoodLog();
};

// Clear all food log
document.getElementById("clearFoodLog")?.addEventListener("click", () => {
    if (confirm("Clear all foods from today's log?")) {
        foodLog = [];
        caloriesConsumed = 0;
        localStorage.setItem("todayFoodLog", "[]");
        updateCalorieDisplay();
        renderFoodLog();
    }
});

// =======================================
// FOOD EMOJI LOOKUP
// =======================================
const foodImages = {
    chicken: "🍗", beef: "🥩", steak: "🥩", salmon: "🐟", fish: "🐟", tuna: "🐟", shrimp: "🦐",
    egg: "🥚", rice: "🍚", bread: "🍞", pasta: "🍝", oatmeal: "🥣", noodle: "🍜",
    banana: "🍌", apple: "🍎", orange: "🍊", strawberry: "🍓", blueberry: "🫐",
    broccoli: "🥦", spinach: "🥬", potato: "🥔", avocado: "🥑", carrot: "🥕", salad: "🥗",
    yogurt: "🥛", milk: "🥛", cheese: "🧀", butter: "🧈",
    pizza: "🍕", burger: "🍔", fries: "🍟", ice: "🍦", chocolate: "🍫", taco: "🌮", burrito: "🌯",
    coffee: "☕", juice: "🧃", shake: "🥤", protein: "💪", smoothie: "🥤",
    default: "🍽️"
};

function getFoodEmoji(foodName) {
    const lower = foodName.toLowerCase();
    for (const [key, emoji] of Object.entries(foodImages)) {
        if (lower.includes(key)) return emoji;
    }
    return foodImages.default;
}

// =======================================
// SERVING MODAL
// =======================================
let selectedFood = null;
const servingModal = document.getElementById("servingModal");
const servingAmount = document.getElementById("servingAmount");
const servingUnit = document.getElementById("servingUnit");

window.openServingModal = function (food) {
    selectedFood = food;
    document.getElementById("modalFoodName").textContent = food.food_name;
    document.getElementById("modalFoodServing").textContent = `Per ${food.serving}`;
    document.getElementById("modalFoodImage").style.display = "none";

    if (servingAmount) servingAmount.value = 100;
    if (servingUnit) servingUnit.value = "g";

    updateServingPreview();

    if (servingModal) {
        servingModal.classList.remove("hidden");
        servingModal.classList.add("flex");
    }
};

function updateServingPreview() {
    if (!selectedFood) return;

    const amount = parseFloat(servingAmount?.value) || 100;
    const unit = servingUnit?.value || "g";

    let multiplier = amount / 100;
    if (unit === "serving") multiplier = amount;

    const calories = Math.round(selectedFood.calories * multiplier);
    const protein = Math.round(selectedFood.protein * multiplier * 10) / 10;
    const carbs = Math.round(selectedFood.carbs * multiplier * 10) / 10;
    const fat = Math.round(selectedFood.fat * multiplier * 10) / 10;

    document.getElementById("servingPreview").textContent = unit === "g" ? `${amount}g` : `${amount} serving(s)`;
    document.getElementById("previewCal").textContent = calories;
    document.getElementById("previewProtein").textContent = protein;
    document.getElementById("previewCarbs").textContent = carbs;
    document.getElementById("previewFat").textContent = fat;
}

if (servingAmount) servingAmount.addEventListener("input", updateServingPreview);
if (servingUnit) servingUnit.addEventListener("change", updateServingPreview);

document.getElementById("cancelServing")?.addEventListener("click", () => {
    servingModal?.classList.add("hidden");
    servingModal?.classList.remove("flex");
});

document.getElementById("confirmServing")?.addEventListener("click", () => {
    if (!selectedFood) return;

    const amount = parseFloat(servingAmount?.value) || 100;
    const unit = servingUnit?.value || "g";
    let multiplier = amount / 100;
    if (unit === "serving") multiplier = amount;

    addFoodToLog({
        name: selectedFood.food_name,
        calories: Math.round(selectedFood.calories * multiplier),
        serving: unit === "g" ? `${amount}g` : `${amount} serving(s)`,
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10
    });

    servingModal?.classList.add("hidden");
    servingModal?.classList.remove("flex");
});

// =======================================
// FOOD DATABASE SEARCH
// =======================================
const foodSearchBtn = document.getElementById("btn_food_search");
const foodSearchInput = document.getElementById("food_search_input");
const foodSearchResults = document.getElementById("food_search_results");

if (foodSearchBtn && foodSearchInput) {
    const searchFood = async () => {
        const query = foodSearchInput.value.trim();
        if (!query) return;

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (foodSearchResults) {
                foodSearchResults.classList.remove("hidden");
                if (data.foods && data.foods.length > 0) {
                    const fallbackBadge = data.is_fallback
                        ? `<div class="text-xs text-amber-500 font-medium mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-sm">info</span> Using offline database</div>`
                        : '';
                    foodSearchResults.innerHTML = fallbackBadge + data.foods.map(food => `
            <div class="flex items-center gap-3 p-3 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" 
                 onclick='openServingModal(${JSON.stringify(food).replace(/'/g, "\\'")})'>
              <div class="text-2xl">${getFoodEmoji(food.food_name)}</div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-900 dark:text-white">${food.food_name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">${food.serving} • ${food.protein}g P / ${food.carbs}g C / ${food.fat}g F</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-green-500">${food.calories}</p>
                <p class="text-xs text-slate-400">cal</p>
              </div>
            </div>
          `).join("");
                } else {
                    foodSearchResults.innerHTML = `<p class="text-slate-500 text-sm p-2">No foods found. Try the AI Meal Lookup above!</p>`;
                }
            }
        } catch (e) {
            console.error("Food search error:", e);
        }
    };

    foodSearchBtn.addEventListener("click", searchFood);
    foodSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchFood();
    });
}

// =======================================
// AI MEAL SEARCH
// =======================================
const aiMealBtn = document.getElementById("btn_ai_meal");
const aiMealInput = document.getElementById("ai_meal_input");
const aiResultsContainer = document.getElementById("ai_meal_results");

if (aiMealBtn && aiMealInput) {
    const searchAIMeal = async () => {
        const mealName = aiMealInput.value.trim();
        if (!mealName) {
            alert("Please enter a meal name to search");
            return;
        }

        const token = localStorage.getItem("access_token");
        aiMealBtn.disabled = true;
        const originalHTML = aiMealBtn.innerHTML;
        aiMealBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Searching...`;

        if (aiResultsContainer) {
            aiResultsContainer.innerHTML = `<p class="text-purple-400 text-sm text-center py-4">Searching for meal options...</p>`;
        }

        try {
            const res = await fetch("/api/food/ai-meal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ meal_name: mealName })
            });

            const data = await res.json();

            if (data.success && data.meals && data.meals.length > 0) {
                const sourceLabel = data.source === "ai" ? "🤖 AI Suggestions" : (data.source === "usda" ? "📊 USDA Database" : "📁 Local Database");
                aiResultsContainer.innerHTML = `
          <p class="text-sm text-purple-300 mb-3">${sourceLabel} for "${mealName}":</p>
          ${data.meals.map(meal => `
            <div class="flex items-center gap-3 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-purple-800/40 transition-colors"
                 onclick='selectAIMeal(${JSON.stringify(meal).replace(/'/g, "\\'")})'>
              <div class="text-2xl">${getFoodEmoji(meal.food_name)}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">${meal.food_name}</p>
                <p class="text-xs text-purple-300">${meal.serving || '1 serving'} • ${meal.protein || 0}g P / ${meal.carbs || 0}g C / ${meal.fat || 0}g F</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-lg font-bold text-purple-300">${meal.calories || 0}</p>
                <p class="text-xs text-purple-400">cal</p>
              </div>
            </div>
          `).join("")}
        `;
            } else {
                aiResultsContainer.innerHTML = `<p class="text-red-400 text-sm text-center py-4">${data.error || "No meals found. Try a different search term."}</p>`;
            }
        } catch (e) {
            console.error("AI meal error:", e);
            aiResultsContainer.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Failed to search. Try again.</p>`;
        } finally {
            aiMealBtn.disabled = false;
            aiMealBtn.innerHTML = originalHTML;
        }
    };

    aiMealBtn.addEventListener("click", searchAIMeal);
    aiMealInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchAIMeal();
    });
}

window.selectAIMeal = function (meal) {
    openServingModal(meal);
    if (aiResultsContainer) aiResultsContainer.innerHTML = "";
    if (aiMealInput) aiMealInput.value = "";
};

// =======================================
// INITIALIZE
// =======================================
document.addEventListener("DOMContentLoaded", initCalorieTracker);
