document.getElementById('btn_signup').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Username and password is required');
        return;
    }

    const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
        //credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
        messageDiv.textContent = data.message;
    }
    else {
        messageDiv.textContent = data.error || 'Signup Failed';
    }

});

document.getElementById('btn_login').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;


    if (!username || !password) {
        alert('Username and password is required');
        return;
    }

    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
        //credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/main';
    }
    else {
        messageDiv.textContent = data.error || 'Login Failed';
    }

});

