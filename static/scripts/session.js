// =======================================
// THEME (Tailwind dark mode)
// =======================================
function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  const checkbox = document.getElementById("theme_toggle_checkbox");
  const htmlEl = document.documentElement;

  if (saved === "light") {
    htmlEl.classList.remove("dark");
    if (checkbox) checkbox.checked = false;
  } else {
    // Default to dark
    htmlEl.classList.add("dark");
    if (checkbox) checkbox.checked = true;
  }
}
applySavedTheme();

const themeToggle = document.getElementById("theme_toggle_checkbox");
if (themeToggle) {
  themeToggle.addEventListener("change", (e) => {
    const dark = e.target.checked;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
}

// =======================================
// NAVIGATION
// =======================================
const backBtn = document.getElementById("btn_back_main");
if (backBtn) backBtn.onclick = () => (window.location.href = "/main_dashboard");

// =======================================
// SESSION GOAL MODAL
// =======================================
const goalModal = document.getElementById("goalModal");
const quickGoalBtns = document.querySelectorAll(".quick-goal");
const customGoalInput = document.getElementById("customSessionGoal");
const startSessionBtn = document.getElementById("startSessionBtn");

let sessionGoal = "";

// Quick goal button click
quickGoalBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove selected state from all buttons
    quickGoalBtns.forEach(b => {
      b.style.borderColor = "";
      b.style.backgroundColor = "";
      b.classList.remove("selected");
    });
    // Add selected state to clicked button
    btn.style.borderColor = "#2b6cee";
    btn.style.backgroundColor = "rgba(43, 108, 238, 0.15)";
    btn.classList.add("selected");
    sessionGoal = btn.dataset.goal;
    if (customGoalInput) customGoalInput.value = "";
  });
});

// Custom goal input
customGoalInput?.addEventListener("input", (e) => {
  if (e.target.value.trim()) {
    sessionGoal = e.target.value.trim();
    // Remove selected state from all quick goal buttons
    quickGoalBtns.forEach(b => {
      b.style.borderColor = "";
      b.style.backgroundColor = "";
      b.classList.remove("selected");
    });
  }
});

// Start session button
startSessionBtn?.addEventListener("click", () => {
  if (!sessionGoal) {
    alert("Please select or enter a goal for this session");
    return;
  }

  // Store goal for this session
  localStorage.setItem("currentSessionGoal", sessionGoal);

  // Show goal banner
  const goalBanner = document.getElementById("goalBanner");
  const goalText = document.getElementById("goalText");
  if (goalBanner && goalText) {
    goalText.textContent = sessionGoal;
    goalBanner.classList.remove("hidden");
  }

  // Hide modal
  goalModal.classList.add("hidden");
});

// =======================================
// SESSION RENDERING
// =======================================
const sessionContainer = document.getElementById("session_container");
const summaryOverlay = document.getElementById("summary_overlay");
const summaryTimeEl = document.getElementById("summary_time");
const summaryExercisesEl = document.getElementById("summary_exercises");
const summaryCloseBtn = document.getElementById("summary_close");

let sessionEntries = [];
let progressPhotoData = null; // Stores base64 image data

// Load workout from activeWorkout (manual or AI) or from profile saved workouts
const activeWorkout = JSON.parse(localStorage.getItem("activeWorkout") || "{}");
const sessionExercisesFromProfile = JSON.parse(localStorage.getItem("sessionExercises") || "[]");
const sessionTitleFromProfile = localStorage.getItem("sessionTitle") || "";

// Clear the sessionExercises after reading (one-time use)
if (sessionExercisesFromProfile.length > 0) {
  localStorage.removeItem("sessionExercises");
  localStorage.removeItem("sessionTitle");
}

const exercises =
  activeWorkout?.details?.exercises ||
  sessionExercisesFromProfile ||
  JSON.parse(localStorage.getItem("selectedExercises") || "[]");

// Set workout title
const workoutTitleEl = document.getElementById("workout_title");
if (workoutTitleEl) {
  workoutTitleEl.textContent = activeWorkout.title || sessionTitleFromProfile || "Workout Session";
}

if (!exercises.length) {
  sessionContainer.innerHTML = `
    <div class="text-center py-12 text-slate-500 dark:text-slate-400">
      <span class="material-symbols-outlined text-6xl mb-4 block">warning</span>
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Exercises Selected</h2>
      <p>Please return to the main dashboard and add or run a workout.</p>
      <a href="/main_dashboard" class="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors">
        Go to Dashboard
      </a>
    </div>
  `;
} else {
  sessionContainer.innerHTML = "";

  exercises.forEach((ex, idx) => {
    const card = document.createElement("div");
    card.className = "rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 p-6";

    card.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">${ex.name}</h3>
        <div class="flex items-center gap-2">
          <button class="btn-remove-exercise text-red-500 hover:bg-red-500/10 rounded-lg p-1 transition-colors" title="Remove exercise">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
          <span class="material-symbols-outlined text-slate-500 dark:text-slate-400">fitness_center</span>
        </div>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Suggested: ${ex.sets || 3} sets × ${ex.reps || 8} reps</p>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 text-left text-slate-500 dark:text-slate-400 w-1/6 text-sm font-medium">SET</th>
              <th class="px-4 py-3 text-left text-slate-500 dark:text-slate-400 w-2/6 text-sm font-medium">REPS</th>
              <th class="px-4 py-3 text-left text-slate-500 dark:text-slate-400 w-2/6 text-sm font-medium">WEIGHT (LB)</th>
              <th class="px-4 py-3 text-center text-slate-500 dark:text-slate-400 w-1/6 text-sm font-medium">✓</th>
            </tr>
          </thead>
          <tbody id="sets_${idx}">
            <!-- Sets will be added here -->
          </tbody>
        </table>
      </div>
      
      <div class="mt-4 flex justify-between items-center">
        <button class="btn-add-set flex items-center gap-1 text-primary text-sm font-bold hover:underline">
          <span class="material-symbols-outlined text-base">add</span>
          <span>Add Set</span>
        </button>
      </div>
    `;

    const setsContainer = card.querySelector(`#sets_${idx}`);
    const addSetBtn = card.querySelector(".btn-add-set");
    let setCount = 0;

    sessionEntries.push({ exercise: ex, setsContainer });

    // Add one set by default
    const addSet = () => {
      setCount += 1;
      const row = document.createElement("tr");
      row.className = "border-b border-slate-200 dark:border-slate-800 set-row";
      row.innerHTML = `
        <td class="h-14 px-4 py-2 text-slate-600 dark:text-slate-300">${setCount}</td>
        <td class="h-14 px-4 py-2">
          <input class="reps-input w-full bg-slate-200 dark:bg-background-dark border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-primary focus:border-primary px-3 py-2" type="number" value="${ex.reps || 8}" min="1">
        </td>
        <td class="h-14 px-4 py-2">
          <input class="weight-input w-full bg-slate-200 dark:bg-background-dark border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-primary focus:border-primary px-3 py-2" type="number" value="0" min="0">
        </td>
        <td class="h-14 px-4 py-2 text-center">
          <input class="set-complete w-5 h-5 rounded text-primary bg-slate-200 dark:bg-background-dark border-slate-300 dark:border-slate-700 focus:ring-primary cursor-pointer" type="checkbox">
        </td>
      `;
      setsContainer.appendChild(row);

      // Add event listeners for volume calculation
      const repsInput = row.querySelector('.reps-input');
      const weightInput = row.querySelector('.weight-input');
      const checkbox = row.querySelector('.set-complete');

      repsInput.addEventListener('input', updateSessionStats);
      weightInput.addEventListener('input', updateSessionStats);
      checkbox.addEventListener('change', updateSessionStats);
    };

    // Add first set automatically
    addSet();

    addSetBtn.addEventListener("click", addSet);

    // Remove exercise button
    const removeBtn = card.querySelector(".btn-remove-exercise");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        if (confirm(`Remove "${ex.name}" from this session?`)) {
          card.remove();
          // Remove from sessionEntries array
          const entryIdx = sessionEntries.findIndex(e => e.exercise.name === ex.name);
          if (entryIdx > -1) sessionEntries.splice(entryIdx, 1);
          updateSessionStats();
        }
      });
    }

    sessionContainer.appendChild(card);
  });

  // Finish button
  const finishBtn = document.createElement("button");
  finishBtn.textContent = "Finish Workout";
  finishBtn.className = "finish-workout-btn w-full flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors mt-6";
  finishBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Finish Workout`;
  sessionContainer.appendChild(finishBtn);

  finishBtn.addEventListener("click", async () => {
    const summaryExercises = [];
    const token = localStorage.getItem("access_token");

    sessionEntries.forEach(({ exercise, setsContainer }) => {
      const rows = setsContainer.querySelectorAll(".set-row");
      if (!rows.length) return;
      let totalSets = rows.length;
      let totalReps = 0;
      let totalVolume = 0;

      rows.forEach((row) => {
        const reps = parseInt(row.querySelector(".reps-input").value, 10) || 0;
        const weight = parseFloat(row.querySelector(".weight-input").value) || 0;
        totalReps += reps;
        totalVolume += reps * weight;
      });

      summaryExercises.push({
        name: exercise.name,
        totalSets,
        totalReps,
        totalVolume,
      });
    });

    const hours = Math.floor(timerSeconds / 3600);
    const mins = Math.floor((timerSeconds % 3600) / 60);
    const secs = timerSeconds % 60;
    summaryTimeEl.textContent = `Duration: ${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`;

    summaryExercisesEl.innerHTML = "";
    if (!summaryExercises.length) {
      summaryExercisesEl.innerHTML = `<p class="text-slate-500 dark:text-slate-400">No sets logged yet.</p>`;
    } else {
      summaryExercises.forEach((item) => {
        const row = document.createElement("div");
        row.className = "bg-slate-200 dark:bg-slate-800 rounded-lg p-3";
        row.innerHTML = `
          <p class="font-semibold text-slate-900 dark:text-white">${item.name}</p>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            ${item.totalSets} sets • ${item.totalReps} reps
            ${item.totalVolume ? ` • ${item.totalVolume.toFixed(0)} lb volume` : ""}
          </p>
        `;
        summaryExercisesEl.appendChild(row);
      });
    }

    summaryOverlay.classList.add("visible");

    try {
      await fetch("/workout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          durationSeconds: timerSeconds,
          exercises: summaryExercises,
        }),
      });
    } catch (err) {
      console.error("Failed to save workout session:", err);
    }

    summaryCloseBtn.onclick = () => {
      const workoutNameInput = document.getElementById("workout_name_input");
      const workoutName = workoutNameInput?.value.trim() || `Workout - ${new Date().toLocaleDateString()}`;

      // Calculate total session volume
      const totalSessionVolume = summaryExercises.reduce((sum, ex) => sum + (ex.totalVolume || 0), 0);
      const totalSessionSets = summaryExercises.reduce((sum, ex) => sum + (ex.totalSets || 0), 0);
      const totalSessionReps = summaryExercises.reduce((sum, ex) => sum + (ex.totalReps || 0), 0);

      saveSessionToHistory({
        name: workoutName,
        durationSeconds: timerSeconds,
        exercises: summaryExercises,
        progressPhoto: progressPhotoData,
        totalVolume: totalSessionVolume,
        totalSets: totalSessionSets,
        totalReps: totalSessionReps,
      });
      localStorage.removeItem("activeWorkout");
      localStorage.removeItem("selectedExercises");
      window.location.href = "/main_dashboard";
    };
  });
}

// =======================================
// SAVE SESSION TO LOCAL HISTORY
// =======================================
function saveSessionToHistory(payload) {
  const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
  history.push({
    id: Date.now(),
    name: payload.name || `Workout - ${new Date().toLocaleDateString()}`,
    date: new Date().toISOString(),
    durationSeconds: payload.durationSeconds,
    exercises: payload.exercises,
    progressPhoto: payload.progressPhoto || null,
    totalVolume: payload.totalVolume || 0,
    totalSets: payload.totalSets || 0,
    totalReps: payload.totalReps || 0,
  });
  localStorage.setItem("workoutHistory", JSON.stringify(history));
}

// =======================================
// TIMER
// =======================================
const timerHoursEl = document.getElementById("timer_hours");
const timerMinutesEl = document.getElementById("timer_minutes");
const timerSecondsEl = document.getElementById("timer_seconds");
const timerDisplay = document.getElementById("timer_display");
const btnStart = document.getElementById("btn_timer_start");
const btnPause = document.getElementById("btn_timer_pause");
const btnReset = document.getElementById("btn_timer_reset");

let timerSeconds = 0;
let timerId = null;

function renderTime() {
  const h = String(Math.floor(timerSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(timerSeconds % 60).padStart(2, "0");

  if (timerHoursEl) timerHoursEl.textContent = h;
  if (timerMinutesEl) timerMinutesEl.textContent = m;
  if (timerSecondsEl) timerSecondsEl.textContent = s;
  if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;
}

btnStart?.addEventListener("click", () => {
  if (timerId !== null) return;
  // Update button to show playing state
  btnStart.innerHTML = `<span class="material-symbols-outlined">hourglass_top</span><span class="truncate">Running...</span>`;
  timerId = setInterval(() => {
    timerSeconds++;
    renderTime();
  }, 1000);
});

btnPause?.addEventListener("click", () => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
    btnStart.innerHTML = `<span class="material-symbols-outlined">play_arrow</span><span class="truncate">Resume</span>`;
  }
});

btnReset?.addEventListener("click", () => {
  timerSeconds = 0;
  renderTime();
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  btnStart.innerHTML = `<span class="material-symbols-outlined">play_arrow</span><span class="truncate">Start</span>`;
});

renderTime();

// =======================================
// PROGRESS PHOTO UPLOAD
// =======================================
const photoUploadArea = document.getElementById("photo_upload_area");
const photoInput = document.getElementById("progress_photo_input");
const photoPlaceholder = document.getElementById("photo_placeholder");
const photoPreviewContainer = document.getElementById("photo_preview_container");
const photoPreview = document.getElementById("photo_preview");
const removePhotoBtn = document.getElementById("remove_photo_btn");

// Click upload area to trigger file input
if (photoUploadArea && photoInput) {
  photoUploadArea.addEventListener("click", (e) => {
    // Don't trigger if clicking the remove button
    if (e.target.closest("#remove_photo_btn")) return;
    photoInput.click();
  });

  // Handle file selection
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Please select an image under 5MB.");
      return;
    }

    // Read and preview
    const reader = new FileReader();
    reader.onload = (event) => {
      progressPhotoData = event.target.result; // Store base64 data
      photoPreview.src = progressPhotoData;
      photoPlaceholder.classList.add("hidden");
      photoPreviewContainer.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
}

// Remove photo button
if (removePhotoBtn) {
  removePhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    progressPhotoData = null;
    photoInput.value = "";
    photoPreview.src = "";
    photoPreviewContainer.classList.add("hidden");
    photoPlaceholder.classList.remove("hidden");
  });
}

// =======================================
// SESSION STATS (Volume Calculator)
// =======================================
function updateSessionStats() {
  const allRows = document.querySelectorAll('.set-row');
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  allRows.forEach(row => {
    const checkbox = row.querySelector('.set-complete');
    const repsInput = row.querySelector('.reps-input');
    const weightInput = row.querySelector('.weight-input');

    // Only count completed sets for volume
    if (checkbox && checkbox.checked) {
      const reps = parseInt(repsInput?.value) || 0;
      const weight = parseFloat(weightInput?.value) || 0;

      totalSets++;
      totalReps += reps;
      totalVolume += reps * weight;
    }
  });

  // Update display
  const volumeEl = document.getElementById('totalVolume');
  const setsEl = document.getElementById('totalSets');
  const repsEl = document.getElementById('totalReps');

  if (volumeEl) volumeEl.textContent = totalVolume.toLocaleString();
  if (setsEl) setsEl.textContent = totalSets;
  if (repsEl) repsEl.textContent = totalReps;
}
