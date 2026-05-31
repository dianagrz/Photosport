const user = document.getElementById("user");
const eventos = document.getElementById("cliente-eventos");
const searchInput = document.getElementById("search");
const clienteId = localStorage.getItem("clienteId") || "1";

function setUserName() {
    const storedName = localStorage.getItem("userName") || localStorage.getItem("nombre") || "Usuario";
    user.textContent = `Hola, ${storedName} 👋`;
}

function loadClientName() {
    if (!user) return;
    user.textContent = "Hola, Usuario";

    fetch(apiUrl(`/cliente/${clienteId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(cliente => {
            const nombre = [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || "Usuario";
            user.textContent = `Hola, ${nombre}`;
        })
        .catch(err => {
            console.error("Error cargando cliente:", err);
        });
}

function renderEventos(eventosData) {
    if (!eventos) return;
    eventos.innerHTML = "";
    if (!eventosData || eventosData.length === 0) {
        eventos.innerHTML = '<p class="empty-state">No tienes eventos registrados.</p>';
        return;
    }

    eventosData.forEach(evento => {
        const statusText = evento.status ? 'Entregado' : 'Pendiente';
        const statusClass = evento.status ? 'entregado' : 'pendiente';
        eventos.innerHTML += `
            <div class="evento-card" data-id="${evento.id_compra}">
                <img src="../../Assets/IMG/fondo.jpg" alt="${evento.evento_nombre}">
                <h3>${evento.evento_nombre}</h3>
                <p><strong>Lugar:</strong> ${evento.lugar || "Sin lugar"}</p>
                <p><strong>Deporte:</strong> ${evento.deporte_nombre || "Sin deporte"}</p>
                <p><strong>Fotógrafo:</strong> ${evento.fotografo_nombre || "No disponible"}</p>
                <p><strong>Paquete:</strong> ${evento.paquete_nombre || "Sin paquete"}</p>
                <p><strong>Estado:</strong> <span class="status ${statusClass}">${statusText}</span></p>
                <a href="galeria.html?id=${evento.id_compra}">
                    <button>Ver fotos de esta compra</button>
                </a>
            </div>
        `;
    });
}

function fetchEventos() {
    return fetch(apiUrl(`/eventos/cliente/${clienteId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .catch(err => {
            console.error(err);
            if (eventos) eventos.innerHTML = '<p class="error-state">No se pudieron cargar los eventos.</p>';
            return [];
        });
}

function cargarEventos() {
    fetchEventos().then(renderEventos);
}

function buscar() {
    const busqueda = searchInput.value.trim().toLowerCase();
    fetchEventos().then(data => {
        if (!busqueda) {
            renderEventos(data);
            return;
        }

        const resultados = data.filter(evento => {
            return [evento.evento_nombre, evento.deporte_nombre, evento.lugar, evento.fotografo_nombre, evento.paquete_nombre]
                .filter(Boolean)
                .some(valor => valor.toLowerCase().includes(busqueda));
        });
        renderEventos(resultados);
    });
}

setUserName();
loadClientName();
cargarEventos();
