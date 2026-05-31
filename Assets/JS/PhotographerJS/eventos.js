const eventos = document.getElementById("fotografo-eventos");
const fotografoId = window.PhotoSportAuth ? window.PhotoSportAuth.getFotografoId() : localStorage.getItem("fotografoId");

function getApiUrl(path) {
    if (typeof apiUrl === "function") return apiUrl(path);
    const API_BASE = "http://localhost:3000";
    return String(path).startsWith("http") ? path : API_BASE + path;
}

function fetchJson(url) {
    return fetch(getApiUrl(url)).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}

function showEventos() {
    if (!eventos || !fotografoId) return;
    eventos.innerHTML = "";

    fetchJson(`/eventos/fotografo/${fotografoId}`)
        .then(data => {
            if (!data || data.length === 0) {
                eventos.innerHTML = '<p class="empty-state">No estas inscrito en ningun evento.</p>';
                return;
            }

            data.forEach(evento => {
                eventos.innerHTML += `
                <div class="evento-card" data-id="${evento.id_evento}">
                    <h3>${evento.nombre}</h3>
                    <p>Fecha: ${evento.fecha_ini || "Sin fecha"}</p>
                    <p>Lugar: ${evento.lugar || "Sin lugar"}</p>

                    <div class="acciones-evento">
                        <button data-accion="clientes">Ver clientes</button>
                        <button data-accion="galeria">Ver galeria</button>
                    </div>
                </div>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando eventos de fotografo:", err);
            eventos.innerHTML = '<p class="error-state">Error al cargar eventos.</p>';
        });
}

if (eventos) {
    eventos.addEventListener("click", function(e) {
        const btn = e.target.closest("button");
        if (!btn) return;

        const accion = btn.dataset.accion;
        const card = btn.closest(".evento-card");
        const id = card ? card.dataset.id : null;
        if (!accion || !id) return;

        if (accion === "clientes") {
            window.location.href = `listClients.html?id=${id}`;
            return;
        }

        if (accion === "galeria") {
            window.location.href = `listFotos.html?id=${id}`;
        }
    });
}

if (fotografoId) {
    document.addEventListener("DOMContentLoaded", showEventos);
}
