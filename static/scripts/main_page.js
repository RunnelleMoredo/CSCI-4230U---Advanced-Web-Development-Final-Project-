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

function addWorkout(exercise) {
    const selected = document.getElementById('selected_workouts');

    if ([...selected.children].some(li => li.dataset.id === exercise.name)) return;

    const li = document.createElement('li');
    li.textContent = exercise.name;
    li.dataset.id = exercise.name;
    li.style.cursor = 'pointer';

    li.addEventListener('click', () =>{
        document.getElementById('modal_name').textContent = exercise.name;
        document.getElementById('modal_target_muscles').textContent = exercise.targetMuscles;
        document.getElementById('modal_secondary_muscles').textContent = exercise.secondaryMuscles;
        document.getElementById('modal_equipment').textContent = exercise.equipments;
        document.getElementById('modal_instructions').textContent = exercise.instructions;
        document.getElementById('modal_gif').src = exercise.gifUrl;

        document.getElementById('modal_container').style.display = "block";

    });

    selected.appendChild(li);
}

document.getElementById('btn_close_modal').addEventListener('click', async() =>{
    document.getElementById('modal_container').style.display = "none";
});

document.getElementById('btn_find_workout').addEventListener('click', async () => {
    const query = document.getElementById('find_workout').value;
    const results = document.getElementById('search_results');
    const token = localStorage.getItem('access_token');

    const response = await fetch(`/workout/search?q=${query}`,{
        method: 'GET',
        headers:{'Authorization': 'Bearer ' + token}
    });

    const data = await response.json();

    results.innerHTML = '';

    data.forEach(exercise => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        
        const name = document.createElement('span');
        name.textContent = exercise.name;
        li.appendChild(name);

        const gif = document.createElement('img');
        gif.src = exercise.gifUrl;
        li.appendChild(gif);        

        li.addEventListener('click', () => {
            addWorkout(exercise);
            results.innerHTML = '';
        });
    
    results.appendChild(li);

    });

});