const registro = document.getElementById("registro-form")

// FUNCION PARA REGISTRAR UN NUEVO USUARIO
registro.addEventListener("submit", function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    fetch(apiUrl('/registro'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw json;
        return json;
    })
    .then(d => {
        alert(d.message || 'Registrado correctamente');
        registro.reset();
        if (window.PhotoSportAuth) {
            window.PhotoSportAuth.clearSession();
        }

        if (d.tipo === 'cliente') {
            localStorage.setItem('clienteId', d.id);
            localStorage.setItem('userType', 'cliente');
            window.location.href = "client/home_client.html";
        } else if (d.tipo === 'fotografo') {
            localStorage.setItem('fotografoId', d.id);
            localStorage.setItem('userType', 'fotografo');
            window.location.href = "photographer/home_photographer.html";
        }
    })
    .catch(err => {
        console.error(err);
        alert(err && err.message ? err.message : 'Error al registrarse');
    });
});
