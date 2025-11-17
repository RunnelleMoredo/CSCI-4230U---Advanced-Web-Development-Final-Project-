document.getElementById('btn_logout').addEventListener('click', () => {
    localStorage.removeItem('access_token');

    window.location.href = '/';
});

document.getElementById('btn_submit').addEventListener('click', async () =>{
    const title = document.getElementById('text_title').value;
    const description = document.getElementById('text_description').value;

    const token = localStorage.getItem('access_token');

    if (!token) {
        alert("You are not logged in.");
        return;
    }

    const response = await fetch('/goals', {
        method: 'POST',
        headers:{'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        body: JSON.stringify({title: title,description: description})
    });

    const data = await response.json();
    
    if(response.ok){
        console.log(`Successful: ${data.message}`);
    }
    else{
        console.log(`Failed: ${data.error}`);
    }
});
