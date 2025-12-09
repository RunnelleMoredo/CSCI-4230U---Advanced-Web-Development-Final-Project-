/**
 * Food Search Page JavaScript
 * Handles food search via CalorieNinjas API and adding to log
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
// FOOD SEARCH
// =======================================
const searchBtn = document.getElementById("btn_food_search");
const searchInput = document.getElementById("food_search_input");
const searchResults = document.getElementById("search_results");

async function searchFood(query) {
    if (!query.trim()) {
        alert("Please enter a food name to search");
        return;
    }

    const token = localStorage.getItem("access_token");

    searchBtn.disabled = true;
    const originalHTML = searchBtn.innerHTML;
    searchBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Searching...`;

    searchResults.innerHTML = `
    <div class="text-center py-8">
      <span class="material-symbols-outlined text-4xl text-green-500 animate-pulse">search</span>
      <p class="text-slate-400 mt-2">Searching for "${query}"...</p>
    </div>
  `;

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
            const sourceLabel = data.source === "calorieninjas" ? "CalorieNinjas" : (data.source === "usda" ? "USDA Database" : "Local Database");
            searchResults.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-slate-400">Found ${data.meals.length} results from ${sourceLabel}</p>
          <span class="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">${sourceLabel}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${data.meals.map(meal => `
            <div class="food-card flex items-center gap-4 p-4 bg-slate-200 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-green-500/50"
                 onclick='openServingModal(${JSON.stringify(meal).replace(/'/g, "\\'")})'>
              <div class="text-4xl">${getFoodEmoji(meal.food_name)}</div>
              <div class="flex-1">
                <p class="font-semibold text-slate-900 dark:text-white">${meal.food_name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Per ${meal.serving || 100}g</p>
                <div class="flex gap-2 mt-1 text-xs">
                  <span class="text-green-500">${meal.protein || 0}g P</span>
                  <span class="text-blue-500">${meal.carbs || 0}g C</span>
                  <span class="text-red-500">${meal.fat || 0}g F</span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-2xl font-bold text-amber-500">${meal.calories || 0}</p>
                <p class="text-xs text-slate-400">calories</p>
              </div>
            </div>
          `).join("")}
        </div>
      `;
        } else {
            searchResults.innerHTML = `
        <div class="text-center py-12 text-slate-500">
          <span class="material-symbols-outlined text-6xl mb-4 block text-red-400">search_off</span>
          <p class="text-lg font-medium">${data.error || "No foods found"}</p>
          <p class="text-sm mt-2">Try a different search term</p>
        </div>
      `;
        }
    } catch (e) {
        console.error("Food search error:", e);
        searchResults.innerHTML = `
      <div class="text-center py-12 text-red-400">
        <span class="material-symbols-outlined text-6xl mb-4 block">error</span>
        <p>Failed to search. Please try again.</p>
      </div>
    `;
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalHTML;
    }
}

if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => searchFood(searchInput.value));
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchFood(searchInput.value);
    });
}

// Quick food buttons
document.querySelectorAll(".quick-food-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const food = btn.dataset.food;
        searchInput.value = food;
        searchFood(food);
    });
});

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
    const multiplier = amount / baseServing;

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
    const multiplier = amount / baseServing;

    // Add to food log in localStorage
    const today = new Date().toDateString();
    let foodLog = JSON.parse(localStorage.getItem("todayFoodLog") || "[]");
    const savedDate = localStorage.getItem("foodLogDate");

    if (savedDate !== today) {
        foodLog = [];
        localStorage.setItem("foodLogDate", today);
    }

    foodLog.push({
        name: selectedFood.food_name,
        calories: Math.round(selectedFood.calories * multiplier),
        serving: `${amount}g`,
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10
    });

    localStorage.setItem("todayFoodLog", JSON.stringify(foodLog));

    // Show success message
    alert(`Added ${selectedFood.food_name} (${amount}g) to your food log!`);

    servingModal?.classList.add("hidden");
    servingModal?.classList.remove("flex");
});
