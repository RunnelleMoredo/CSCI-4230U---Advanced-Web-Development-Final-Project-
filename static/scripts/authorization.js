// =======================================
// AUTHORIZATION LOGIC (Login + Signup)
// =======================================

document.addEventListener("DOMContentLoaded", () => {
  // Support both old and new element IDs
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showSignupBtn = document.getElementById("showSignup");
  const showLoginBtn = document.getElementById("showLogin");

  // Button IDs
  const loginBtn = document.getElementById("btn_login");
  const signupBtn = document.getElementById("btn_signup");
  const msgEl = document.getElementById("auth_message");

  // =======================================
  // Toggle between Login and Signup forms (new layout)
  // =======================================
  if (showSignupBtn && loginForm && signupForm) {
    showSignupBtn.addEventListener("click", () => {
      loginForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      if (msgEl) msgEl.textContent = "";
    });
  }

  if (showLoginBtn && loginForm && signupForm) {
    showLoginBtn.addEventListener("click", () => {
      signupForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
      if (msgEl) msgEl.textContent = "";
    });
  }

  // =======================================
  // Login handler
  // =======================================
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      // Support both old (username/password) and new (login_username/login_password) IDs
      const usernameEl = document.getElementById("login_username") || document.getElementById("username");
      const passwordEl = document.getElementById("login_password") || document.getElementById("password");

      const username = usernameEl?.value?.trim() || "";
      const password = passwordEl?.value?.trim() || "";

      if (!username || !password) {
        if (msgEl) {
          msgEl.textContent = "Please fill in both fields.";
          msgEl.style.color = "red";
        }
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
          if (msgEl) {
            msgEl.textContent = "Login successful!";
            msgEl.style.color = "limegreen";
          }

          setTimeout(() => {
            window.location.href = "/fitness_level";
          }, 800);
        } else {
          if (msgEl) {
            msgEl.textContent = data.error || "Invalid username or password.";
            msgEl.style.color = "red";
          }
        }
      } catch (err) {
        console.error(err);
        if (msgEl) {
          msgEl.textContent = "Network error during login.";
          msgEl.style.color = "red";
        }
      }
    });
  }

  // =======================================
  // Signup handler
  // =======================================
  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
      // Support both old and new element IDs
      const firstNameEl = document.getElementById("signup_firstname");
      const lastNameEl = document.getElementById("signup_lastname");
      const emailEl = document.getElementById("signup_email");
      const dobEl = document.getElementById("signup_dob");
      const heightEl = document.getElementById("signup_height") || document.getElementById("height");
      const weightEl = document.getElementById("signup_weight") || document.getElementById("weight");
      const usernameEl = document.getElementById("signup_username") || document.getElementById("username");
      const passwordEl = document.getElementById("signup_password") || document.getElementById("password");
      const displayNameEl = document.getElementById("displayName");

      // Get values with fallbacks
      const firstName = firstNameEl?.value?.trim() || "";
      const lastName = lastNameEl?.value?.trim() || "";
      const email = emailEl?.value?.trim() || "";
      const dob = dobEl?.value || "";
      const height = parseFloat(heightEl?.value) || null;
      const weight = parseFloat(weightEl?.value) || null;
      const username = usernameEl?.value?.trim() || "";
      const password = passwordEl?.value?.trim() || "";
      const displayName = displayNameEl?.value?.trim() || `${firstName} ${lastName}`.trim() || username;

      if (!username || !password) {
        if (msgEl) {
          msgEl.textContent = "Username and password are required.";
          msgEl.style.color = "red";
        }
        return;
      }

      // Password length validation
      if (password.length < 8) {
        if (msgEl) {
          msgEl.textContent = "Password must be at least 8 characters.";
          msgEl.style.color = "red";
        }
        return;
      }

      // DOB age validation (must be 13+)
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 13) {
          if (msgEl) {
            msgEl.textContent = "You must be at least 13 years old to register.";
            msgEl.style.color = "red";
          }
          return;
        }
        if (birthDate > today) {
          if (msgEl) {
            msgEl.textContent = "Date of birth cannot be in the future.";
            msgEl.style.color = "red";
          }
          return;
        }
      }

      try {
        // Step 1: Register the user
        const res = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (res.ok) {
          if (msgEl) {
            msgEl.textContent = "Account created successfully!";
            msgEl.style.color = "limegreen";
          }

          // Step 2: Auto-login
          const loginRes = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const loginData = await loginRes.json();

          if (loginRes.ok && loginData.access_token) {
            localStorage.setItem("access_token", loginData.access_token);

            // Step 3: Save profile information if any fields provided
            if (displayName || height || weight || email || dob) {
              await fetch("/profile", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${loginData.access_token}`
                },
                body: JSON.stringify({
                  display_name: displayName || username,
                  height_cm: height,
                  weight_kg: weight,
                  email: email,
                  date_of_birth: dob
                })
              });
            }

            setTimeout(() => {
              window.location.href = "/goal_setup";
            }, 800);
          } else {
            if (msgEl) msgEl.textContent = "Signup success. Please login manually.";
          }
        } else {
          if (msgEl) {
            msgEl.textContent = data.error || "Signup failed.";
            msgEl.style.color = "red";
          }
        }
      } catch (err) {
        console.error(err);
        if (msgEl) {
          msgEl.textContent = "Network error during signup.";
          msgEl.style.color = "red";
        }
      }
    });
  }

  // =======================================
  // THEME TOGGLE (for old layout)
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
