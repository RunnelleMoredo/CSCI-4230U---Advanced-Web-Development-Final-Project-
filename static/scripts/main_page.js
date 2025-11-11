document.getElementById('btn_logout').addEventListener('click', () => {
    localStorage.removeItem('access_token');

    window.location.href = '/';
});
