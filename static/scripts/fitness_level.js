document.addEventListener("DOMContentLoaded", () => {
  const beginner = document.getElementById("beginnerBtn");
  const intermediate = document.getElementById("intermediateBtn");

  beginner.addEventListener("click", () => {
    window.location.href = "/calorie_goal";
  });

  intermediate.addEventListener("click", () => {
    window.location.href = "/calorie_goal";
  });
});
