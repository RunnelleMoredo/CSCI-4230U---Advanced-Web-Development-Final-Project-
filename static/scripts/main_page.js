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
        document.getElementById("goal_status").innerHTML = `<span class="text-green-500">✓ Goal created!</span>`;
        document.getElementById("text_title").value = "";
        document.getElementById("text_description").value = "";
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
        aiContainer.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No AI-generated plans yet. <a href="/ai_workout" class="text-primary hover:underline">Create one →</a></p>`;
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
        completed_at: entry.date || new Date().toISOString()
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
