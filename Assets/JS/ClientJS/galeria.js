const params = new URLSearchParams(window.location.search);
const idCompra = params.get("id");
const galeria = document.getElementById("galeria");


function getImageUrl(path) {
    if (!path) return "";
    if (String(path).startsWith("http")) return path;
    return apiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

// Falta: Modificar acorde a la BD y a los campos que se manejen y filtrar
function showGaleria() {
    if (!idCompra) {
        if (galeria) galeria.innerHTML = '<p class="empty-state">ID de compra no proporcionado.</p>';
        return;
    }

    fetch(apiUrl(`/compra/${idCompra}`))
    .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        const fotos = Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : [];
        if (!fotos || fotos.length === 0) {
            if (galeria) galeria.innerHTML = '<p class="empty-state">No se han subido fotos para esta compra.</p>';
            return;
        }

        if (galeria) galeria.innerHTML = "";

        fotos.forEach(foto => {
            const url = getImageUrl(foto.url || foto.enlace || foto.path);
            if (!galeria) return;
            galeria.innerHTML += `
                <div class="foto-card">
                    <img src="${getImageUrl(url)}">
                    <a href="${getImageUrl(url)}" download>
                        <button>Descargar</button>
                    </a>
                </div>
            `;
        });
    })
    .catch(err => {
        console.error('Error fetching compra fotos:', err);
        if (galeria) galeria.innerHTML = '<p class="error-state">Error al cargar la galería.</p>';
    });
}

showGaleria();
