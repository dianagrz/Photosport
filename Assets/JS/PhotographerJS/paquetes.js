const eventos = document.getElementById("fotografo-eventos");
const fotografoId = localStorage.getItem("fotografoId") || "1";

function mostrarFormulario(){
    const formulario = document.getElementById("formulario-paquete");
    if (formulario) formulario.style.display = "block";
}
function ocultarFormulario(){
    const formulario = document.getElementById("formulario-paquete");
    if (formulario) formulario.style.display = "none";
}

function getApiUrl(path) {
    if (typeof apiUrl === 'function') return apiUrl(path);
    const API_BASE = 'http://localhost:3000';
    return String(path).startsWith('http') ? path : API_BASE + path;
}

function fetchJson(url, options) {
    const full = getApiUrl(url);
    return fetch(full, options).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}

function initPaquetesPage() {
    const nuevo = document.getElementById("nuevo");
    const listpaquetes = document.getElementById("lista-paquetes");

    if (nuevo) {
        nuevo.addEventListener("submit", function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const nombre = formData.get("nombre");
            const precio = formData.get("precio");
            const cobertura = formData.get("cobertura");
            const descrip = formData.get("descrip");

            fetchJson('/paquetes', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_fotografo: fotografoId, nombre, precio, cobertura, descripcion: descrip })
            })
            .then(json => {
                alert(json.message || 'Paquete creado');
                nuevo.reset();
                renderPaquetes(listpaquetes);
                ocultarFormulario();
            })
            .catch(err => {
                console.error(err);
                alert(err && err.message ? err.message : 'Error');
            });
        });
    }

    if (listpaquetes) {
        listpaquetes.addEventListener("click", function(e) {
            if (e.target.tagName === "BUTTON") {
                const accion = e.target.dataset.accion;
                const card = e.target.closest(".paquete-card");
                const id = card ? card.dataset.id : null;

                if (!id) return;
                if (accion === "editar") return;
                if (accion === "eliminar") eliminarPaquete(id, listpaquetes);
            }
        });
    }

    renderPaquetes(listpaquetes);
}

function eliminarPaquete(id, listpaquetes) {
    fetchJson(`/paquetes/${id}`, { method: 'DELETE' })
    .then(json => {
        alert(json.message || 'Paquete eliminado');
        renderPaquetes(listpaquetes);
    })
    .catch(error => {
        console.error("Error en la petición:", error);
        alert('Error al eliminar');
    });
}

function renderPaquetes(listpaquetes) {
    if (!listpaquetes) return;

    fetchJson('/paquetes?fotografo=' + fotografoId)
    .then(data => {
        listpaquetes.innerHTML = "";
        data.forEach(paquete => {
            listpaquetes.innerHTML += `
                <div class="paquete-card" data-id="${paquete.id_paquete}">
                    <h3>${paquete.nombre}</h3>
                    <p><b>Precio:</b> ${paquete.precio}</p>
                    <p><b>Cobertura:</b> ${paquete.cobertura}</p>
                    <p>${paquete.descripcion}</p>
                    <button data-accion="editar">Editar</button>
                    <button data-accion="eliminar">Eliminar</button>
                </div>
            `;
        });
    })
    .catch(err => {
        console.error(err);
        if (listpaquetes) listpaquetes.innerHTML = '<p class="error-state">No se pudieron cargar los paquetes.</p>';
    });
}

document.addEventListener('DOMContentLoaded', initPaquetesPage);
