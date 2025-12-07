// =========================================================
// Profile Page JavaScript
// =========================================================

// ---------------------------------------------------------
// Get JWT Token
// ---------------------------------------------------------
function getToken() {
    return localStorage.getItem("access_token");
}

// ---------------------------------------------------------
// Theme Toggle
// ---------------------------------------------------------
document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const icon = document.querySelector("#themeToggle .material-symbols-outlined");
    if (icon) {
        icon.textContent = document.documentElement.classList.contains("dark") ? "light_mode" : "dark_mode";
    }
});

// ---------------------------------------------------------
// Logout
// ---------------------------------------------------------
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
});

// ---------------------------------------------------------
// Load Profile on Page Load
// ---------------------------------------------------------
async function loadProfile() {
    const token = getToken();
    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
        const response = await fetch("/profile", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Failed to load profile");
        }

        const profile = await response.json();

        // Update display
        document.getElementById("displayName").textContent = profile.display_name || profile.username;
        document.getElementById("username").textContent = `@${profile.username}`;
        document.getElementById("heightDisplay").textContent = profile.height_cm ? `${profile.height_cm} cm` : "-- cm";
        document.getElementById("weightDisplay").textContent = profile.weight_kg ? `${profile.weight_kg} kg` : "-- kg";

        // Profile image
        if (profile.profile_image_url) {
            document.getElementById("profileImage").src = profile.profile_image_url;
            document.getElementById("profileImage").classList.remove("hidden");
            document.getElementById("profileInitial").classList.add("hidden");
        } else {
            const initial = (profile.display_name || profile.username || "?").charAt(0).toUpperCase();
            document.getElementById("profileInitial").textContent = initial;
        }

        // Store for edit form
        window.currentProfile = profile;

    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

// ---------------------------------------------------------
// Load Saved Workout History
// ---------------------------------------------------------
async function loadSavedHistory() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch("/profile/history", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Failed to load saved history");
        }

        const history = await response.json();
        renderSavedHistory(history);

    } catch (err) {
        console.error("Error loading saved history:", err);
    }
}

// ---------------------------------------------------------
// Render Saved Workout History
// ---------------------------------------------------------
function renderSavedHistory(history) {
    const container = document.getElementById("savedHistoryContainer");
    const noMessage = document.getElementById("noSavedMessage");
    const countEl = document.getElementById("savedCount");

    if (!history || history.length === 0) {
        noMessage.classList.remove("hidden");
        countEl.textContent = "0 saved";
        return;
    }

    noMessage.classList.add("hidden");
    countEl.textContent = `${history.length} saved`;

    // Clear existing (except no message)
    container.innerHTML = "";

    history.forEach(entry => {
        const date = entry.completed_at ? new Date(entry.completed_at).toLocaleDateString() : "Unknown date";
        const duration = formatDuration(entry.duration_seconds || 0);
        const exerciseCount = entry.exercises?.length || 0;

        const card = document.createElement("div");
        card.className = "bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col sm:flex-row gap-4";
        card.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-symbols-outlined text-primary">fitness_center</span>
                    <h3 class="font-semibold">${entry.workout_name || "Workout"}</h3>
                </div>
                <div class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-base">calendar_today</span>
                        ${date}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-base">timer</span>
                        ${duration}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-base">exercise</span>
                        ${exerciseCount} exercises
                    </span>
                </div>
                ${entry.exercises ? `
                    <div class="mt-3 flex flex-wrap gap-2">
                        ${entry.exercises.slice(0, 3).map(ex => `
                            <span class="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">${ex.name || ex}</span>
                        `).join("")}
                        ${entry.exercises.length > 3 ? `<span class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">+${entry.exercises.length - 3} more</span>` : ""}
                    </div>
                ` : ""}
            </div>
            ${entry.progress_photo ? `
                <div class="w-20 h-20 rounded-lg overflow-hidden cursor-pointer flex-shrink-0" onclick="openPhotoLightbox('${entry.progress_photo}')">
                    <img src="${entry.progress_photo}" alt="Progress" class="w-full h-full object-cover hover:scale-110 transition" />
                </div>
            ` : ""}
            <div class="flex flex-col gap-2 self-start">
                <button onclick="useInSession(${entry.id})" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition" title="Use in New Session">
                    <span class="material-symbols-outlined">play_arrow</span>
                </button>
                <button onclick="deleteSavedHistory(${entry.id})" class="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ---------------------------------------------------------
// Format Duration
// ---------------------------------------------------------
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}h ${mins}m`;
    } else if (mins > 0) {
        return `${mins}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// ---------------------------------------------------------
// Use Saved Workout in New Session
// ---------------------------------------------------------
async function useInSession(id) {
    const token = getToken();
    try {
        // Get saved history to find the entry
        const response = await fetch('/profile/history', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            alert("Failed to load workout data");
            return;
        }

        const savedHistory = await response.json();
        const entry = savedHistory.find(e => e.id === id);

        if (!entry || !entry.exercises || entry.exercises.length === 0) {
            alert("This workout has no exercises to use");
            return;
        }

        // Store exercises in localStorage for the session page to pick up
        const sessionExercises = entry.exercises.map(ex => ({
            name: typeof ex === 'string' ? ex : ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            equipment: ex.equipment || '',
            bodyPart: ex.bodyPart || '',
            gifUrl: ex.gifUrl || ''
        }));

        localStorage.setItem('sessionExercises', JSON.stringify(sessionExercises));
        localStorage.setItem('sessionTitle', entry.workout_name || 'Saved Workout');

        // Redirect to session page
        window.location.href = '/session';

    } catch (err) {
        console.error("Error loading workout:", err);
        alert("Failed to load workout");
    }
}

// Make functions globally accessible
window.useInSession = useInSession;

// ---------------------------------------------------------
// Delete Saved History Entry
// ---------------------------------------------------------
async function deleteSavedHistory(id) {
    if (!confirm("Remove this workout from your saved history?")) return;

    const token = getToken();
    try {
        const response = await fetch(`/profile/history/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            loadSavedHistory(); // Refresh list
        } else {
            alert("Failed to delete entry");
        }
    } catch (err) {
        console.error("Error deleting:", err);
    }
}

window.deleteSavedHistory = deleteSavedHistory;

// ---------------------------------------------------------
// Edit Profile Modal
// ---------------------------------------------------------
const editModal = document.getElementById("editModal");
const editBtn = document.getElementById("editProfileBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

editBtn?.addEventListener("click", () => {
    // Pre-fill form with current values
    if (window.currentProfile) {
        document.getElementById("editDisplayName").value = window.currentProfile.display_name || "";
        document.getElementById("editHeight").value = window.currentProfile.height_cm || "";
        document.getElementById("editWeight").value = window.currentProfile.weight_kg || "";
    }
    editModal.classList.remove("hidden");
    editModal.classList.add("flex");
});

closeModalBtn?.addEventListener("click", () => {
    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
});

editModal?.addEventListener("click", (e) => {
    if (e.target === editModal) {
        editModal.classList.add("hidden");
        editModal.classList.remove("flex");
    }
});

// ---------------------------------------------------------
// Save Profile Changes
// ---------------------------------------------------------
document.getElementById("editProfileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getToken();
    const updateData = {
        display_name: document.getElementById("editDisplayName").value.trim(),
        height_cm: parseFloat(document.getElementById("editHeight").value) || null,
        weight_kg: parseFloat(document.getElementById("editWeight").value) || null,
    };

    try {
        const response = await fetch("/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            editModal.classList.add("hidden");
            editModal.classList.remove("flex");
            loadProfile(); // Refresh display
        } else {
            alert("Failed to update profile");
        }
    } catch (err) {
        console.error("Error updating profile:", err);
    }
});

// ---------------------------------------------------------
// Profile Photo Upload
// ---------------------------------------------------------
const changePhotoBtn = document.getElementById("changePhotoBtn");
const photoInput = document.getElementById("photoInput");

changePhotoBtn?.addEventListener("click", () => {
    photoInput.click();
});

photoInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert("Image must be less than 2MB");
        return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64 = event.target.result;

        const token = getToken();
        try {
            const response = await fetch("/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ profile_image_url: base64 })
            });

            if (response.ok) {
                loadProfile(); // Refresh display
            } else {
                alert("Failed to upload photo");
            }
        } catch (err) {
            console.error("Error uploading photo:", err);
        }
    };
    reader.readAsDataURL(file);
});

// ---------------------------------------------------------
// Photo Lightbox
// ---------------------------------------------------------
function openPhotoLightbox(src) {
    const lightbox = document.getElementById("photoLightbox");
    const img = document.getElementById("lightboxImage");
    img.src = src;
    lightbox.classList.remove("hidden");
    lightbox.classList.add("flex");
}

function closePhotoLightbox() {
    const lightbox = document.getElementById("photoLightbox");
    lightbox.classList.add("hidden");
    lightbox.classList.remove("flex");
}

// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadSavedHistory();
});

// Make functions globally accessible for inline onclick handlers
window.deleteSavedHistory = deleteSavedHistory;
window.openPhotoLightbox = openPhotoLightbox;
window.closePhotoLightbox = closePhotoLightbox;
