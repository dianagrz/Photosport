const params = new URLSearchParams(window.location.search);
const idEvento = params.get("id");
const clientes = document.getElementById("clientes");
const competenciaTitulo = document.getElementById("competencia");
const fotografoId = localStorage.getItem("fotografoId") || "1";

const inputFotosCompra = document.createElement("input");
inputFotosCompra.type = "file";
inputFotosCompra.multiple = true;
inputFotosCompra.accept = "image/*";
inputFotosCompra.style.display = "none";
document.body.appendChild(inputFotosCompra);

function estadoCompra(entregado) {
    return Number(entregado) === 1 ? "Entregada" : "Pendiente";
}

function fechaCompra(fecha) {
    return fecha ? new Date(fecha).toLocaleDateString("es-MX") : "Sin fecha";
}

function getCompras() {
    fetch(apiUrl(`/clientes/${fotografoId}/${idEvento}`))
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            clientes.innerHTML = "";
            if (!data || data.length === 0) {
                clientes.innerHTML = '<p class="empty-state">No hay compras registradas en este evento.</p>';
                return;
            }

            data.forEach(compra => {
                clientes.innerHTML += `
                <div class="evento-card" data-id="${compra.id}" data-compra-id="${compra.id_compra}">
                    <h3>${compra.nombre} ${compra.apellido || ""}</h3>
                    <p>Estado: ${estadoCompra(compra.entregado)}</p>
                    <p>Fecha: ${fechaCompra(compra.fecha)}</p>
                    <p>Correo: ${compra.correo || "No disponible"}</p>
                    <p>Paquete: ${compra.paquete || "Sin paquete"}</p>
                    <p>Categoria: ${compra.categoria || "No registrada"}</p>
                    <p>Pruebas: ${compra.pruebas || "No registradas"}</p>

                    <div class="acciones-evento">
                        <button data-accion="subir">Subir fotos</button>
                        <button data-accion="eliminar">Eliminar compra</button>
                    </div>
                </div>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando compras:", err);
            clientes.innerHTML = '<p class="error-state">No se pudieron cargar las compras.</p>';
        });
}

fetch(apiUrl(`/eventos/${idEvento}`))
    .then(res => res.json())
    .then(data => {
        competenciaTitulo.textContent = data.nombre || "";
    })
    .catch(console.error);

if (clientes) {
    clientes.addEventListener("click", function(e) {
        const btn = e.target.closest("button");
        if (!btn) return;

        const accion = btn.dataset.accion;
        const card = btn.closest(".evento-card");
        const idCompra = card ? card.dataset.compraId : null;

        if (accion === "subir" && idCompra) {
            inputFotosCompra.dataset.compraId = idCompra;
            inputFotosCompra.click();
            return;
        }

        if (accion === "eliminar" && idCompra) {
            fetch(apiUrl(`/compra/${idCompra}`), { method: "DELETE" })
                .then(async res => {
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw json;
                    alert(json.message || "Compra eliminada");
                    getCompras();
                })
                .catch(err => {
                    console.error("Error eliminando compra:", err);
                    alert(err && err.message ? err.message : "Error al eliminar");
                });
        }
    });
}

inputFotosCompra.addEventListener("change", function() {
    const idCompra = this.dataset.compraId;
    const archivos = this.files;
    if (!idCompra) {
        alert("No se encontro la compra asociada.");
        return;
    }

    const formData = new FormData();
    for (let file of archivos) {
        if (!file.type.startsWith("image/")) {
            alert("Solo imagenes permitidas");
            return;
        }
        formData.append("fotos", file);
    }

    formData.append("id_compra", idCompra);
    formData.append("id_fotografo", fotografoId);
    formData.append("tipo", "entrega");

    fetch(apiUrl("/upload"), {
        method: "POST",
        body: formData
    })
    .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw json;
        return json;
    })
    .then(msg => {
        alert(msg.message || "Fotos subidas correctamente");
        inputFotosCompra.value = "";
        getCompras();
    })
    .catch(err => {
        console.error("Upload error:", err);
        alert(err && err.message ? err.message : "Error al subir fotos");
    });
});

getCompras();
