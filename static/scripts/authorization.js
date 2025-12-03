// =======================================
// AUTHORIZATION LOGIC (Login + Signup)
// =======================================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("btn_login");
  const signupBtn = document.getElementById("btn_signup");
  const msgEl = document.getElementById("auth_message");

  // Login handler
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
        msgEl.textContent = "Please fill in both fields.";
        msgEl.style.color = "red";
        return;
      }

      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (res.ok && data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          msgEl.textContent = "Login successful!";
          msgEl.style.color = "limegreen";

          // ✅ Redirect user to Fitness Level selector
          setTimeout(() => {
            window.location.href = "/fitness_level";
          }, 800);
        } else {
          msgEl.textContent = data.error || "Invalid username or password.";
          msgEl.style.color = "red";
        }
      } catch (err) {
        console.error(err);
        msgEl.textContent = "Network error during login.";
        msgEl.style.color = "red";
      }
    });
  }

  // Signup handler
  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
        msgEl.textContent = "Please fill in both fields.";
        msgEl.style.color = "red";
        return;
      }

      try {
        const res = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (res.ok) {
          msgEl.textContent = "Account created successfully!";
          msgEl.style.color = "limegreen";

          // ✅ Auto-login user after signup (optional)
          const loginRes = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const loginData = await loginRes.json();

          if (loginRes.ok && loginData.access_token) {
            localStorage.setItem("access_token", loginData.access_token);
            setTimeout(() => {
              window.location.href = "/fitness_level";
            }, 800);
          } else {
            msgEl.textContent = "Signup success. Please login manually.";
          }
        } else {
          msgEl.textContent = data.error || "Signup failed.";
          msgEl.style.color = "red";
        }
      } catch (err) {
        console.error(err);
        msgEl.textContent = "Network error during signup.";
        msgEl.style.color = "red";
      }
    });
  }

  // =======================================
  // THEME TOGGLE
  // =======================================
  const themeBtn = document.getElementById("btn_toggle_theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const dark = document.body.classList.toggle("dark-mode");
      localStorage.setItem("theme", dark ? "dark" : "light");
      themeBtn.textContent = dark ? "Light Mode" : "Dark Mode";
    });

    // Apply saved theme on load
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark-mode");
      themeBtn.textContent = "Light Mode";
    }
  }
});
