// Logout
document.getElementById('btn_logout')?.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    window.location.href = '/';
});

// Go to goals page
document.getElementById('btn_goals')?.addEventListener('click', () => {
    window.location.href = '/goals_page';
});

// Submit goal
document.getElementById('btn_submit')?.addEventListener('click', async () => {
    const title = document.getElementById('text_title').value.trim();
    const description = document.getElementById('text_description').value.trim();
    const token = localStorage.getItem("access_token");

    console.log("Submitting:", title, description);

    if (!title) {
        alert("Title required");
        return;
    }

    try {
        const response = await fetch("/goals/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ title, description })
        });

        console.log("Response:", response.status);

        const data = await response.json();

        if (response.ok) {
            alert("Goal created successfully!");
            document.getElementById("text_title").value = "";
            document.getElementById("text_description").value = "";
        } else {
            alert(data.error || "Failed to create goal.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error.");
    }
});
