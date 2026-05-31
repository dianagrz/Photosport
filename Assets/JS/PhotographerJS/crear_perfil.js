const formulario = document.getElementById("formulario");
const fotografoId = localStorage.getItem('fotografoId') || '1';

function getApiUrl(path) {
    if (typeof apiUrl === 'function') return apiUrl(path);
    const API_BASE = 'http://localhost:3000';
    return String(path).startsWith('http') ? path : API_BASE + path;
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    
    const profilePicInput = document.getElementById("profilePic");
    const fotoPerfilUrl = document.getElementById("fotoPerfilUrl");
    // If profile picture is selected, upload it first
    if (profilePicInput && profilePicInput.files.length > 0) {
        const uploadData = new FormData();
        uploadData.append('fotos', profilePicInput.files[0]);
        uploadData.append('id_fotografo', fotografoId);
        uploadData.append('tipo', 'perfil');
        
        try {
            const res = await fetch(getApiUrl('/upload'), {
                method: 'POST',
                body: uploadData
            });
            const json = await res.json();
            if (!res.ok) throw json;
            if (json.files && json.files[0]) {
                fotoPerfilUrl.value = json.files[0];
            }
            console.log('Profile picture uploaded:', json.files ? json.files[0] : json.message);
        } catch (err) {
            alert('Error uploading profile picture: ' + (err.message || 'Unknown error'));
            return;
        }
    }
    
    // Now submit the profile form
    const formData = new FormData(formulario);
    const data = Object.fromEntries(formData.entries());

    fetch(getApiUrl(`/fotografos/${fotografoId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw json;
        return json;
    })
    .then(msg => {
        alert(msg.message || 'Perfil actualizado');
        window.location.href = "preview-portafolio.html";
    })
    .catch(err => { console.error(err); alert(err && err.message ? err.message : 'Error'); });
}

formulario.addEventListener("submit", handleProfileSubmit);

/* FUNCION PARA Q APAREZCA LA INFO DE PERFIL */
function cargar_perfil(){
    fetch(getApiUrl(`/fotografos/${fotografoId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!data) return;
            document.getElementById("nombre").value = data.nombre || '';
            document.getElementById("apellido").value = data.apellido || '';
            document.getElementById("correo").value = data.correo || '';
            document.getElementById("tel").value = data.telefono || '';
            document.getElementById("especial").value = data.especialidad || '';
            document.getElementById("expo").value = data.experiencia || '';
            document.getElementById("sobre").value = data.sobre || '';
            document.getElementById("fotoPerfilUrl").value = data.foto || '';
        })
        .catch(console.error);
}

document.addEventListener('DOMContentLoaded', cargar_perfil);
