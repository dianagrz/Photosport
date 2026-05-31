const params = new URLSearchParams(window.location.search);
const fotografoId = params.get("id");
const eventoPreseleccionado = params.get("evento");
const clienteId = window.PhotoSportAuth ? window.PhotoSportAuth.getClienteId() : localStorage.getItem("clienteId");
const compraPendienteKey = "photosportCompraPendiente";

const contratar = document.getElementById("contratar");
const paqueteSelect = document.getElementById("paquete");
const eventoSelect = document.getElementById("evento");

function escapeAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function selectedOptionData(select) {
    if (!select || select.selectedIndex < 0) return {};
    const option = select.options[select.selectedIndex];
    return {
        text: option ? option.textContent.trim() : "",
        nombre: option ? option.dataset.nombre : "",
        precio: option ? option.dataset.precio : ""
    };
}

function cargarPaquetes() {
    if (!paqueteSelect || !fotografoId) return;

    fetch(apiUrl(`/paquetes?fotografo=${fotografoId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(paquetes => {
            paqueteSelect.innerHTML = '<option value="">Selecciona un paquete</option>';
            paquetes.forEach(paquete => {
                const rawPrecio = Number(paquete.precio || 0);
                const precio = Number.isFinite(rawPrecio) ? rawPrecio : 0;
                paqueteSelect.innerHTML += `
                    <option value="${paquete.id_paquete}" data-nombre="${escapeAttr(paquete.nombre || "Paquete")}" data-precio="${precio}">
                        ${paquete.nombre || "Paquete"} - $${precio.toFixed(2)}
                    </option>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando paquetes:", err);
            paqueteSelect.innerHTML = '<option value="">No se pudieron cargar paquetes</option>';
        });
}

function cargarEventosFotografo() {
    if (!eventoSelect || !fotografoId) return;

    fetch(apiUrl(`/eventos/fotografo/${fotografoId}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(eventos => {
            eventoSelect.innerHTML = '<option value="">Selecciona un evento</option>';
            eventos.forEach(evento => {
                const selected = String(evento.id_evento) === String(eventoPreseleccionado) ? "selected" : "";
                eventoSelect.innerHTML += `
                    <option value="${evento.id_evento}" ${selected}>
                        ${evento.nombre} - ${evento.lugar || "Sin lugar"}
                    </option>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando eventos del fotografo:", err);
            eventoSelect.innerHTML = '<option value="">No se pudieron cargar eventos</option>';
        });
}

if (contratar) {
    contratar.addEventListener("submit", function(event) {
        event.preventDefault();
        if (!clienteId) return;
        if (!this.reportValidity()) return;

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        const paquete = selectedOptionData(paqueteSelect);
        const eventoSeleccionado = selectedOptionData(eventoSelect);

        const compraPendiente = {
            ...data,
            id_cliente: clienteId,
            id_fotografo: fotografoId,
            id_paquete: data.id_paquete,
            id_evento: data.id_evento,
            paquete_nombre: paquete.nombre || paquete.text.replace(/\s-\s\$.*$/, "") || "Paquete",
            paquete_precio: paquete.precio || "0",
            evento_nombre: eventoSeleccionado.text || "Evento"
        };

        sessionStorage.setItem(compraPendienteKey, JSON.stringify(compraPendiente));

        const query = new URLSearchParams({
            fotografo: fotografoId,
            evento: data.id_evento,
            paquete: data.id_paquete
        });

        window.location.href = `simular_pago.html?${query.toString()}`;
    });
}

if (clienteId) {
    cargarPaquetes();
    cargarEventosFotografo();
}
