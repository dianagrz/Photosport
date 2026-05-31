const perfil = document.getElementById("perfil");
const imagenes = document.getElementById("imagenes");
const photographerId = localStorage.getItem('fotografoId') || '1';

function fetchJson(url) {
    return fetch(url).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}

function getImageUrl(path) {
    if (!path) return "../../Assets/IMG/fondo.jpg";
    if (String(path).startsWith("http")) return path;
    return apiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

function cargar_perfil(){
    if (!photographerId) return;
    fetchJson(apiUrl(`/fotografos/${photographerId}`))
    .then(data => {
        if (!data) return;
        document.getElementById("nombrePerfil").textContent = `${data.nombre || ''} ${data.apellido || ''}`;
        document.getElementById("descPerfil").textContent = data.sobre || '';
        document.getElementById("fotoPerfil").src = getImageUrl(data.foto);
    })
    .catch(console.error);
}

function cargar_imagenes(){
    if (!photographerId || !imagenes) return;
    imagenes.innerHTML = "";

    fetchJson(apiUrl(`/fotos?fotografo=${photographerId}`))
    .then(data => {
        if (!data || data.length === 0) {
            imagenes.innerHTML = '<p class="empty-state">No hay imágenes en tu portafolio.</p>';
            return;
        }

        data.forEach(foto => {
            imagenes.innerHTML += `
                <img src="${getImageUrl(foto.url)}" alt="Portafolio">
            `;
        });
    })
    .catch(err => {
        console.error('Error cargando portafolio:', err);
        imagenes.innerHTML = '<p class="error-state">No se pudieron cargar las imágenes.</p>';
    });
}

cargar_perfil();
cargar_imagenes();
