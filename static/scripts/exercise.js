const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("exerciseResults");

searchBtn.addEventListener("click", loadExercises);

async function loadExercises() {
    const q = document.getElementById("searchInput").value.trim();
    const bodyPart = document.getElementById("bodyPartFilter").value;

    const params = new URLSearchParams();
    if (q) params.append("q", q);
    if (bodyPart) params.append("bodyPart", bodyPart);

    results.innerHTML = "<p>Loading...</p>";

    const res = await fetch("/api/exercises/search?" + params.toString());
    const data = await res.json();

    if (!Array.isArray(data)) {
        results.innerHTML = "<p>Failed to load exercises.</p>";
        return;
    }

    results.innerHTML = "";

    data.forEach(ex => {
        const card = document.createElement("div");
        card.className = "exercise-card";

        card.innerHTML = `
            <img src="${ex.gifUrl}">
            <h3>${ex.name}</h3>
            <p><strong>Body:</strong> ${ex.bodyPart}</p>
            <p><strong>Target:</strong> ${ex.target}</p>
            <p><strong>Equipment:</strong> ${ex.equipment}</p>
        `;

        results.appendChild(card);
    });
}
