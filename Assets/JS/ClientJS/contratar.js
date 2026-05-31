const params = new URLSearchParams(window.location.search);
const fotografoId = params.get("id");
const eventoPreseleccionado = params.get("evento");
const clienteId = localStorage.getItem("clienteId") || "1";

const contratar = document.getElementById("contratar");
const paqueteSelect = document.getElementById("paquete");
const eventoSelect = document.getElementById("evento");

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
                paqueteSelect.innerHTML += `
                    <option value="${paquete.id_paquete}">
                        ${paquete.nombre || "Paquete"} - $${Number(paquete.precio || 0).toFixed(2)}
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
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        data.id_cliente = clienteId;
        data.id_paquete = data.id_paquete || null;
        data.id_evento = data.id_evento || null;

        fetch(apiUrl("/compra"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(async res => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw json;
            return json;
        })
        .then(d => {
            alert(d.message || "Compra realizada");
            window.location.href = "home_client.html";
        })
        .catch(err => {
            console.error(err);
            alert(err && err.message ? err.message : "Error al contratar");
        });
    });
}

cargarPaquetes();
cargarEventosFotografo();
