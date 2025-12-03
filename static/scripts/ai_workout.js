document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("aiWorkoutForm");
  const loading = document.getElementById("loading");
  const resultDiv = document.getElementById("planResult");
  const generateBtn = document.getElementById("generateBtn");

  // Preselect experience based on mode param
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "beginner") {
      document.getElementById("experience").value = "beginner";
  } else if (mode === "intermediate") {
      document.getElementById("experience").value = "intermediate";
  }

  form.addEventListener("submit", async (e) => {
      e.preventDefault();
      resultDiv.innerHTML = "";
      loading.style.display = "block";
      generateBtn.disabled = true;

      const payload = {
          goal: document.getElementById("goal").value,
          experience: document.getElementById("experience").value,
          days_per_week: parseInt(document.getElementById("days_per_week").value),
          equipment: document.getElementById("equipment").value,
          injuries: document.getElementById("injuries").value
      };

      try {
          const token = localStorage.getItem("access_token");
          const response = await fetch("/ai/workout-plan", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          });

          const data = await response.json();
          loading.style.display = "none";
          generateBtn.disabled = false;

          if (!response.ok) {
              resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
              return;
          }

          // Animate plan display
          resultDiv.style.opacity = "0";
          resultDiv.style.transition = "opacity 0.6s ease";

          let html = `<h2>Your Weekly Plan</h2>`;
          data.plan.weekly_plan.forEach(day => {
              html += `
              <div class="plan-day">
                  <h3>${day.day} – ${day.focus}</h3>
                  <ul>
                      ${day.exercises.map(ex => `<li>${ex.name} (${ex.sets} x ${ex.reps})</li>`).join("")}
                  </ul>
                  <p><strong>Warmup:</strong> ${day.warmup || "—"}</p>
                  <p><strong>Cooldown:</strong> ${day.cooldown || "—"}</p>
              </div>
              `;
          });
          resultDiv.innerHTML = html;
          setTimeout(() => (resultDiv.style.opacity = "1"), 100);
      } catch (err) {
          console.error(err);
          loading.style.display = "none";
          generateBtn.disabled = false;
          resultDiv.innerHTML = `<p style="color:red;">Something went wrong.</p>`;
      }
  });
});