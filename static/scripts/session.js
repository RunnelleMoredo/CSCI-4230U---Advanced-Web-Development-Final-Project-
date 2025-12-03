// ======= THEME (shared with main) =======
function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    const checkbox = document.getElementById("theme_toggle_checkbox");

    if (saved === "dark") {
        document.body.classList.add("dark-mode");
        if (checkbox) checkbox.checked = true;
    } else {
        document.body.classList.remove("dark-mode");
        if (checkbox) checkbox.checked = false;
    }
}
applySavedTheme();

const themeToggle = document.getElementById("theme_toggle_checkbox");
if (themeToggle) {
    themeToggle.addEventListener("change", (e) => {
        const dark = e.target.checked;
        document.body.classList.toggle("dark-mode", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
    });
}

// =============== NAVIGATION ===============
document.getElementById("btn_back_main").addEventListener("click", () => {
    window.location.href = "/main";
});


// ============== RENDER SESSION =================
const sessionContainer = document.getElementById("session_container");
const exercises = JSON.parse(localStorage.getItem("selectedExercises") || "[]");

// Track containers for summary
const sessionEntries = [];

if (!exercises.length) {
    sessionContainer.innerHTML = `
            <h2>No Exercises Selected</h2>
            <p>Please return to the main page and add some workouts.</p>
        `;
} else {
    sessionContainer.innerHTML = `<h2 class="section-heading">Today's Workout</h2>`;

    exercises.forEach((ex, idx) => {
        const card = document.createElement("div");
        card.className = "workout-card selected-card session-exercise-card";

        card.innerHTML = `
                <div class="session-exercise-header">
                    <div>
                        <h3>${ex.name}</h3>
                        <p class="session-exercise-meta">
                            Suggested: ${ex.sets} sets × ${ex.reps} reps
                        </p>
                    </div>
                    <img src="${ex.gifUrl || ""}" class="workout-gif session-gif" alt="${ex.name}">
                </div>

                <div id="sets_${idx}" class="logged-sets"></div>

                <div class="session-card-footer">
                    <button class="btn btn-outline btn-add-set">Add Set</button>
                </div>
            `;

        const setsContainer = card.querySelector(`#sets_${idx}`);
        const addSetBtn = card.querySelector(".btn-add-set");
        let setCount = 0;

        sessionEntries.push({ exercise: ex, setsContainer });

        addSetBtn.addEventListener("click", () => {
            setCount += 1;
            const row = document.createElement("div");
            row.className = "logged-set-row";
            row.innerHTML = `
                    <span class="set-label">Set ${setCount}</span>
                    <div class="set-inputs">
                        <span>Reps</span>
                        <input type="number" min="1" value="${ex.reps}" />
                        <span>Weight (lb)</span>
                        <input type="number" min="0" value="0" />
                        <button class="btn btn-danger btn-remove-set">x</button>
                    </div>
                `;
            row.querySelector(".btn-remove-set").addEventListener("click", () => {
                row.remove();
            });
            setsContainer.appendChild(row);
        });

        sessionContainer.appendChild(card);
    });

    const finishBtn = document.createElement("button");
    finishBtn.textContent = "Finish Workout";
    finishBtn.className = "btn btn-accent finish-workout-btn";
    finishBtn.id = "btn_finish_workout";

    sessionContainer.appendChild(finishBtn);

    const summaryOverlay = document.getElementById("summary_overlay");
    const summaryTimeEl = document.getElementById("summary_time");
    const summaryExercisesEl = document.getElementById("summary_exercises");
    const summaryCloseBtn = document.getElementById("summary_close");

    finishBtn.addEventListener("click", async () => {
        // Build summary
        const summaryExercises = [];
        const token = localStorage.getItem("access_token");

        sessionEntries.forEach(({ exercise, setsContainer }) => {
            const rows = setsContainer.querySelectorAll(".logged-set-row");
            if (!rows.length) return;

            let totalSets = rows.length;
            let totalReps = 0;
            let totalVolume = 0;

            rows.forEach(row => {
                const inputs = row.querySelectorAll("input");
                const reps = parseInt(inputs[0].value, 10) || 0;
                const weight = parseFloat(inputs[1].value) || 0;

                totalReps += reps;
                totalVolume += reps * weight;
            });

            summaryExercises.push({
                name: exercise.name,
                totalSets,
                totalReps,
                totalVolume
            });


        });

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        summaryTimeEl.textContent = `Duration: ${mins}m ${secs}s`;

        summaryExercisesEl.innerHTML = "";
        if (!summaryExercises.length) {
            summaryExercisesEl.innerHTML = "<p>No sets logged yet.</p>";
        } else {
            summaryExercises.forEach(item => {
                const row = document.createElement("div");
                row.className = "summary-row";
                row.innerHTML = `
                        <strong>${item.name}</strong><br>
                        Sets: ${item.totalSets}, Total reps: ${item.totalReps}
                        ${item.totalVolume ? `, Volume: ${item.totalVolume.toFixed(1)} kg` : ""}
                    `;
                summaryExercisesEl.appendChild(row);
            });
        }

        summaryOverlay.classList.add("visible");

        try{
            await fetch("/workout/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    durationSeconds: seconds,
                    exercises: summaryExercises
                })
            });
        } catch(err){
            console.error("Failed to save session:", err);
        }

        summaryCloseBtn.onclick = () => {
            saveSessionToHistory({
                durationSeconds: seconds,
                exercises: summaryExercises
            });
            localStorage.removeItem("selectedExercises");
            window.location.href = "/main";
        };
    });
}

// Save history to localStorage
function saveSessionToHistory(payload) {
    const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    history.push({
        date: new Date().toISOString(),
        durationSeconds: payload.durationSeconds,
        exercises: payload.exercises
    });
    localStorage.setItem("workoutHistory", JSON.stringify(history));
}


// ===================== TIMER LOGIC =====================
const timerDisplay = document.getElementById("timer_display");
const btnStart = document.getElementById("btn_timer_start");
const btnPause = document.getElementById("btn_timer_pause");
const btnReset = document.getElementById("btn_timer_reset");

let seconds = 0;
let timerId = null;

function renderTime() {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60, 10).padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
}

btnStart.addEventListener("click", () => {
    if (timerId !== null) return;
    timerId = setInterval(() => {
        seconds += 1;
        renderTime();
    }, 1000);
});

btnPause.addEventListener("click", () => {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
});

btnReset.addEventListener("click", () => {
    seconds = 0;
    renderTime();
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
});

renderTime();