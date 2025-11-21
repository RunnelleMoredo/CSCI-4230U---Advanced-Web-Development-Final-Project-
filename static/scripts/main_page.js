// ---------- Theme Toggle ----------
const themeBtn = document.getElementById("btn_toggle_theme");

function applySavedTheme() {
    const saved = localStorage.getItem("theme");

    if (saved === "dark") {
        document.body.classList.add("dark-mode");
        if (themeBtn) themeBtn.textContent = "Light Mode";
    } else {
        document.body.classList.remove("dark-mode");
        if (themeBtn) themeBtn.textContent = "Dark Mode";
    }
}

if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        const nowDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", nowDark ? "dark" : "light");

        themeBtn.textContent = nowDark ? "Light Mode" : "Dark Mode";
    });
}

applySavedTheme();



// ---------- Auth & Navigation ----------

const logoutBtn = document.getElementById('btn_logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });
}

const goalsBtn = document.getElementById('btn_goals');
if (goalsBtn) {
    goalsBtn.addEventListener('click', () => {
        window.location.href = '/goals_page';
    });
}

// ---------- Create Goal ----------

const submitGoalBtn = document.getElementById('btn_submit');
if (submitGoalBtn) {
    submitGoalBtn.addEventListener('click', async () => {
        const title = document.getElementById('text_title').value.trim();
        const description = document.getElementById('text_description').value.trim();
        const token = localStorage.getItem("access_token");

        if (!title) {
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
                alert("Goal created successfully!");
                document.getElementById("text_title").value = "";
                document.getElementById("text_description").value = "";
            } else {
                alert(data.error || "Failed to create goal.");
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        }
    });
}

// ---------- Workout Search & Selection ----------

const token = localStorage.getItem('access_token');
const searchInput = document.getElementById('find_workout');
const searchResults = document.getElementById('search_results');
const selectedList = document.getElementById('selected_workouts');

let selectedExercises = [];

function loadSelectedFromStorage() {
    try {
        const stored = localStorage.getItem('selectedExercises');
        if (stored) {
            selectedExercises = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to parse selectedExercises from storage', e);
        selectedExercises = [];
    }
}

function saveSelectedToStorage() {
    localStorage.setItem('selectedExercises', JSON.stringify(selectedExercises));
}

// Create “Start Workout Session” button dynamically
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

function openModal(exercise) {
    const nameEl = document.getElementById('modal_name');
    const targetEl = document.getElementById('modal_target_muscles');
    const secondaryEl = document.getElementById('modal_secondary_muscles');
    const equipEl = document.getElementById('modal_equipment');
    const instrEl = document.getElementById('modal_instructions');
    const gifEl = document.getElementById('modal_gif');
    const container = document.getElementById('modal_container');

    if (!container) return;

    nameEl.textContent = exercise.name || '';
    targetEl.textContent = (exercise.targetMuscles || []).join(', ');
    secondaryEl.textContent = (exercise.secondaryMuscles || []).join(', ');
    equipEl.textContent = (exercise.equipments || []).join(', ');

    instrEl.innerHTML = Array.isArray(exercise.instructions)
        ? exercise.instructions.map(i => `• ${i}`).join("<br>")
        : exercise.instructions || '';


    if (gifEl) {
        gifEl.src = exercise.gifUrl || '';
    }

    container.style.display = 'flex';
}

const closeModalBtn = document.getElementById('btn_close_modal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        const container = document.getElementById('modal_container');
        if (container) container.style.display = 'none';
    });
}

function renderSelectedWorkouts() {
    if (!selectedList) return;

    selectedList.innerHTML = '';

    if (!selectedExercises.length) {
        const li = document.createElement('li');
        li.textContent = 'No workouts selected yet.';
        selectedList.appendChild(li);
        if (startSessionBtn) startSessionBtn.disabled = true;
        return;
    }

    if (startSessionBtn) startSessionBtn.disabled = false;

    selectedExercises.forEach((ex, index) => {
        const li = document.createElement('li');
        li.className = 'selected-workout-item';

        const title = document.createElement('strong');
        title.textContent = ex.name;
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => openModal(ex));

        const setsLabel = document.createElement('label');
        setsLabel.textContent = ' Sets: ';
        const setsInput = document.createElement('input');
        setsInput.type = 'number';
        setsInput.min = '1';
        setsInput.value = ex.sets || 3;
        setsInput.style.width = '50px';
        setsInput.addEventListener('change', (e) => {
            selectedExercises[index].sets = parseInt(e.target.value) || 1;
            saveSelectedToStorage();
        });

        const repsLabel = document.createElement('label');
        repsLabel.textContent = ' Reps: ';
        const repsInput = document.createElement('input');
        repsInput.type = 'number';
        repsInput.min = '1';
        repsInput.value = ex.reps || 8;
        repsInput.style.width = '50px';
        repsInput.addEventListener('change', (e) => {
            selectedExercises[index].reps = parseInt(e.target.value) || 1;
            saveSelectedToStorage();
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'btn btn-outline';
        removeBtn.style.marginLeft = '8px';
        removeBtn.addEventListener('click', () => {
            selectedExercises.splice(index, 1);
            saveSelectedToStorage();
            renderSelectedWorkouts();
        });

        li.appendChild(title);
        li.appendChild(setsLabel);
        li.appendChild(setsInput);
        li.appendChild(repsLabel);
        li.appendChild(repsInput);
        li.appendChild(removeBtn);

        selectedList.appendChild(li);
    });
}

// Visual feedback overlay when adding workout (Option B)
function flashOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'flash-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 500);
}

function addWorkout(exercise) {
    // Prevent duplicates
    if (selectedExercises.some(ex => ex.name === exercise.name)) {
        alert('Workout already selected.');
        return;
    }

    // Push into selected exercise list
    selectedExercises.push({
        name: exercise.name,
        equipments: exercise.equipments || [],
        instructions: exercise.instructions || [],
        targetMuscles: exercise.targetMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        gifUrl: exercise.gifUrl,
        sets: 3,
        reps: 8
    });

    // Save to localStorage
    saveSelectedToStorage();

    // Re-render list
    renderSelectedWorkouts();

    // Find the LAST element we appended
    const selectedList = document.getElementById('selected_workouts');
    const lastItem = selectedList.lastElementChild;

    if (lastItem) {
        // Apply shake + flash
        lastItem.classList.add("shake", "flash-border");

        setTimeout(() => lastItem.classList.remove("shake"), 400);
        setTimeout(() => lastItem.classList.remove("flash-border"), 650);
    }
}

// ---------- SEARCH HANDLER (FULL-WIDTH GIF CARDS) ----------

const searchBtn = document.getElementById('btn_find_workout');

if (searchBtn && searchInput && searchResults) {
    searchBtn.addEventListener('click', async () => {

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

            // Clear previous results
            searchResults.innerHTML = "";

            data.forEach(exercise => {
                const card = document.createElement("div");
                card.className = "workout-card";

                card.innerHTML = `
                    <img src="${exercise.gifUrl}" class="workout-gif-banner" alt="${exercise.name}">

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

                // ADD button
                card.querySelector(".btn-add").addEventListener("click", () => {
                addWorkout(exercise);

                // Apply shake + flash animation to the card
                card.classList.add("shake","flash-border");

                setTimeout(() => card.classList.remove("shake"), 400);
                setTimeout(() => card.classList.remove("flash-border"), 650);
            });


                // DETAILS button
                card.querySelector(".btn-details").addEventListener("click", () => {
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


// init
loadSelectedFromStorage();
renderSelectedWorkouts();
