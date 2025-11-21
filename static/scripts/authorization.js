document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // THEME TOGGLE (LOGIN PAGE)
    // ============================
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

    applySavedTheme();

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            themeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
        });
    }

    // ============================
    // AUTH INPUTS & UI
    // ============================
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const msg = document.getElementById("auth_message");

    const loginBtn = document.getElementById("btn_login");
    const signupBtn = document.getElementById("btn_signup");

    // ============================
    // MESSAGE HELPER
    // ============================
    function showMsg(text, isError = false) {
        msg.textContent = text;
        msg.style.color = isError ? "#dc2626" : "var(--accent)";
    }

    // ============================
    // SIGNUP HANDLER
    // ============================
    signupBtn?.addEventListener("click", async () => {
        if (!username.value || !password.value) {
            showMsg("Username and password required", true);
            return;
        }

        const res = await fetch("/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.value, password: password.value })
        });

        const data = await res.json();

        if (res.ok) {
            showMsg("Account created! You can now log in.");
        } else {
            showMsg(data.error || "Signup failed.", true);
        }
    });

    // ============================
    // LOGIN HANDLER
    // ============================
    loginBtn?.addEventListener("click", async () => {
        if (!username.value || !password.value) {
            showMsg("Username and password required", true);
            return;
        }

        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.value, password: password.value })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("access_token", data.access_token);
            window.location.href = "/main";
        } else {
            showMsg(data.error || "Login failed.", true);
        }
    });

});
