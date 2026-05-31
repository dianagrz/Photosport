const compraPendienteKey = "photosportCompraPendiente";
const paymentForm = document.getElementById("payment-form");
const cancelPayment = document.getElementById("cancel-payment");
const submitPayment = paymentForm ? paymentForm.querySelector('button[type="submit"]') : null;

function getCompraPendiente() {
    try {
        return JSON.parse(sessionStorage.getItem(compraPendienteKey) || "null");
    } catch (err) {
        console.error("No se pudo leer la compra pendiente:", err);
        return null;
    }
}

function setSummaryText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function money(value) {
    const precio = Number(value || 0);
    return `$${Number.isFinite(precio) ? precio.toFixed(2) : "0.00"} MXN`;
}

function renderSummary(compra) {
    if (!compra) {
        setSummaryText("summary-paquete", "Sin paquete seleccionado");
        setSummaryText("summary-paquete-precio", money(0));
        setSummaryText("summary-evento", "Regresa al formulario");
        setSummaryText("summary-fotografo", "Pendiente");
        setSummaryText("summary-total", money(0));
        if (submitPayment) submitPayment.disabled = true;
        return;
    }

    setSummaryText("summary-paquete", compra.paquete_nombre || "Paquete");
    setSummaryText("summary-paquete-precio", money(compra.paquete_precio));
    setSummaryText("summary-evento", compra.evento_nombre || "Evento");
    setSummaryText("summary-fotografo", compra.fotografo_nombre || "Fotografo seleccionado");
    setSummaryText("summary-total", money(compra.paquete_precio));
    if (submitPayment) submitPayment.disabled = false;
}

function refreshPackagePrice(compra) {
    if (!compra || !compra.id_paquete) return Promise.resolve(compra);

    return fetch(apiUrl(`/paquetes/${compra.id_paquete}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(paquete => {
            const updatedCompra = {
                ...compra,
                paquete_nombre: paquete.nombre || compra.paquete_nombre,
                paquete_precio: paquete.precio ?? compra.paquete_precio
            };
            sessionStorage.setItem(compraPendienteKey, JSON.stringify(updatedCompra));
            return updatedCompra;
        })
        .catch(err => {
            console.error("No se pudo actualizar el precio del paquete:", err);
            return compra;
        });
}

function refreshPhotographerName(compra) {
    if (!compra || !compra.id_fotografo) return Promise.resolve(compra);

    return fetch(apiUrl(`/fotografos/${compra.id_fotografo}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(fotografo => {
            const nombre = [fotografo.nombre, fotografo.apellido].filter(Boolean).join(" ");
            const updatedCompra = {
                ...compra,
                fotografo_nombre: nombre || compra.fotografo_nombre
            };
            sessionStorage.setItem(compraPendienteKey, JSON.stringify(updatedCompra));
            return updatedCompra;
        })
        .catch(err => {
            console.error("No se pudo actualizar el fotografo del pago:", err);
            return compra;
        });
}

function buildCompraPayload(compra) {
    return {
        id_cliente: compra.id_cliente,
        id_paquete: compra.id_paquete,
        id_evento: compra.id_evento,
        atleta: compra.atleta || null,
        edad: compra.edad || null,
        categoria: compra.categoria || null,
        rama: compra.rama || null,
        equipo: compra.equipo || null,
        pruebas: compra.pruebas || null,
        metodo_pago: "tarjeta"
    };
}

let compraPendiente = getCompraPendiente();
renderSummary(compraPendiente);
refreshPackagePrice(compraPendiente).then(refreshPhotographerName).then(compraActualizada => {
    compraPendiente = compraActualizada;
    renderSummary(compraPendiente);
});

if (paymentForm) {
    paymentForm.addEventListener("submit", function(event) {
        event.preventDefault();
        if (!this.reportValidity()) return;

        const compra = getCompraPendiente();
        if (!compra) {
            alert("No hay una compra pendiente. Vuelve a seleccionar un paquete.");
            return;
        }

        if (submitPayment) {
            submitPayment.disabled = true;
            submitPayment.textContent = "Procesando...";
        }

        fetch(apiUrl("/compra"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildCompraPayload(compra))
        })
        .then(async res => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw json;
            return json;
        })
        .then(data => {
            sessionStorage.removeItem(compraPendienteKey);
            alert(data.message || "Pago confirmado");
            window.location.href = "home_client.html";
        })
        .catch(err => {
            console.error("Error confirmando pago:", err);
            alert(err && err.message ? err.message : "Error al confirmar el pago");
            if (submitPayment) {
                submitPayment.disabled = false;
                submitPayment.innerHTML = '<i class="fa-solid fa-lock"></i> Confirmar pago';
            }
        });
    });
}

if (cancelPayment) {
    cancelPayment.addEventListener("click", function() {
        const compra = getCompraPendiente();
        if (compra && compra.id_fotografo) {
            const query = new URLSearchParams({ id: compra.id_fotografo });
            if (compra.id_evento) query.set("evento", compra.id_evento);
            window.location.href = `contratar.html?${query.toString()}`;
            return;
        }

        window.location.href = "eventos.html";
    });
}
