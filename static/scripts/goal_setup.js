// =======================================
// GOAL SETUP PAGE SCRIPT
// =======================================

// Apply saved theme
function applySavedTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.documentElement.classList.remove("dark");
    } else {
        document.documentElement.classList.add("dark");
    }
}
applySavedTheme();

// Get elements
const goalCards = document.querySelectorAll(".goal-card");
const customGoalInput = document.getElementById("customGoalInput");
const customGoalText = document.getElementById("customGoalText");
const continueBtn = document.getElementById("continueBtn");

let selectedGoal = null;

// Goal card click handlers
goalCards.forEach(card => {
    card.addEventListener("click", () => {
        // Remove selected from all cards
        goalCards.forEach(c => c.classList.remove("selected"));

        // Add selected to clicked card
        card.classList.add("selected");

        const goal = card.dataset.goal;

        if (goal === "custom") {
            // Show custom input
            customGoalInput.classList.remove("hidden");
            customGoalText.focus();
            selectedGoal = null;
            continueBtn.disabled = true;

            // Enable continue when custom text is entered
            customGoalText.oninput = () => {
                if (customGoalText.value.trim().length > 0) {
                    selectedGoal = customGoalText.value.trim();
                    continueBtn.disabled = false;
                } else {
                    selectedGoal = null;
                    continueBtn.disabled = true;
                }
            };
        } else {
            // Hide custom input, use preset goal
            customGoalInput.classList.add("hidden");
            selectedGoal = goal;
            continueBtn.disabled = false;
        }
    });
});

// Continue button click
continueBtn.addEventListener("click", async () => {
    if (!selectedGoal) {
        alert("Please select a goal first");
        return;
    }

    const token = localStorage.getItem("access_token");

    if (token) {
        try {
            // Save goal to server
            const response = await fetch("/goals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: selectedGoal,
                    description: `My primary fitness goal: ${selectedGoal}`,
                    is_primary: true
                })
            });

            if (!response.ok) {
                console.error("Failed to save goal:", await response.text());
            }
        } catch (err) {
            console.error("Error saving goal:", err);
        }
    }

    // Store goal in localStorage as backup
    localStorage.setItem("primaryGoal", selectedGoal);

    // Redirect to calorie goal page
    window.location.href = "/calorie_goal";
});
