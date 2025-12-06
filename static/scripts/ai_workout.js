document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("aiWorkoutForm");
  const loading = document.getElementById("loading");
  const resultDiv = document.getElementById("planResult");
  const generateBtn = document.getElementById("generateBtn");
  const buttonContainer = document.getElementById("actionButtonsContainer") || form.parentElement;

  // Create buttons dynamically if missing
  let saveBtn = document.getElementById("savePlanBtn");
  let convertBtn = document.getElementById("convertToRoutineBtn");

  if (!saveBtn) {
    saveBtn = document.createElement("button");
    saveBtn.id = "savePlanBtn";
    saveBtn.className = "flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors";
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-base">bookmark</span> Save Plan';
    saveBtn.style.display = "none";
    buttonContainer.appendChild(saveBtn);
  }

  if (!convertBtn) {
    convertBtn = document.createElement("button");
    convertBtn.id = "convertToRoutineBtn";
    convertBtn.className = "flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-bold transition-colors";
    convertBtn.innerHTML = '<span class="material-symbols-outlined text-base">fitness_center</span> Save as Routine';
    convertBtn.style.display = "none";
    buttonContainer.appendChild(convertBtn);
  }

  // Preselect experience from URL ?mode=
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "beginner") {
    document.getElementById("experience").value = "beginner";
  } else if (mode === "intermediate") {
    document.getElementById("experience").value = "intermediate";
  }

  let currentPlan = null;
  let currentPlanId = null; // ✅ store latest plan ID returned from backend

  // -----------------------------
  // GENERATE PLAN
  // -----------------------------
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
      injuries: document.getElementById("injuries").value,
    };

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/ai/workout-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      loading.style.display = "none";
      generateBtn.disabled = false;

      if (!response.ok) {
        resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
        return;
      }

      // ✅ store plan and plan ID
      currentPlan = data.plan;
      currentPlanId = data.id;
      localStorage.setItem("last_ai_plan_id", data.id);


      displayPlan(data.plan);
      saveBtn.style.display = "inline-block";
      convertBtn.style.display = "inline-block";
    } catch (err) {
      console.error(err);
      loading.style.display = "none";
      generateBtn.disabled = false;
      resultDiv.innerHTML = `<p style="color:red;">Something went wrong.</p>`;
    }
  });

  // -----------------------------
  // SAVE PLAN (keeps it in AI history)
  // -----------------------------
  saveBtn.addEventListener("click", async () => {
    if (!currentPlan) return alert("Generate a plan first!");

    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/ai/workout-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          goal: document.getElementById("goal").value,
          experience: document.getElementById("experience").value,
          days_per_week: parseInt(document.getElementById("days_per_week").value),
          equipment: document.getElementById("equipment").value,
          injuries: document.getElementById("injuries").value,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Plan saved successfully!");
      } else {
        alert("❌ " + (data.error || "Save failed."));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network error while saving plan.");
    }
  });

  // -----------------------------
  // CONVERT PLAN → REAL WORKOUT ROUTINE
  // -----------------------------
  convertBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("access_token");
    const planId = localStorage.getItem("last_ai_plan_id");
    if (!planId) {
      alert("No AI plan found. Please generate and save a plan first.");
      return;
    }

    try {
      const res = await fetch("/workout/ai/workout-plan/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Routine saved successfully! Check your dashboard.");
      } else {
        alert("❌ " + (data.error || "Save failed."));
      }
    } catch (err) {
      alert("❌ Network error while saving routine.");
    }
  });

  // -----------------------------
  // DISPLAY PLAN
  // -----------------------------
  function displayPlan(plan) {
    resultDiv.classList.remove("hidden");
    resultDiv.style.opacity = "0";
    resultDiv.style.transition = "opacity 0.6s ease";

    let html = `<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your Weekly Plan</h2>`;
    plan.weekly_plan.forEach((day) => {
      html += `
        <div class="p-4 bg-slate-200 dark:bg-slate-800 rounded-lg mb-3">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2">${day.day} <span class="text-primary">— ${day.focus}</span></h3>
          <ul class="space-y-1 mb-3">
            ${day.exercises
          .map((ex) => `<li class="text-slate-700 dark:text-slate-300 text-sm">• ${ex.name} <span class="text-slate-500">(${ex.sets} × ${ex.reps})</span></li>`)
          .join("")}
          </ul>
          <p class="text-sm text-slate-600 dark:text-slate-400"><strong>Warmup:</strong> ${day.warmup || "—"}</p>
          <p class="text-sm text-slate-600 dark:text-slate-400"><strong>Cooldown:</strong> ${day.cooldown || "—"}</p>
        </div>`;
    });

    resultDiv.innerHTML = html;
    setTimeout(() => (resultDiv.style.opacity = "1"), 100);
  }
});
