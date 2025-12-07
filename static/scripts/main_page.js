// =======================================
// THEME TOGGLE (TailwindCSS dark mode)
// =======================================
const themeCheckbox = document.getElementById("theme_toggle_checkbox");

function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  const htmlEl = document.documentElement;

  if (saved === "light") {
    htmlEl.classList.remove("dark");
    if (themeCheckbox) themeCheckbox.checked = false;
  } else {
    // Default to dark
    htmlEl.classList.add("dark");
    if (themeCheckbox) themeCheckbox.checked = true;
  }
}

if (themeCheckbox) {
  themeCheckbox.addEventListener("change", () => {
    const dark = themeCheckbox.checked;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
}
applySavedTheme();


// =======================================
// AUTH + GOALS
// =======================================
const logoutBtn = document.getElementById("btn_logout");
if (logoutBtn)
  logoutBtn.onclick = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  };

const goalsBtn = document.getElementById("btn_goals");
if (goalsBtn) goalsBtn.onclick = () => (window.location.href = "/goals_page");

function markGoalCreated() {
  localStorage.setItem("hasGoal", "true");
}
function userHasGoal() {
  return localStorage.getItem("hasGoal") === "true";
}

// Prevent accessing workouts if no goal exists
function blockWorkoutAccessIfNoGoal() {
  const disabledSection = document.querySelector(".workout-search-row");
  if (!userHasGoal() && disabledSection) {
    disabledSection.style.opacity = "0.5";
    disabledSection.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
  }
}


// =======================================
// CALORIE TRACKER
// =======================================
let dailyCalorieTarget = 2000;
let caloriesConsumed = 0;
let caloriesBurned = 0;
let foodLog = [];

// Initialize calorie tracker on page load
async function initCalorieTracker() {
  // Set today's date
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
    // New day, reset log
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

  // Update macro chart
  updateMacroChart();
}

function updateMacroChart() {
  const totalProtein = foodLog.reduce((sum, f) => sum + (f.protein || 0), 0);
  const totalCarbs = foodLog.reduce((sum, f) => sum + (f.carbs || 0), 0);
  const totalFat = foodLog.reduce((sum, f) => sum + (f.fat || 0), 0);

  // Update text displays
  const proteinEl = document.getElementById("totalProteinG");
  const carbsEl = document.getElementById("totalCarbsG");
  const fatEl = document.getElementById("totalFatG");
  const calDisplayEl = document.getElementById("macroCalDisplay");

  if (proteinEl) proteinEl.textContent = Math.round(totalProtein);
  if (carbsEl) carbsEl.textContent = Math.round(totalCarbs);
  if (fatEl) fatEl.textContent = Math.round(totalFat);
  if (calDisplayEl) calDisplayEl.textContent = caloriesConsumed;

  // Calculate calories from macros (protein 4cal/g, carbs 4cal/g, fat 9cal/g)
  const proteinCal = totalProtein * 4;
  const carbsCal = totalCarbs * 4;
  const fatCal = totalFat * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal;

  // SVG arc calculations (circumference = 2 * π * 40 ≈ 251.2)
  const circumference = 251.2;

  if (totalMacroCal > 0) {
    const proteinRatio = proteinCal / totalMacroCal;
    const carbsRatio = carbsCal / totalMacroCal;
    const fatRatio = fatCal / totalMacroCal;

    const proteinArc = document.getElementById("proteinArc");
    const carbsArc = document.getElementById("carbsArc");
    const fatArc = document.getElementById("fatArc");

    // Protein arc (starts at 0)
    if (proteinArc) {
      proteinArc.setAttribute("stroke-dasharray", `${proteinRatio * circumference} ${circumference}`);
      proteinArc.setAttribute("stroke-dashoffset", "0");
    }

    // Carbs arc (starts after protein)
    if (carbsArc) {
      carbsArc.setAttribute("stroke-dasharray", `${carbsRatio * circumference} ${circumference}`);
      carbsArc.setAttribute("stroke-dashoffset", `${-proteinRatio * circumference}`);
    }

    // Fat arc (starts after protein + carbs)
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
    logContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-2">No foods logged yet.</p>`;
    updateMacroChart();
    return;
  }

  logContainer.innerHTML = foodLog.map((food, idx) => `
    <div class="flex items-center gap-2 p-2 bg-slate-200 dark:bg-slate-800 rounded-lg">
      <span class="text-xl">${getFoodEmoji(food.name)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-900 dark:text-white truncate">${food.name}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">${food.serving}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-sm font-bold text-amber-500">${food.calories} cal</span>
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

// Food images lookup (simple icon-based approach)
const foodImages = {
  chicken: "🍗", beef: "🥩", steak: "🥩", salmon: "🐟", fish: "🐟", tuna: "🐟", shrimp: "🦐",
  egg: "🥚", rice: "🍚", bread: "🍞", pasta: "🍝", oatmeal: "🥣",
  banana: "🍌", apple: "🍎", orange: "🍊", strawberry: "🍓", blueberry: "🫐",
  broccoli: "🥦", spinach: "🥬", potato: "🥔", avocado: "🥑", carrot: "🥕",
  yogurt: "🥛", milk: "🥛", cheese: "🧀", butter: "🧈",
  pizza: "🍕", burger: "🍔", fries: "🍟", ice: "🍦", chocolate: "🍫",
  coffee: "☕", juice: "🧃", shake: "🥤", protein: "💪",
  default: "🍽️"
};

function getFoodEmoji(foodName) {
  const lower = foodName.toLowerCase();
  for (const [key, emoji] of Object.entries(foodImages)) {
    if (lower.includes(key)) return emoji;
  }
  return foodImages.default;
}

// Serving modal elements
let selectedFood = null;
const servingModal = document.getElementById("servingModal");
const servingAmount = document.getElementById("servingAmount");
const servingUnit = document.getElementById("servingUnit");

// Food search
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
            ? `<div class="text-xs text-amber-500 font-medium mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-sm">info</span> Using offline database (API unavailable)</div>`
            : '';
          foodSearchResults.innerHTML = fallbackBadge + data.foods.map((food, idx) => `
            <div class="flex items-center gap-3 p-3 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" 
                 onclick='openServingModal(${JSON.stringify(food).replace(/'/g, "\\'")})'>
              <div class="text-3xl">${getFoodEmoji(food.food_name)}</div>
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
          foodSearchResults.innerHTML = `<p class="text-slate-500 text-sm p-2">No foods found.</p>`;
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

// AI Meal Search
const aiMealBtn = document.getElementById("btn_ai_meal");
const aiMealInput = document.getElementById("ai_meal_input");

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
    aiMealBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span>`;

    // Get or create the AI results container
    let aiResultsContainer = document.getElementById("ai_meal_results");
    if (!aiResultsContainer) {
      aiResultsContainer = document.createElement("div");
      aiResultsContainer.id = "ai_meal_results";
      aiResultsContainer.className = "mt-2 space-y-2 max-h-64 overflow-y-auto";
      aiMealInput.parentElement.parentElement.appendChild(aiResultsContainer);
    }
    aiResultsContainer.innerHTML = `<p class="text-purple-400 text-sm text-center py-2">Searching for meals...</p>`;

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
        // Display meals as a list
        const sourceLabel = data.source === "ai" ? "AI Suggestions" : (data.source === "usda" ? "USDA Database" : "Local Database");
        aiResultsContainer.innerHTML = `
          <p class="text-xs text-purple-400 mb-2">${sourceLabel} for "${mealName}":</p>
          ${data.meals.map((meal, idx) => `
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
        aiResultsContainer.innerHTML = `<p class="text-red-400 text-sm text-center py-2">${data.error || "No meals found. Try a different search."}</p>`;
      }
    } catch (e) {
      console.error("AI meal error:", e);
      aiResultsContainer.innerHTML = `<p class="text-red-400 text-sm text-center py-2">Failed to search. Try again.</p>`;
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

// Select AI meal and open serving modal
window.selectAIMeal = function (meal) {
  openServingModal(meal);
  // Hide results after selection
  const aiResultsContainer = document.getElementById("ai_meal_results");
  if (aiResultsContainer) aiResultsContainer.innerHTML = "";
  const aiInput = document.getElementById("ai_meal_input");
  if (aiInput) aiInput.value = "";
};

// Open serving modal
window.openServingModal = function (food) {
  selectedFood = food;
  document.getElementById("modalFoodName").textContent = food.food_name;
  document.getElementById("modalFoodServing").textContent = `Per ${food.serving}`;
  document.getElementById("modalFoodImage").style.display = "none";

  // Reset to default values
  if (servingAmount) servingAmount.value = 100;
  if (servingUnit) servingUnit.value = "g";

  updateServingPreview();

  if (servingModal) {
    servingModal.classList.remove("hidden");
    servingModal.classList.add("flex");
  }
  if (foodSearchResults) foodSearchResults.classList.add("hidden");
};

// Update serving preview
function updateServingPreview() {
  if (!selectedFood) return;

  const amount = parseFloat(servingAmount?.value) || 100;
  const unit = servingUnit?.value || "g";

  // Calculate based on per-100g values
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

// Serving input listeners
if (servingAmount) servingAmount.addEventListener("input", updateServingPreview);
if (servingUnit) servingUnit.addEventListener("change", updateServingPreview);

// Cancel serving modal
document.getElementById("cancelServing")?.addEventListener("click", () => {
  servingModal?.classList.add("hidden");
  servingModal?.classList.remove("flex");
});

// Confirm serving modal - add to log
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
  if (foodSearchInput) foodSearchInput.value = "";
});

// Legacy function for backwards compatibility
window.addFoodToLogFromSearch = function (food) {
  openServingModal(food);
};

// Init on load
initCalorieTracker();


// =======================================
// MANUAL WORKOUT SYSTEM
// =======================================
let selectedExercises = [];

function loadSelectedFromStorage() {
  try {
    const stored = localStorage.getItem("selectedExercises");
    if (stored) selectedExercises = JSON.parse(stored);
  } catch {
    selectedExercises = [];
  }
}

function saveSelectedToStorage() {
  localStorage.setItem("selectedExercises", JSON.stringify(selectedExercises));
}

function addWorkout(exercise) {
  if (!userHasGoal()) return alert("Create a goal first!");

  const alreadyExists = selectedExercises.some(
    (ex) => ex.name.toLowerCase() === exercise.name.toLowerCase() && !ex.isAI
  );
  if (alreadyExists) return alert("You already added this exercise manually.");

  selectedExercises.push({
    name: exercise.name,
    targetMuscles: exercise.targetMuscles || [],
    secondaryMuscles: exercise.secondaryMuscles || [],
    equipments: exercise.equipments || [],
    instructions: exercise.instructions || [],
    gifUrl: exercise.gifUrl,
    sets: 3,
    reps: 8,
    isAI: false,
  });

  saveSelectedToStorage();
  renderSelectedWorkouts();
}


// =======================================
// RENDER MANUAL WORKOUTS (TailwindCSS)
// =======================================
function renderSelectedWorkouts() {
  const selectedList = document.getElementById("selected_workouts");
  if (!selectedList) return;
  selectedList.innerHTML = "";

  if (!selectedExercises.length) {
    selectedList.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No workouts selected yet.</p>`;
    const existingBtn = document.getElementById("btn_start_session");
    if (existingBtn) existingBtn.remove();
    return;
  }

  selectedExercises.forEach((ex, idx) => {
    const historyBadge = ex.fromHistory
      ? `<span class="ml-2 px-2 py-0.5 text-xs font-semibold bg-primary/20 text-primary rounded-full">HISTORY</span>`
      : '';

    const card = document.createElement("div");
    card.className = "flex items-center justify-between p-4 bg-slate-200 dark:bg-slate-800 rounded-lg" + (ex.fromHistory ? " border-l-4 border-primary" : "");
    card.innerHTML = `
      <div class="flex-1">
        <p class="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-primary transition-colors exercise-title">${ex.name}${historyBadge}</p>
        <div class="flex items-center gap-4 mt-2">
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500 dark:text-slate-400">Sets:</label>
            <input type="number" min="1" value="${ex.sets || 3}" class="input-sets w-16 bg-slate-100 dark:bg-background-dark border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-200">
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500 dark:text-slate-400">Reps:</label>
            <input type="number" min="1" value="${ex.reps || 8}" class="input-reps w-16 bg-slate-100 dark:bg-background-dark border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-200">
          </div>
        </div>
      </div>
      <button class="btn-remove text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
        <span class="material-symbols-outlined">delete</span>
      </button>
    `;

    card.querySelector(".exercise-title").onclick = () => openModal(ex);

    const setsInput = card.querySelector(".input-sets");
    const repsInput = card.querySelector(".input-reps");
    setsInput.onchange = () => {
      selectedExercises[idx].sets = parseInt(setsInput.value) || 1;
      saveSelectedToStorage();
    };
    repsInput.onchange = () => {
      selectedExercises[idx].reps = parseInt(repsInput.value) || 1;
      saveSelectedToStorage();
    };

    card.querySelector(".btn-remove").onclick = () => {
      selectedExercises.splice(idx, 1);
      saveSelectedToStorage();
      renderSelectedWorkouts();
    };

    selectedList.appendChild(card);
  });

  let startSessionBtn = document.getElementById("btn_start_session");
  if (!startSessionBtn) {
    startSessionBtn = document.createElement("button");
    startSessionBtn.id = "btn_start_session";
    startSessionBtn.className = "w-full flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors mt-4";
    startSessionBtn.innerHTML = `<span class="material-symbols-outlined">play_arrow</span> Start Manual Session`;
    selectedList.parentElement.appendChild(startSessionBtn);
  }

  startSessionBtn.onclick = () => {
    if (!selectedExercises.length) return alert("No workouts selected.");
    const formattedExercises = selectedExercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets || 3,
      reps: ex.reps || 8,
      category: ex.targetMuscles?.[0] || "General",
    }));
    localStorage.setItem(
      "activeWorkout",
      JSON.stringify({
        title: "Manual Session",
        category: "User Selected",
        details: { exercises: formattedExercises },
      })
    );
    window.location.href = "/session";
  };
}


// =======================================
// MODAL
// =======================================
function openModal(ex) {
  const container = document.getElementById("modal_container");
  if (!container) return;
  document.getElementById("modal_name").textContent = ex.name || "";
  document.getElementById("modal_target_muscles").textContent = (ex.targetMuscles || []).join(", ") || "N/A";
  document.getElementById("modal_secondary_muscles").textContent = (ex.secondaryMuscles || []).join(", ") || "N/A";
  document.getElementById("modal_equipment").textContent = (ex.equipments || []).join(", ") || "N/A";
  document.getElementById("modal_instructions").innerHTML = Array.isArray(ex.instructions)
    ? ex.instructions.map((i, idx) => `<span class="text-primary font-bold">${idx + 1}.</span> ${i}`).join("<br><br>")
    : ex.instructions || "No instructions available";
  document.getElementById("modal_gif").src = ex.gifUrl || "";
  container.classList.add("visible");
}
const closeModalBtn = document.getElementById("btn_close_modal");
if (closeModalBtn)
  closeModalBtn.onclick = () => document.getElementById("modal_container").classList.remove("visible");


// =======================================
// SEARCH WORKOUTS (MANUAL) - TailwindCSS
// =======================================
async function setupWorkoutSearch() {
  const searchBtn = document.getElementById("btn_find_workout");
  const searchInput = document.getElementById("find_workout");
  const searchResults = document.getElementById("search_results");
  if (!searchBtn || !searchInput || !searchResults) return;

  // Enter key support
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
  });

  searchBtn.onclick = async () => {
    if (!userHasGoal()) return alert("Create a goal first.");
    const query = searchInput.value.trim();
    if (!query) return alert("Enter a search term.");
    searchResults.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
      <span class="material-symbols-outlined animate-spin">progress_activity</span> Searching...
    </p>`;
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`/workout/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();

      if (!res.ok || !Array.isArray(data) || !data.length) {
        searchResults.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No exercises found.</p>`;
        return;
      }

      searchResults.innerHTML = "";
      data.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "flex items-start gap-4 p-3 bg-slate-200 dark:bg-slate-800 rounded-lg";
        card.innerHTML = `
          <img src="${ex.gifUrl}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="${ex.name}">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-900 dark:text-white truncate">${ex.name}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${(ex.targetMuscles || []).join(", ")}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button class="btn-add px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Add</button>
            <button class="btn-details px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors">Info</button>
          </div>
        `;
        card.querySelector(".btn-add").onclick = (e) => {
          e.stopPropagation();
          addWorkout(ex);
        };
        card.querySelector(".btn-details").onclick = (e) => {
          e.stopPropagation();
          openModal(ex);
        };
        searchResults.appendChild(card);
      });
    } catch (err) {
      searchResults.innerHTML = `<p class="text-red-500 text-sm text-center py-4">Error fetching exercises.</p>`;
    }
  };
}


// =======================================
// LOAD USER WORKOUTS (Manual + AI) - TailwindCSS
// =======================================
async function loadUserWorkouts() {
  const token = localStorage.getItem("access_token");
  const aiContainer = document.getElementById("ai_workouts_container");
  if (!token) return;

  try {
    const res = await fetch("/workout/all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      if (aiContainer) aiContainer.innerHTML = `<p class="text-red-500 text-sm">Failed to load AI plans.</p>`;
      return;
    }

    const aiWorkouts = data.filter((w) => w.category?.includes("AI Generated"));

    // Render AI workouts
    if (aiContainer) {
      aiContainer.innerHTML = "";
      if (aiWorkouts.length === 0) {
        aiContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No AI-generated plans yet.</p>`;
      } else {
        aiWorkouts.forEach((workout) => {
          const exercises = workout.details?.exercises || [];
          const card = document.createElement("div");
          card.className = "flex items-center justify-between p-4 bg-slate-200 dark:bg-slate-800 rounded-lg";
          card.innerHTML = `
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">${workout.title}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">${exercises.length} exercises</p>
            </div>
            <div class="flex gap-2">
              <button class="add-to-session-ai px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors" data-id="${workout.id}" title="Add exercises to current session">
                <span class="material-symbols-outlined text-base align-middle">add</span>
              </button>
              <button class="start-ai px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors" data-id="${workout.id}">
                Run Plan
              </button>
              <button class="delete-ai px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" data-id="${workout.id}">
                <span class="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          `;
          aiContainer.appendChild(card);
        });
      }
    }

    // Bind session + delete buttons
    document.querySelectorAll(".start-ai").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const res = await fetch(`/workout/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const workout = await res.json();
        if (res.ok) {
          localStorage.setItem("activeWorkout", JSON.stringify(workout));
          window.location.href = "/session";
        } else alert("Error loading workout.");
      });
    });

    document.querySelectorAll(".delete-ai").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Delete this AI workout?")) return;
        await fetch(`/workout/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        });
        loadUserWorkouts();
      });
    });

    // Add to Session button - adds AI exercises to current session
    document.querySelectorAll(".add-to-session-ai").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
          const res = await fetch(`/workout/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const workout = await res.json();
          if (res.ok && workout.details?.exercises) {
            const exercises = workout.details.exercises;
            exercises.forEach(ex => {
              addWorkout({
                name: ex.name || ex.title || "Exercise",
                bodyPart: ex.bodyPart || ex.targetMuscles?.[0] || "",
                equipment: ex.equipment || ex.equipments?.[0] || "",
                gifUrl: ex.gifUrl || "",
                sets: ex.sets || 3,
                reps: ex.reps || 10
              });
            });
            alert(`Added ${exercises.length} exercises from "${workout.title}" to your session!`);
          } else {
            alert("Error loading workout exercises.");
          }
        } catch (err) {
          console.error("Error adding AI exercises:", err);
          alert("Failed to add exercises.");
        }
      });
    });
  } catch (err) {
    console.error("Error loading workouts:", err);
  }
}


// =======================================
// ADD HISTORY EXERCISES TO SESSION
// =======================================
function addHistoryExercisesToSession(historyExercises) {
  if (!historyExercises || !historyExercises.length) {
    alert("No exercises in this workout to add.");
    return;
  }

  let addedCount = 0;
  let skippedCount = 0;

  historyExercises.forEach((ex) => {
    const alreadyExists = selectedExercises.some(
      (sel) => sel.name.toLowerCase() === ex.name.toLowerCase()
    );

    if (alreadyExists) {
      skippedCount++;
      return;
    }

    selectedExercises.push({
      name: ex.name,
      targetMuscles: ex.targetMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      equipments: ex.equipments || [],
      instructions: ex.instructions || [],
      gifUrl: ex.gifUrl || "",
      sets: ex.totalSets || ex.sets || 3,
      reps: ex.totalReps || ex.reps || 8,
      isAI: false,
      fromHistory: true,
    });
    addedCount++;
  });

  saveSelectedToStorage();
  renderSelectedWorkouts();

  if (addedCount > 0 && skippedCount > 0) {
    alert(`Added ${addedCount} exercise(s). ${skippedCount} already in your session.`);
  } else if (addedCount > 0) {
    alert(`Added ${addedCount} exercise(s) to your session!`);
  } else {
    alert("All exercises are already in your session.");
  }

  const selectedSection = document.getElementById("selected_workouts");
  if (selectedSection) {
    selectedSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}


// =======================================
// WORKOUT HISTORY - TailwindCSS
// =======================================
function loadWorkoutHistory() {
  const container = document.getElementById("workout_history_container");
  const clearBtn = document.getElementById("btn_clear_history");
  if (!container) return;

  const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm("Are you sure you want to clear your workout history?")) {
        localStorage.removeItem("workoutHistory");
        loadWorkoutHistory();
      }
    };
  }

  if (!history.length) {
    container.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No completed sessions yet.</p>`;
    return;
  }

  container.innerHTML = "";
  history
    .slice(-10)
    .reverse()
    .forEach((entry, displayIdx) => {
      const date = new Date(entry.date);
      const mins = Math.floor(entry.durationSeconds / 60);
      const secs = entry.durationSeconds % 60;
      const workoutName = entry.name || `Workout - ${date.toLocaleDateString()}`;
      const entryId = entry.id || Date.now() + displayIdx;

      const card = document.createElement("div");
      card.className = "p-4 bg-slate-200 dark:bg-slate-800 rounded-lg";
      card.innerHTML = `
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <h3 class="font-bold text-slate-900 dark:text-white history-workout-name" data-id="${entryId}">${workoutName}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div class="flex gap-1">
            <button class="btn-edit-name text-slate-400 hover:text-primary p-1 transition-colors" title="Edit name">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button class="btn-delete-entry text-slate-400 hover:text-red-500 p-1 transition-colors" title="Delete workout" data-id="${entryId}">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
          <span class="material-symbols-outlined text-base align-middle mr-1">timer</span>
          ${mins}m ${secs}s
          ${entry.totalVolume ? ` • <span class="text-green-500 font-medium">${entry.totalVolume.toLocaleString()} lb</span> volume` : ""}
          ${entry.totalSets ? ` • ${entry.totalSets} sets` : ""}
          ${entry.totalReps ? ` • ${entry.totalReps} reps` : ""}
        </p>
        <div class="space-y-1 mb-3">
          ${entry.exercises && entry.exercises.length
          ? entry.exercises.map((ex) => `
                <div class="text-sm">
                  <span class="font-medium text-slate-700 dark:text-slate-300">${ex.name}</span>
                  <span class="text-slate-500 dark:text-slate-400"> — ${ex.totalSets || ex.sets || "-"} sets, ${ex.totalReps || ex.reps || "-"} reps</span>
                </div>
              `).join("")
          : `<p class="text-slate-500 dark:text-slate-400 text-sm">No exercise data recorded.</p>`
        }
        </div>
        ${entry.progressPhoto ? `
          <div class="mb-3">
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">photo_camera</span>
              Progress Photo
            </p>
            <img src="${entry.progressPhoto}" alt="Progress photo" class="w-full max-h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity progress-photo-thumb" data-photo-src="${entry.progressPhoto}">
          </div>
        ` : ""}
        <button class="btn-add-to-session w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <span class="material-symbols-outlined text-base">add</span>
          Add to Session
        </button>
        <button class="btn-save-to-profile w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
          <span class="material-symbols-outlined text-base">bookmark_add</span>
          Save to Profile
        </button>
      `;

      const editBtn = card.querySelector(".btn-edit-name");
      const nameEl = card.querySelector(".history-workout-name");
      if (editBtn && nameEl) {
        editBtn.addEventListener("click", () => {
          const currentName = nameEl.textContent;
          const newName = prompt("Enter new workout name:", currentName);
          if (newName && newName.trim() !== currentName) {
            updateHistoryEntryName(entryId, newName.trim());
            nameEl.textContent = newName.trim();
          }
        });
      }

      // Bind delete button
      const deleteBtn = card.querySelector(".btn-delete-entry");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          if (confirm("Delete this workout from history?")) {
            deleteHistoryEntry(entryId);
          }
        });
      }

      const addBtn = card.querySelector(".btn-add-to-session");
      if (addBtn && entry.exercises && entry.exercises.length) {
        addBtn.addEventListener("click", () => {
          addHistoryExercisesToSession(entry.exercises);
        });
      } else if (addBtn) {
        addBtn.disabled = true;
        addBtn.classList.remove("bg-primary", "hover:bg-primary/90");
        addBtn.classList.add("bg-slate-400", "cursor-not-allowed");
        addBtn.innerHTML = `<span class="material-symbols-outlined text-base">block</span> No Exercises`;
      }

      // Bind progress photo to lightbox
      const photoThumb = card.querySelector(".progress-photo-thumb");
      if (photoThumb) {
        photoThumb.addEventListener("click", () => {
          openPhotoLightbox(photoThumb.dataset.photoSrc);
        });
      }

      // Bind Save to Profile button
      const saveBtn = card.querySelector(".btn-save-to-profile");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          saveToProfile(entry);
        });
      }

      container.appendChild(card);
    });
}


// =======================================
// UPDATE HISTORY ENTRY NAME
// =======================================
function updateHistoryEntryName(entryId, newName) {
  const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
  const entry = history.find((e) => e.id === entryId);
  if (entry) {
    entry.name = newName;
    localStorage.setItem("workoutHistory", JSON.stringify(history));
  }
}

// =======================================
// DELETE HISTORY ENTRY
// =======================================
function deleteHistoryEntry(entryId) {
  let history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
  history = history.filter((e) => e.id !== entryId);
  localStorage.setItem("workoutHistory", JSON.stringify(history));
  loadWorkoutHistory(); // Refresh the display
}

// =======================================
// SAVE TO PROFILE (Server-side)
// =======================================
async function saveToProfile(entry) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("Please log in to save workouts to your profile.");
    window.location.href = "/";
    return;
  }

  try {
    const response = await fetch("/profile/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        workout_name: entry.name || "Workout",
        duration_seconds: entry.durationSeconds || 0,
        exercises: entry.exercises || [],
        progress_photo: entry.progressPhoto || null,
        completed_at: entry.date || new Date().toISOString(),
        total_volume: entry.totalVolume || 0,
        total_sets: entry.totalSets || 0,
        total_reps: entry.totalReps || 0
      })
    });

    if (response.ok) {
      alert("Workout saved to your profile! View it on your Profile page.");
    } else if (response.status === 401 || response.status === 422) {
      // JWT token expired or invalid
      alert("Your session has expired. Please log in again.");
      localStorage.removeItem("access_token");
      window.location.href = "/";
    } else {
      const data = await response.json();
      alert(data.error || "Failed to save workout");
    }
  } catch (err) {
    console.error("Error saving to profile:", err);
    alert("Error saving workout to profile");
  }
}
// =======================================
// PHOTO LIGHTBOX
// =======================================
function openPhotoLightbox(src) {
  const lightbox = document.getElementById("photo_lightbox");
  const image = document.getElementById("lightbox_image");
  if (lightbox && image) {
    image.src = src;
    lightbox.classList.remove("hidden");
    lightbox.classList.add("flex");
  }
}

function closePhotoLightbox() {
  const lightbox = document.getElementById("photo_lightbox");
  if (lightbox) {
    lightbox.classList.add("hidden");
    lightbox.classList.remove("flex");
  }
}

// Make functions globally accessible
window.openPhotoLightbox = openPhotoLightbox;
window.closePhotoLightbox = closePhotoLightbox;


// =======================================
// INIT
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedFromStorage();
  renderSelectedWorkouts();
  setupWorkoutSearch();
  loadUserWorkouts();
  loadWorkoutHistory();
  blockWorkoutAccessIfNoGoal();
});
