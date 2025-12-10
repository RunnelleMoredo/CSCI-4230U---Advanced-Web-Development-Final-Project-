/**
 * Calorie Tracker Page JavaScript
 * Handles food search, image scanning, recipe calculation, and calorie logging
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
// TAB SWITCHING
// =======================================
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active from all tabs
        document.querySelectorAll(".tab-btn").forEach(t => {
            t.classList.remove("tab-active");
            t.classList.add("text-slate-400");
        });
        // Hide all content
        document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));

        // Activate clicked tab
        btn.classList.add("tab-active");
        btn.classList.remove("text-slate-400");

        // Show corresponding content
        const tabId = `tab_${btn.dataset.tab}`;
        document.getElementById(tabId)?.classList.remove("hidden");
    });
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
        remainingEl.className = `text-xl font-bold ${netRemaining >= 0 ? 'text-white' : 'text-red-500'}`;
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
        logContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No foods logged yet</p>`;
        updateMacroChart();
        return;
    }

    logContainer.innerHTML = foodLog.map((food, idx) => `
    <div class="flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
      <span class="text-xl">${getFoodEmoji(food.name)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">${food.name}</p>
        <p class="text-xs text-slate-400">${food.serving}</p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <span class="text-sm font-bold text-amber-500">${food.calories}</span>
        <button class="text-red-500 hover:bg-red-500/10 rounded p-1" onclick="removeFoodFromLog(${idx})">
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

window.openServingModal = function (food) {
    selectedFood = food;
    document.getElementById("modalFoodName").textContent = food.food_name;
    document.getElementById("modalFoodServing").textContent = `Per ${food.serving || 100}g`;
    document.getElementById("modalFoodEmoji").textContent = getFoodEmoji(food.food_name);

    if (servingAmount) servingAmount.value = food.serving || 100;
    updateServingPreview();

    if (servingModal) {
        servingModal.classList.remove("hidden");
        servingModal.classList.add("flex");
    }
};

function updateServingPreview() {
    if (!selectedFood) return;

    const amount = parseFloat(servingAmount?.value) || 100;
    const baseServing = selectedFood.serving || 100;
    const multiplier = amount / (typeof baseServing === 'number' ? baseServing : 100);

    const calories = Math.round(selectedFood.calories * multiplier);
    const protein = Math.round(selectedFood.protein * multiplier * 10) / 10;
    const carbs = Math.round(selectedFood.carbs * multiplier * 10) / 10;
    const fat = Math.round(selectedFood.fat * multiplier * 10) / 10;

    document.getElementById("servingPreview").textContent = `${amount}g`;
    document.getElementById("previewCal").textContent = calories;
    document.getElementById("previewProtein").textContent = protein;
    document.getElementById("previewCarbs").textContent = carbs;
    document.getElementById("previewFat").textContent = fat;
}

if (servingAmount) servingAmount.addEventListener("input", updateServingPreview);

document.getElementById("cancelServing")?.addEventListener("click", () => {
    servingModal?.classList.add("hidden");
    servingModal?.classList.remove("flex");
});

document.getElementById("confirmServing")?.addEventListener("click", () => {
    if (!selectedFood) return;

    const amount = parseFloat(servingAmount?.value) || 100;
    const baseServing = selectedFood.serving || 100;
    const multiplier = amount / (typeof baseServing === 'number' ? baseServing : 100);

    addFoodToLog({
        name: selectedFood.food_name,
        calories: Math.round(selectedFood.calories * multiplier),
        serving: `${amount}g`,
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10
    });

    servingModal?.classList.add("hidden");
    servingModal?.classList.remove("flex");
});

// =======================================
// FOOD SEARCH (using CalorieNinjas)
// =======================================
const foodSearchBtn = document.getElementById("btn_food_search");
const foodSearchInput = document.getElementById("food_search_input");
const searchResults = document.getElementById("search_results");

if (foodSearchBtn && foodSearchInput) {
    const searchFood = async () => {
        const query = foodSearchInput.value.trim();
        if (!query) {
            alert("Please enter a food to search");
            return;
        }

        const token = localStorage.getItem("access_token");
        foodSearchBtn.disabled = true;
        const original = foodSearchBtn.innerHTML;
        foodSearchBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Searching...`;

        try {
            const res = await fetch("/api/food/ai-meal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ meal_name: query })
            });

            const data = await res.json();

            if (data.success && data.meals && data.meals.length > 0) {
                const sourceLabel = data.source === "calorieninjas" ? "CalorieNinjas" : (data.source === "usda" ? "USDA" : "Database");
                searchResults.innerHTML = `
                    <p class="text-xs text-green-400 mb-2">Found ${data.meals.length} results from ${sourceLabel}</p>
                    ${data.meals.map(meal => `
                        <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-transparent hover:border-green-500/50"
                             onclick='openServingModal(${JSON.stringify(meal).replace(/'/g, "\\'")})'>
                            <div class="text-2xl">${getFoodEmoji(meal.food_name)}</div>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-white">${meal.food_name}</p>
                                <p class="text-xs text-slate-400">${meal.protein || 0}g P / ${meal.carbs || 0}g C / ${meal.fat || 0}g F</p>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold text-amber-500">${meal.calories || 0}</p>
                                <p class="text-xs text-slate-400">cal</p>
                            </div>
                        </div>
                    `).join("")}
                `;
            } else {
                searchResults.innerHTML = `<p class="text-red-400 text-sm text-center py-4">${data.error || "No foods found"}</p>`;
            }
        } catch (e) {
            console.error("Food search error:", e);
            searchResults.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Search failed. Try again.</p>`;
        } finally {
            foodSearchBtn.disabled = false;
            foodSearchBtn.innerHTML = original;
        }
    };

    foodSearchBtn.addEventListener("click", searchFood);
    foodSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchFood();
    });
}

// Quick food buttons
document.querySelectorAll(".quick-food").forEach(btn => {
    btn.addEventListener("click", () => {
        const food = btn.dataset.food;
        if (foodSearchInput) foodSearchInput.value = food;
        foodSearchBtn?.click();
    });
});

// =======================================
// IMAGE SCANNING
// =======================================
const imageUpload = document.getElementById("image_upload");
const scanPreview = document.getElementById("scan_preview");
const scanImage = document.getElementById("scan_image");
const scanBtn = document.getElementById("btn_scan_image");
const scanResults = document.getElementById("scan_results");

if (imageUpload) {
    imageUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (scanImage) scanImage.src = event.target.result;
                if (scanPreview) scanPreview.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });
}

if (scanBtn) {
    scanBtn.addEventListener("click", async () => {
        const imageData = scanImage?.src;
        if (!imageData) {
            alert("Please upload an image first");
            return;
        }

        const token = localStorage.getItem("access_token");
        scanBtn.disabled = true;
        const original = scanBtn.innerHTML;
        scanBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Scanning...`;

        if (scanResults) {
            scanResults.innerHTML = `<p class="text-purple-400 text-sm text-center py-4">Analyzing image...</p>`;
        }

        try {
            const res = await fetch("/api/food/scan-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ image: imageData })
            });

            const data = await res.json();

            if (data.success && data.foods && data.foods.length > 0) {
                scanResults.innerHTML = `
                    <div class="p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                        <p class="text-green-400 font-bold mb-3">✓ ${data.message}</p>
                        ${data.foods.map(food => `
                            <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg mb-2 cursor-pointer hover:bg-slate-700"
                                 onclick='openServingModal(${JSON.stringify(food).replace(/'/g, "\\'")})'>
                                <div class="text-2xl">${getFoodEmoji(food.food_name)}</div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-white">${food.food_name}</p>
                                    <p class="text-xs text-slate-400">${food.protein || 0}g P / ${food.carbs || 0}g C / ${food.fat || 0}g F</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-lg font-bold text-amber-500">${food.calories || 0}</p>
                                    <p class="text-xs text-slate-400">cal</p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `;
            } else {
                scanResults.innerHTML = `
                    <div class="p-4 bg-red-900/30 rounded-lg border border-red-500/30">
                        <p class="text-red-400 text-sm">${data.error || "No nutrition found. Try a clearer image of a nutrition label."}</p>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Image scan error:", e);
            scanResults.innerHTML = `
                <div class="p-4 bg-red-900/30 rounded-lg border border-red-500/30">
                    <p class="text-red-400 text-sm">Scan failed. Please try again.</p>
                </div>
            `;
        } finally {
            scanBtn.disabled = false;
            scanBtn.innerHTML = original;
        }
    });
}

// =======================================
// RECIPE CALCULATION
// =======================================
const recipeInput = document.getElementById("recipe_input");
const recipeBtn = document.getElementById("btn_calculate_recipe");
const recipeResults = document.getElementById("recipe_results");

if (recipeBtn && recipeInput) {
    recipeBtn.addEventListener("click", async () => {
        const recipe = recipeInput.value.trim();
        if (!recipe) {
            alert("Please enter recipe ingredients");
            return;
        }

        const token = localStorage.getItem("access_token");
        recipeBtn.disabled = true;
        const original = recipeBtn.innerHTML;
        recipeBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Calculating...`;

        try {
            // Send the full recipe text to CalorieNinjas
            const res = await fetch("/api/food/ai-meal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ meal_name: recipe })
            });

            const data = await res.json();

            if (data.success && data.meals && data.meals.length > 0) {
                // Calculate totals
                let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
                data.meals.forEach(m => {
                    totalCal += m.calories || 0;
                    totalProtein += m.protein || 0;
                    totalCarbs += m.carbs || 0;
                    totalFat += m.fat || 0;
                });

                recipeResults.innerHTML = `
                    <div class="p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                        <h4 class="text-green-400 font-bold mb-3">Recipe Nutrition (per serving)</h4>
                        <div class="grid grid-cols-4 gap-3 text-center mb-4">
                            <div class="p-2 bg-slate-800 rounded">
                                <p class="text-xl font-bold text-amber-500">${totalCal}</p>
                                <p class="text-xs text-slate-400">Calories</p>
                            </div>
                            <div class="p-2 bg-slate-800 rounded">
                                <p class="text-xl font-bold text-green-500">${Math.round(totalProtein)}g</p>
                                <p class="text-xs text-slate-400">Protein</p>
                            </div>
                            <div class="p-2 bg-slate-800 rounded">
                                <p class="text-xl font-bold text-blue-500">${Math.round(totalCarbs)}g</p>
                                <p class="text-xs text-slate-400">Carbs</p>
                            </div>
                            <div class="p-2 bg-slate-800 rounded">
                                <p class="text-xl font-bold text-red-500">${Math.round(totalFat)}g</p>
                                <p class="text-xs text-slate-400">Fat</p>
                            </div>
                        </div>
                        <button onclick="addRecipeToLog(${totalCal}, ${totalProtein}, ${totalCarbs}, ${totalFat})" 
                                class="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium">
                            Add Recipe to Log
                        </button>
                    </div>
                `;
            } else {
                recipeResults.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Could not calculate. Try simpler ingredient names.</p>`;
            }
        } catch (e) {
            console.error("Recipe calc error:", e);
            recipeResults.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Calculation failed. Try again.</p>`;
        } finally {
            recipeBtn.disabled = false;
            recipeBtn.innerHTML = original;
        }
    });
}

window.addRecipeToLog = function (cal, protein, carbs, fat) {
    addFoodToLog({
        name: "Custom Recipe",
        calories: cal,
        serving: "1 serving",
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10
    });
    if (recipeResults) recipeResults.innerHTML = `<p class="text-green-400 text-sm text-center py-4">✓ Recipe added to log!</p>`;
    if (recipeInput) recipeInput.value = "";
};

// =======================================
// INITIALIZE
// =======================================
document.addEventListener("DOMContentLoaded", initCalorieTracker);
