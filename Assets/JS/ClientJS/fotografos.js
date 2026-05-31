const fotografos = document.getElementById("fotografos-disponibles");
const params = new URLSearchParams(window.location.search);
const eventoId = params.get("evento");

function getImageUrl(path) {
    if (!path) return "../../Assets/IMG/fondo.jpg";
    if (String(path).startsWith("http")) return path;
    return apiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

function renderFotografos(data) {
    if (!fotografos) return;
    fotografos.innerHTML = "";

    if (!data || data.length === 0) {
        fotografos.innerHTML = '<p class="empty-state">No hay fotografos disponibles.</p>';
        return;
    }

    data.forEach(f => {
        const perfilUrl = eventoId
            ? `perfil-fotografo.html?id=${f.id_fotografo}&evento=${eventoId}`
            : `perfil-fotografo.html?id=${f.id_fotografo}`;

        fotografos.innerHTML += `
            <div class="fotografo-card" data-id="${f.id_fotografo}">
                <img src="${getImageUrl(f.foto)}" alt="${f.nombre} ${f.apellido}">
                <h3>${f.nombre} ${f.apellido}</h3>
                <p>Correo: ${f.correo || "No disponible"}</p>
                <a href="${perfilUrl}">
                    <button>Ver portafolio</button>
                </a>
            </div>
        `;
    });
}

function showFotografos() {
    const url = eventoId ? `/fotografos/evento/${eventoId}` : "/fotografos";
    fetch(apiUrl(url))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(renderFotografos)
        .catch(err => {
            console.error("Error cargando fotografos:", err);
            if (fotografos) {
                fotografos.innerHTML = '<p class="error-state">No se pudieron cargar los fotografos.</p>';
            }
        });
}

showFotografos();
