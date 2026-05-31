const params = new URLSearchParams(window.location.search);
const idEvento = params.get("id");

const competenciaTitulo = document.getElementById("competencia");
// Obtener nombre de la competencia
fetch(apiUrl(`/eventos/${idEvento}`))
    .then(res => res.json())
    .then(data => {
        competenciaTitulo.textContent = data.nombre || '';
    })
    .catch(console.error);

const galeria = document.getElementById("galeria");

function getImageUrl(path) {
    if (!path) return "";
    if (String(path).startsWith("http")) return path;
    return apiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

// Obtener fotos del evento
function getFotos() {
    fetch(apiUrl(`/fotos/${idEvento}`))
    .then(res => res.json())
    .then(data => {
        galeria.innerHTML = "";

        data.forEach(foto => {
            const url = getImageUrl(foto.url);
            galeria.innerHTML += `
            <div class="foto-card">
                <img src="${url}" alt="Foto del evento">
                <a href="${url}" download>
                    <button>Descargar</button>
                </a>
            </div>
            `;
        });
    })
    .catch(console.error);
}
getFotos();
