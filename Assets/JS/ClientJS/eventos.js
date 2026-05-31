const eventosContainer = document.getElementById("eventos-disponibles");
const searchInput = document.getElementById("search");
const clienteId = window.PhotoSportAuth ? window.PhotoSportAuth.getClienteId() : localStorage.getItem("clienteId");

function renderEventos(data) {
    if (!eventosContainer) return;
    eventosContainer.innerHTML = "";

    if (!data || data.length === 0) {
        eventosContainer.innerHTML = '<p class="empty-state">No hay eventos disponibles para registrarte.</p>';
        return;
    }

    data.forEach(evento => {
        eventosContainer.innerHTML += `
            <div class="evento-card" data-id="${evento.id_evento}">
                <img src="../../Assets/IMG/fondo.jpg" alt="${evento.nombre}">
                <h3>${evento.nombre}</h3>
                <p>Fecha inicio: ${evento.fecha_ini || "Sin fecha"}</p>
                <p>Lugar: ${evento.lugar || "Sin lugar"}</p>
                <p>Organizador: ${evento.organizador || "No disponible"}</p>
                <a href="fotografos.html?evento=${evento.id_evento}">
                    <button>Ver fotografos</button>
                </a>
            </div>
        `;
    });
}

function fetchEventos() {
    if (!clienteId) return Promise.resolve([]);

    return fetch(apiUrl(`/eventos/no-inscritos-cliente/${clienteId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .catch(err => {
            console.error("Error cargando eventos disponibles:", err);
            if (eventosContainer) {
                eventosContainer.innerHTML = '<p class="error-state">No se pudieron cargar los eventos.</p>';
            }
            return [];
        });
}

function cargarEventos() {
    fetchEventos().then(renderEventos);
}

function buscar() {
    const busqueda = (searchInput ? searchInput.value : "").trim().toLowerCase();
    fetchEventos().then(data => {
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
    });
}

if (clienteId) {
    cargarEventos();
}
