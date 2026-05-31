const params = new URLSearchParams(window.location.search);
const idEvento = params.get("id");
const eventoId = params.get("evento");

const foto = document.getElementById("perfil-foto");
const nombre = document.getElementById("perfil-nombre");
const especialidad = document.getElementById("perfil-especialidad");
const experiencia = document.getElementById("perfil-experiencia");
const descripcion = document.getElementById("perfil-descripcion");
const btn = document.getElementById("perfil-btnContratar");

function getImageUrl(path) {
    if (!path) return "../../Assets/IMG/fondo.jpg";
    if (String(path).startsWith("http")) return path;
    return apiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

// MOSTRAR INFO DEL FOTOGRAFO
function showFotografo() {
    fetch(apiUrl(`/fotografos/${idEvento}`))
        .then(res => res.json())
        .then(data => {
            if (!data) return;
            console.log('Fotografo data:', data);
            foto.src = getImageUrl(data.foto);
            nombre.textContent = data.nombre + ' ' + data.apellido;
            especialidad.innerHTML = `<strong>Especialidad:</strong> ${data.especialidad || ''}`;
            experiencia.innerHTML = `<strong>Experiencia:</strong> ${data.experiencia || ''}`;
            descripcion.textContent = data.sobre || '';
            btn.href = eventoId
                ? `contratar.html?id=${idEvento}&evento=${eventoId}`
                : `contratar.html?id=${idEvento}`;
        })
        .catch(console.error);

    // MOSTRAR PORTAFOLIO (fotos del fotografo)
    const portafolio = document.getElementById("portafolio");
    portafolio.innerHTML = "";
    fetch(apiUrl(`/fotos?fotografo=${idEvento}`))
        .then(res => res.json())
        .then(data => {
            data.forEach(img => {
                portafolio.innerHTML += `<img src="${getImageUrl(img.url)}" alt="Foto del portafolio">`;
            });
        })
        .catch(console.error);
}

showFotografo();
