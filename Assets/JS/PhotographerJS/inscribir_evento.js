const eventos = document.getElementById("eventos");
const busquedaInput = document.getElementById("busqueda");
const solicitud = document.getElementById("solicitar");
const fotografoId = localStorage.getItem("fotografoId") || "1";

function fetchJson(url, options) {
    return fetch(apiUrl(url), options).then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw json;
        return json;
    });
}

function getEventosDisponibles() {
    return fetchJson(`/eventos/no-inscritos/${fotografoId}`);
}

function renderEventos(data) {
    if (!eventos) return;
    eventos.innerHTML = "";

    if (!data || data.length === 0) {
        eventos.innerHTML = '<p class="empty-state">No hay eventos disponibles para inscribirte.</p>';
        return;
    }

    data.forEach(evento => {
        eventos.innerHTML += `
        <div class="evento-card" data-id="${evento.id_evento}">
            <h3>${evento.nombre}</h3>
            <p>Fecha: ${evento.fecha_ini || "Sin fecha"}</p>
            <p>Lugar: ${evento.lugar || "Sin lugar"}</p>
            <button data-accion="inscribir">Registrarme como fotografo</button>
        </div>
        `;
    });
}

function showEventos() {
    getEventosDisponibles()
        .then(renderEventos)
        .catch(err => {
            console.error("Error cargando eventos disponibles:", err);
            if (eventos) {
                eventos.innerHTML = '<p class="error-state">No se pudieron cargar los eventos disponibles.</p>';
            }
        });
}

function buscar() {
    const busqueda = (busquedaInput ? busquedaInput.value : "").trim().toLowerCase();

    getEventosDisponibles()
        .then(data => {
            if (!busqueda) {
                renderEventos(data);
                return;
            }

            const resultados = data.filter(evento => {
                return [evento.nombre, evento.lugar, evento.organizador]
                    .filter(Boolean)
                    .some(valor => String(valor).toLowerCase().includes(busqueda));
            });
            renderEventos(resultados);
        })
        .catch(err => {
            console.error("Error buscando eventos:", err);
            if (eventos) {
                eventos.innerHTML = '<p class="error-state">No se pudieron buscar los eventos.</p>';
            }
        });
}

if (eventos) {
    eventos.addEventListener("click", function(e) {
        const btn = e.target.closest("button");
        if (!btn || btn.dataset.accion !== "inscribir") return;

        const card = btn.closest(".evento-card");
        const id = card ? card.dataset.id : null;
        if (!id) return;

        fetchJson("/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_evento: id, id_fotografo: fotografoId })
        })
        .then(msg => {
            alert(msg.message || "Inscrito");
            showEventos();
        })
        .catch(err => {
            console.error(err);
            alert(err && err.message ? err.message : "Error");
        });
    });
}

if (solicitud) {
    solicitud.addEventListener("submit", function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());

        fetchJson("/solicitud_evento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(msg => {
            alert(msg.message || "Evento solicitado");
            solicitud.reset();
            showEventos();
        })
        .catch(err => {
            console.error(err);
            alert(err && err.message ? err.message : "Error");
        });
    });
}

document.addEventListener("DOMContentLoaded", showEventos);