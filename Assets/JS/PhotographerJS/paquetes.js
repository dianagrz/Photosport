const eventos = document.getElementById("fotografo-eventos");
const fotografoId = window.PhotoSportAuth ? window.PhotoSportAuth.getFotografoId() : localStorage.getItem("fotografoId");
let modoFormulario = "crear";
let paqueteEditando = null;
const paquetesActuales = new Map();

function mostrarFormulario(){
    const formulario = document.getElementById("formulario-paquete");
    if (!formulario) return;

    formulario.style.display = "block";
    formulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ocultarFormulario(){
    const formulario = document.getElementById("formulario-paquete");
    if (formulario) formulario.style.display = "none";
    resetFormularioPaquete();
}

function getApiUrl(path) {
    if (typeof apiUrl === 'function') return apiUrl(path);
    const API_BASE = 'http://localhost:3000';
    return String(path).startsWith('http') ? path : API_BASE + path;
}

function fetchJson(url, options) {
    const full = getApiUrl(url);
    return fetch(full, options).then(res => {
        return res.json().then(json => {
            if (!res.ok) throw json;
            return json;
        });
    });
}

function getFormElements() {
    const form = document.getElementById("nuevo");
    return {
        form,
        titulo: document.getElementById("titulo-form"),
        nombre: form ? form.elements.nombre : null,
        precio: form ? form.elements.precio : null,
        cobertura: form ? form.elements.cobertura : null,
        descrip: form ? form.elements.descrip : null,
        submit: form ? form.querySelector('button[type="submit"]') : null
    };
}

function normalizarPaquete(paquete) {
    return {
        id: String(paquete.id_paquete || paquete.id || ""),
        nombre: String(paquete.nombre || "").trim(),
        precio: Number(paquete.precio || 0),
        cobertura: String(paquete.cobertura || "").trim(),
        descripcion: String(paquete.descripcion || "").trim()
    };
}

function valoresFormulario(form) {
    const formData = new FormData(form);
    return {
        nombre: String(formData.get("nombre") || "").trim(),
        precio: Number(formData.get("precio") || 0),
        cobertura: String(formData.get("cobertura") || "").trim(),
        descripcion: String(formData.get("descrip") || "").trim()
    };
}

function paqueteCambio(original, actualizado) {
    return original.nombre !== actualizado.nombre ||
        original.precio !== actualizado.precio ||
        original.cobertura !== actualizado.cobertura ||
        original.descripcion !== actualizado.descripcion;
}

function resetFormularioPaquete() {
    const { form, titulo, submit } = getFormElements();
    modoFormulario = "crear";
    paqueteEditando = null;
    if (form) form.reset();
    if (titulo) titulo.textContent = "Crear paquete";
    if (submit) submit.textContent = "Guardar";
}

function prepararCrearPaquete() {
    resetFormularioPaquete();
    mostrarFormulario();
}

function prepararEditarPaquete(id) {
    const paquete = paquetesActuales.get(String(id));
    if (!paquete) {
        alert("No se encontro la informacion del paquete.");
        return;
    }

    const { titulo, nombre, precio, cobertura, descrip, submit } = getFormElements();
    modoFormulario = "editar";
    paqueteEditando = { ...paquete };

    if (titulo) titulo.textContent = "Editar paquete";
    if (nombre) nombre.value = paquete.nombre;
    if (precio) precio.value = paquete.precio;
    if (cobertura) cobertura.value = paquete.cobertura;
    if (descrip) descrip.value = paquete.descripcion;
    if (submit) submit.textContent = "Guardar cambios";

    mostrarFormulario();
}

function initPaquetesPage() {
    if (!fotografoId) return;

    const nuevo = document.getElementById("nuevo");
    const listpaquetes = document.getElementById("lista-paquetes");

    if (nuevo) {
        nuevo.addEventListener("submit", function(e) {
            e.preventDefault();
            const data = valoresFormulario(this);

            if (modoFormulario === "editar" && paqueteEditando) {
                if (!paqueteCambio(paqueteEditando, data)) {
                    alert("No hay cambios para guardar.");
                    ocultarFormulario();
                    return;
                }

                fetchJson(`/paquetes/${paqueteEditando.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...data, id_fotografo: fotografoId })
                })
                .then(json => {
                    alert(json.message || 'Paquete actualizado');
                    renderPaquetes(listpaquetes);
                    ocultarFormulario();
                })
                .catch(err => {
                    console.error(err);
                    alert(err && err.message ? err.message : 'Error al actualizar');
                });
                return;
            }

            fetchJson('/paquetes', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_fotografo: fotografoId, ...data })
            })
            .then(json => {
                alert(json.message || 'Paquete creado');
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
            const btn = e.target.closest("button");
            if (!btn) return;

            const accion = btn.dataset.accion;
            const card = btn.closest(".paquete-card");
            const id = card ? card.dataset.id : null;

            if (!id) return;
            if (accion === "editar") prepararEditarPaquete(id);
            if (accion === "eliminar") eliminarPaquete(id, listpaquetes);
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
        paquetesActuales.clear();
        data.forEach(paquete => {
            const paqueteNormalizado = normalizarPaquete(paquete);
            paquetesActuales.set(paqueteNormalizado.id, paqueteNormalizado);
            listpaquetes.innerHTML += `
                <div class="paquete-card" data-id="${paquete.id_paquete}">
                    <h3>${paqueteNormalizado.nombre}</h3>
                    <p><b>Precio:</b> ${paqueteNormalizado.precio}</p>
                    <p><b>Cobertura:</b> ${paqueteNormalizado.cobertura}</p>
                    <p>${paqueteNormalizado.descripcion}</p>
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

window.mostrarFormulario = prepararCrearPaquete;
window.ocultarFormulario = ocultarFormulario;

document.addEventListener('DOMContentLoaded', initPaquetesPage);
