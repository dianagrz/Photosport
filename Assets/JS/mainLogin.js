
// FUNCION PARA HACER LOGIN
const loginExist = document.getElementById("logSession");

loginExist.addEventListener("submit", function(event) {
    event.preventDefault();

    const usuario = false;
    const email = loginExist.email.value;
    const password = loginExist.password.value;

    console.log("Correo:", email);
    console.log("Contraseña:", password);

    // Call login API
    fetch(apiUrl('/login'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(async res => {
        if (!res.ok) throw await res.json();
        return res.json();
    })
    .then(data => {
        // data.tipo -> 'cliente' or 'fotografo'
        loginExist.reset();
        if (data.tipo === 'cliente') {
            window.location.href = "client/home_client.html";
            localStorage.setItem('clienteId', data.id);
        } else if (data.tipo === 'fotografo') {
            window.location.href = "photographer/home_photographer.html";
            localStorage.setItem('fotografoId', data.id);
        }
    })
    .catch(err => {
        console.error(err);
        alert(err && err.message ? err.message : 'Error en inicio de sesión');
    });

});