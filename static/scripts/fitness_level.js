document.addEventListener("DOMContentLoaded", () => {
  const beginner = document.getElementById("beginnerBtn");
  const intermediate = document.getElementById("intermediateBtn");

  beginner.addEventListener("click", () => {
    window.location.href = "/ai_workout";
  });

  intermediate.addEventListener("click", () => {
    window.location.href = "/main_dashboard";
  });
});
