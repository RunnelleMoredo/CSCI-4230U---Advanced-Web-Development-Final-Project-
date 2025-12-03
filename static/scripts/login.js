// =======================================
// LOGIN HANDLER
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login_form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      alert("Please fill in both fields.");
      return;
    }

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem("access_token", data.access_token);

        // ✅ Redirect to fitness level selector
        window.location.href = "/fitness_level";
      } else {
        alert(data.error || "Invalid login credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during login.");
    }
  });
});
