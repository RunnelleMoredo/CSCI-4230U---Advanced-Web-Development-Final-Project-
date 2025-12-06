// =======================================
// THEME TOGGLE
// =======================================
const themeCheckbox = document.getElementById("theme_toggle_checkbox");

function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  document.body.classList.toggle("dark-mode", saved === "dark");
  if (themeCheckbox) themeCheckbox.checked = saved === "dark";
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
// CREATE GOAL
// =======================================
const submitGoalBtn = document.getElementById("btn_submit");
if (submitGoalBtn) {
  submitGoalBtn.addEventListener("click", async () => {
    const title = document.getElementById("text_title").value.trim();
    const description = document.getElementById("text_description").value.trim();
    const token = localStorage.getItem("access_token");

    if (!title) return alert("Title required");

    try {
      const res = await fetch("/goals/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Goal created successfully!");
        markGoalCreated();
        blockWorkoutAccessIfNoGoal();
      } else {
        alert(data.error || "Failed to create goal.");
      }
    } catch {
      alert("Network error.");
    }
  });
}


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
// RENDER MANUAL WORKOUTS
// =======================================
function renderSelectedWorkouts() {
  const selectedList = document.getElementById("selected_workouts");
  if (!selectedList) return;
  selectedList.innerHTML = "";

  if (!selectedExercises.length) {
    selectedList.innerHTML = `<div class="empty-state">No workouts selected yet.</div>`;
    const existingBtn = document.getElementById("btn_start_session");
    if (existingBtn) existingBtn.remove();
    return;
  }

  selectedExercises.forEach((ex, idx) => {
    const card = document.createElement("div");
    card.className = "workout-card selected-workout-item" + (ex.fromHistory ? " from-history" : "");

    const historyBadge = ex.fromHistory
      ? '<span class="from-history-badge">History</span>'
      : '';

    card.innerHTML = `
      <strong class="exercise-title" style="cursor:pointer">${ex.name}${historyBadge}</strong>
      <div class="set-rep-row">
        <label>Sets:</label>
        <input type="number" min="1" value="${ex.sets || 3}" class="input-sets">
        <label>Reps:</label>
        <input type="number" min="1" value="${ex.reps || 8}" class="input-reps">
        <button class="btn btn-outline btn-remove">Remove</button>
      </div>
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
    startSessionBtn.textContent = "Start Manual Session";
    startSessionBtn.className = "btn btn-accent full-width";
    startSessionBtn.style.marginTop = "15px";
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
  document.getElementById("modal_target_muscles").textContent = (ex.targetMuscles || []).join(", ");
  document.getElementById("modal_secondary_muscles").textContent = (ex.secondaryMuscles || []).join(", ");
  document.getElementById("modal_equipment").textContent = (ex.equipments || []).join(", ");
  document.getElementById("modal_instructions").innerHTML = Array.isArray(ex.instructions)
    ? ex.instructions.map((i) => `• ${i}`).join("<br>")
    : ex.instructions || "";
  document.getElementById("modal_gif").src = ex.gifUrl || "";
  container.style.display = "flex";
}
const closeModalBtn = document.getElementById("btn_close_modal");
if (closeModalBtn)
  closeModalBtn.onclick = () => (document.getElementById("modal_container").style.display = "none");


// =======================================
// SEARCH WORKOUTS (MANUAL)
// =======================================
async function setupWorkoutSearch() {
  const searchBtn = document.getElementById("btn_find_workout");
  const searchInput = document.getElementById("find_workout");
  const searchResults = document.getElementById("search_results");
  if (!searchBtn || !searchInput || !searchResults) return;

  searchBtn.onclick = async () => {
    if (!userHasGoal()) return alert("Create a goal first.");
    const query = searchInput.value.trim();
    if (!query) return alert("Enter a search term.");
    searchResults.innerHTML = "<p>Loading...</p>";
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`/workout/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();

      if (!res.ok || !Array.isArray(data) || !data.length) {
        searchResults.innerHTML = "<p>No exercises found.</p>";
        return;
      }

      searchResults.innerHTML = "";
      data.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "workout-card";
        card.innerHTML = `
          <img src="${ex.gifUrl}" class="workout-gif-banner">
          <div class="workout-info">
            <h3>${ex.name}</h3>
            <p><strong>Target:</strong> ${(ex.targetMuscles || []).join(", ")}</p>
            <p><strong>Equipment:</strong> ${(ex.equipments || []).join(", ")}</p>
          </div>
          <div class="workout-actions">
            <button class="btn btn-accent btn-add">Add</button>
            <button class="btn btn-outline btn-details">Details</button>
          </div>`;
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
      searchResults.innerHTML = "<p>Error fetching exercises.</p>";
    }
  };
}


// =======================================
// LOAD USER WORKOUTS (Manual + AI)
// =======================================
async function loadUserWorkouts() {
  const token = localStorage.getItem("access_token");
  const manualContainer = document.getElementById("selected_workouts");
  const aiContainer = document.getElementById("ai_workouts_container");
  if (!token || !manualContainer) return;

  try {
    const res = await fetch("/workout/all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      manualContainer.innerHTML = "<p>Failed to load workouts.</p>";
      if (aiContainer) aiContainer.innerHTML = "<p>Failed to load AI plans.</p>";
      return;
    }

    const manualWorkouts = data.filter((w) => !w.category?.includes("AI Generated"));
    const aiWorkouts = data.filter((w) => w.category?.includes("AI Generated"));

    // Render manual workouts
    manualContainer.innerHTML = "";
    manualWorkouts.forEach((workout) => {
      const exercises = workout.details?.exercises || [];
      const card = document.createElement("div");
      card.className = "workout-card";
      card.innerHTML = `
        <h3>${workout.title}</h3>
        <p><strong>Exercises:</strong> ${exercises.length}</p>
        <div class="actions">
          <button class="btn btn-accent start-session" data-id="${workout.id}">
            Start Session
          </button>
        </div>`;
      manualContainer.appendChild(card);
    });

    // Render AI workouts
    if (aiContainer) {
      aiContainer.innerHTML = "";
      if (aiWorkouts.length === 0) {
        aiContainer.innerHTML = "<p>No AI-generated plans yet.</p>";
      } else {
        aiWorkouts.forEach((workout) => {
          const exercises = workout.details?.exercises || [];
          const card = document.createElement("div");
          card.className = "workout-card";
          card.innerHTML = `
            <h3>${workout.title}</h3>
            <p><strong>Exercises:</strong> ${exercises.length}</p>
            <div class="actions">
              <button class="btn btn-accent start-ai" data-id="${workout.id}">
                Run Plan
              </button>
              <button class="btn btn-danger delete-ai" data-id="${workout.id}">
                Delete
              </button>
            </div>`;
          aiContainer.appendChild(card);
        });
      }
    }

    // Bind session + delete buttons
    document.querySelectorAll(".start-session, .start-ai").forEach((btn) => {
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
        const id = e.target.dataset.id;
        if (!confirm("Delete this AI workout?")) return;
        await fetch(`/workout/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        });
        loadUserWorkouts();
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
    // Check if exercise already exists in selected
    const alreadyExists = selectedExercises.some(
      (sel) => sel.name.toLowerCase() === ex.name.toLowerCase()
    );

    if (alreadyExists) {
      skippedCount++;
      return;
    }

    // Convert history format to selectedExercises format
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
      fromHistory: true, // Mark as coming from history
    });
    addedCount++;
  });

  saveSelectedToStorage();
  renderSelectedWorkouts();

  // Provide feedback
  if (addedCount > 0 && skippedCount > 0) {
    alert(`Added ${addedCount} exercise(s). ${skippedCount} already in your session.`);
  } else if (addedCount > 0) {
    alert(`Added ${addedCount} exercise(s) to your session!`);
  } else {
    alert("All exercises are already in your session.");
  }

  // Scroll to the selected workouts section
  const selectedSection = document.getElementById("selected_workouts");
  if (selectedSection) {
    selectedSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}


// =======================================
// WORKOUT HISTORY (Detailed)
// =======================================
function loadWorkoutHistory() {
  const container = document.getElementById("workout_history_container");
  const clearBtn = document.getElementById("btn_clear_history");
  if (!container) return;

  const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");

  // --- Clear history button ---
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm("Are you sure you want to clear your workout history?")) {
        localStorage.removeItem("workoutHistory");
        loadWorkoutHistory();
      }
    };
  }

  // --- Empty state ---
  if (!history.length) {
    container.innerHTML = "<p>No completed sessions yet.</p>";
    return;
  }

  // --- Render history entries ---
  container.innerHTML = "";
  history
    .slice(-10) // last 10
    .reverse()  // newest first
    .forEach((entry, displayIdx) => {
      const date = new Date(entry.date);
      const mins = Math.floor(entry.durationSeconds / 60);
      const secs = entry.durationSeconds % 60;
      const workoutName = entry.name || `Workout - ${date.toLocaleDateString()}`;
      const entryId = entry.id || Date.now() + displayIdx; // fallback for old entries

      const card = document.createElement("div");
      card.className = "workout-card history-card";
      card.innerHTML = `
        <div class="history-card-header">
          <h3 class="history-workout-name" data-id="${entryId}">${workoutName}</h3>
          <button class="btn btn-outline btn-edit-name" title="Edit name">✏️</button>
        </div>
        <p class="history-date">${date.toLocaleDateString()} — ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}</p>
        <p><strong>Duration:</strong> ${mins}m ${secs}s</p>
        <div class="history-exercises">
          <h4>Exercises:</h4>
          ${entry.exercises && entry.exercises.length
          ? entry.exercises
            .map(
              (ex) => `
                <div class="exercise-summary">
                  <strong>${ex.name}</strong><br>
                  Sets: ${ex.totalSets || ex.sets || "-"}, 
                  Reps: ${ex.totalReps || ex.reps || "-"} 
                  ${ex.totalVolume
                  ? `, Volume: ${ex.totalVolume.toFixed(1)} kg`
                  : ""
                }
                </div>
              `
            )
            .join("")
          : "<p>No exercise data recorded.</p>"
        }
        </div>
        <div class="history-card-actions">
          <button class="btn btn-accent btn-add-to-session">Add to Session</button>
        </div>
      `;

      // Bind edit name button
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

      // Bind add to session button
      const addBtn = card.querySelector(".btn-add-to-session");
      if (addBtn && entry.exercises && entry.exercises.length) {
        addBtn.addEventListener("click", () => {
          addHistoryExercisesToSession(entry.exercises);
        });
      } else if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = "No Exercises";
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
