// =======================================
// THEME TOGGLE
// =======================================
const themeCheckbox = document.getElementById("theme_toggle_checkbox");

function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
        document.body.classList.add("dark-mode");
        if (themeCheckbox) themeCheckbox.checked = true;
    } else {
        document.body.classList.remove("dark-mode");
        if (themeCheckbox) themeCheckbox.checked = false;
    }
}

if (themeCheckbox) {
    themeCheckbox.addEventListener("change", () => {
        const dark = themeCheckbox.checked;
        document.body.classList.toggle("dark-mode", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
    });
}

applySavedTheme();


// =======================================
// LOGOUT
// =======================================
const logoutBtn = document.getElementById('btn_logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });
}


// =======================================
// GO TO GOALS PAGE
// =======================================
const goalsBtn = document.getElementById('btn_goals');
if (goalsBtn) {
    goalsBtn.addEventListener('click', () => {
        window.location.href = '/goals_page';
    });
}


// =======================================
// GOAL SYSTEM (localStorage-based enforcement)
// =======================================
function markGoalCreated() {
    localStorage.setItem("hasGoal", "true");
}

function userHasGoal() {
    return localStorage.getItem("hasGoal") === "true";
}

function blockWorkoutAccessIfNoGoal() {
    const searchBox = document.getElementById("find_workout");
    const searchBtn = document.getElementById("btn_find_workout");

    if (!userHasGoal()) {
        if (searchBox) searchBox.disabled = true;
        if (searchBtn) searchBtn.disabled = true;
        if (startSessionBtn) startSessionBtn.disabled = true;

        const selectedArea = document.getElementById("selected_workouts");
        if (selectedArea) {
            selectedArea.innerHTML = `
                <div class="no-goal-warning">
                    <p>You must create a goal before planning a workout.</p>
                </div>
            `;
        }
    } else {
        const searchBtn = document.getElementById("btn_find_workout");
        const searchBox = document.getElementById("find_workout");

        if (searchBox) searchBox.disabled = false;
        if (searchBtn) searchBtn.disabled = false;
        if (startSessionBtn) startSessionBtn.disabled = false;

        renderSelectedWorkouts();
    }
}


// =======================================
// CREATE GOAL
// =======================================
const submitGoalBtn = document.getElementById('btn_submit');
const goalStatusEl = document.getElementById('goal_status');

if (submitGoalBtn) {
    submitGoalBtn.addEventListener('click', async () => {
        const title = document.getElementById('text_title').value.trim();
        const description = document.getElementById('text_description').value.trim();
        const token = localStorage.getItem("access_token");

        if (!title) {
            goalStatusEl.textContent = "Title required";
            alert("Title required");
            return;
        }

        try {
            const response = await fetch("/goals/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ title, description })
            });

            const data = await response.json();

            if (response.ok) {
                goalStatusEl.textContent = "Goal created successfully (success)";
                alert("Goal created successfully!");

                // Mark goal as created
                markGoalCreated();
                blockWorkoutAccessIfNoGoal();

                document.getElementById("text_title").value = "";
                document.getElementById("text_description").value = "";
            } else {
                const msg = data.error || "Failed to create goal.";
                goalStatusEl.textContent = msg;
                alert(msg);
            }
        } catch (err) {
            console.error(err);
            goalStatusEl.textContent = "Network error";
            alert("Network error.");
        }
    });
}


// =======================================
// WORKOUT SYSTEM
// =======================================
const token = localStorage.getItem('access_token');
const searchInput = document.getElementById('find_workout');
const searchResults = document.getElementById('search_results');
const selectedList = document.getElementById('selected_workouts');

let selectedExercises = [];

function loadSelectedFromStorage() {
    try {
        const stored = localStorage.getItem('selectedExercises');
        if (stored) selectedExercises = JSON.parse(stored);
    } catch {
        selectedExercises = [];
    }
}

function saveSelectedToStorage() {
    localStorage.setItem('selectedExercises', JSON.stringify(selectedExercises));
}


// =======================================
// START SESSION BUTTON
// =======================================
let startSessionBtn = null;
if (selectedList && selectedList.parentNode) {
    startSessionBtn = document.createElement('button');
    startSessionBtn.id = 'btn_start_session';
    startSessionBtn.textContent = 'Start Workout Session';
    startSessionBtn.className = 'btn btn-accent';
    startSessionBtn.style.marginTop = '10px';
    selectedList.parentNode.appendChild(startSessionBtn);

    startSessionBtn.addEventListener('click', () => {
        if (!selectedExercises.length) {
            alert('Select at least one workout first.');
            return;
        }
        saveSelectedToStorage();
        window.location.href = '/session';
    });
}


// =======================================
// MODAL
// =======================================
function openModal(exercise) {
    const container = document.getElementById('modal_container');
    if (!container) return;

    document.getElementById('modal_name').textContent = exercise.name || "";
    document.getElementById('modal_target_muscles').textContent = (exercise.targetMuscles || []).join(", ");
    document.getElementById('modal_secondary_muscles').textContent = (exercise.secondaryMuscles || []).join(", ");
    document.getElementById('modal_equipment').textContent = (exercise.equipments || []).join(", ");
    document.getElementById('modal_instructions').innerHTML =
        Array.isArray(exercise.instructions)
            ? exercise.instructions.map(i => `• ${i}`).join("<br>")
            : exercise.instructions || "";

    document.getElementById('modal_gif').src = exercise.gifUrl || "";

    container.style.display = 'flex';
}

const closeModalBtn = document.getElementById('btn_close_modal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        document.getElementById('modal_container').style.display = 'none';
    });
}


// =======================================
// RENDER SELECTED WORKOUTS
// =======================================
function renderSelectedWorkouts() {
    if (!selectedList) return;

    selectedList.innerHTML = "";

    if (!selectedExercises.length) {
        selectedList.innerHTML = `<div>No workouts selected yet.</div>`;
        if (startSessionBtn) startSessionBtn.disabled = true;
        return;
    }

    if (startSessionBtn) startSessionBtn.disabled = false;

    selectedExercises.forEach((ex, index) => {
        const card = document.createElement('div');
        card.className = 'workout-card selected-workout-item';

        card.innerHTML = `
            <strong style="cursor:pointer">${ex.name}</strong>
            <label> Sets: </label>
            <input type="number" min="1" value="${ex.sets || 3}" style="width:50px">
            <label> Reps: </label>
            <input type="number" min="1" value="${ex.reps || 8}" style="width:50px">
            <button class="btn btn-outline">Remove</button>
        `;

        card.querySelector("strong").addEventListener("click", () => openModal(ex));

        const setsInput = card.querySelectorAll("input")[0];
        const repsInput = card.querySelectorAll("input")[1];
        const removeBtn = card.querySelector("button");

        setsInput.addEventListener("change", (e) => {
            selectedExercises[index].sets = parseInt(e.target.value) || 1;
            saveSelectedToStorage();
        });

        repsInput.addEventListener("change", (e) => {
            selectedExercises[index].reps = parseInt(e.target.value) || 1;
            saveSelectedToStorage();
        });

        removeBtn.addEventListener("click", () => {
            selectedExercises.splice(index, 1);
            saveSelectedToStorage();
            renderSelectedWorkouts();
        });

        selectedList.appendChild(card);
    });
}


// =======================================
// ADD WORKOUT
// =======================================
function addWorkout(exercise) {
    if (!userHasGoal()) {
        alert("Create a goal first!");
        return;
    }

    if (selectedExercises.some(ex => ex.name === exercise.name)) {
        alert("Workout already selected.");
        return;
    }

    selectedExercises.push({
        name: exercise.name,
        targetMuscles: exercise.targetMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        equipments: exercise.equipments || [],
        instructions: exercise.instructions || [],
        gifUrl: exercise.gifUrl,
        sets: 3,
        reps: 8
    });

    saveSelectedToStorage();
    renderSelectedWorkouts();
}


// =======================================
// WORKOUT SEARCH
// =======================================
const searchBtn = document.getElementById("btn_find_workout");

if (searchBtn && searchInput && searchResults) {

    searchBtn.addEventListener("click", async () => {

        if (!userHasGoal()) {
            alert("Please create a goal first.");
            return;
        }

        const query = searchInput.value.trim();
        if (!query) {
            alert("Enter a search term.");
            return;
        }

        searchResults.innerHTML = "<p>Loading...</p>";

        try {
            const response = await fetch(`/workout/search?q=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: { "Authorization": "Bearer " + token }
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                searchResults.innerHTML = "<p>Failed to load exercises.</p>";
                return;
            }

            if (!Array.isArray(data) || !data.length) {
                searchResults.innerHTML = "<p>No exercises found.</p>";
                return;
            }

            searchResults.innerHTML = "";

            data.forEach(exercise => {
                const card = document.createElement("div");
                card.className = "workout-card";

                card.innerHTML = `
                    <img src="${exercise.gifUrl}" class="workout-gif-banner">

                    <div class="workout-info">
                        <h3>${exercise.name}</h3>
                        <p><strong>Target:</strong> ${(exercise.targetMuscles || []).join(", ")}</p>
                        <p><strong>Equipment:</strong> ${(exercise.equipments || []).join(", ")}</p>
                    </div>

                    <div class="workout-actions">
                        <button class="btn btn-accent btn-add">Add</button>
                        <button class="btn btn-outline btn-details">Details</button>
                    </div>
                `;

                card.addEventListener("click", (e) => {
                    if (e.target.closest(".btn-details")) return;
                    addWorkout(exercise);
                });

                card.querySelector(".btn-add").addEventListener("click", (e) => {
                    e.stopPropagation();
                    addWorkout(exercise);
                });

                card.querySelector(".btn-details").addEventListener("click", (e) => {
                    e.stopPropagation();
                    openModal(exercise);
                });

                searchResults.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            searchResults.innerHTML = "<p>Error fetching exercises.</p>";
        }
    });
}


// =======================================
// WORKOUT HISTORY
// =======================================
function loadWorkoutHistory() {
    const historyCard = document.getElementById("history_card");
    const list = document.getElementById("history_list");

    if (!historyCard || !list) return;

    const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");

    if (!history.length) {
        historyCard.style.display = "none";
        return;
    }

    historyCard.style.display = "block";
    list.innerHTML = "";

    history.forEach((entry, idx) => {
        const date = new Date(entry.date);
        const duration = `${Math.floor(entry.durationSeconds / 60)}m ${entry.durationSeconds % 60}s`;

        const div = document.createElement("div");
        div.className = "history-entry";

        div.innerHTML = `
            <div class="history-header" data-index="${idx}">
                <span>${date.toLocaleString()}</span>
                <span>${duration} ▾</span>
            </div>

            <div class="history-details" id="history_details_${idx}">
                ${entry.exercises.map(ex => `
                    <div class="history-row">
                        <strong>${ex.name}</strong><br>
                        Sets: ${ex.totalSets}, Reps: ${ex.totalReps}
                        ${ex.totalVolume ? `, Volume: ${ex.totalVolume.toFixed(1)} kg` : ""}
                    </div>
                `).join("")}
            </div>
        `;

        list.appendChild(div);
    });

    document.querySelectorAll(".history-header").forEach(header => {
        header.addEventListener("click", () => {
            const id = header.dataset.index;
            const details = document.getElementById(`history_details_${id}`);
            details.style.display = details.style.display === "block" ? "none" : "block";
        });
    });
}

const clearHistoryBtn = document.getElementById("btn_clear_history");
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
        if (confirm("Clear all workout history?")) {
            localStorage.removeItem("workoutHistory");
            loadWorkoutHistory();
        }
    });
}
// =======================================
// MAIN PAGE: Beginner / Intermediate Selector
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  const beginner = document.getElementById("beginnerCard");
  const intermediate = document.getElementById("intermediateCard");

  // Only run on the selector screen
  if (!beginner || !intermediate) return;

  function animateExit() {
    document.querySelectorAll(".mode-card").forEach((card) => {
      card.style.transform = "scale(0.8)";
      card.style.opacity = "0";
      card.style.transition = "all 0.5s ease";
    });
    const container = document.querySelector(".container");
    if (container) container.style.opacity = "0";
  }

  // Beginner → AI Workout
  beginner.addEventListener("click", () => {
    animateExit();
    setTimeout(() => {
      window.location.href = "/ai_workout?mode=beginner";
    }, 600);
  });

  // Intermediate → Original dashboard
  intermediate.addEventListener("click", () => {
    animateExit();
    setTimeout(() => {
      window.location.href = "/main_dashboard";
    }, 600);
  });

  // Smooth entry fade
  window.addEventListener("load", () => {
    const container = document.querySelector(".container");
    if (container) {
      container.style.opacity = "0";
      setTimeout(() => {
        container.style.transition = "opacity 1.4s ease";
        container.style.opacity = "1";
      }, 100);
    }
  });
});



// =======================================
// INIT
// =======================================
loadSelectedFromStorage();
renderSelectedWorkouts();
loadWorkoutHistory();
blockWorkoutAccessIfNoGoal();