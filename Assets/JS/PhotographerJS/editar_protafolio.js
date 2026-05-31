function getApiUrl(path) {
    if (typeof apiUrl === 'function') return apiUrl(path);
    const API_BASE = 'http://localhost:3000';
    return String(path).startsWith('http') ? path : API_BASE + path;
}

const subir_fotos = document.getElementById("subir_fotos")

// LISTENER PARA SUBIR TODAS LAS NUEVAS FOTOS CARGADAS A LA BD
if (subir_fotos) {
    subir_fotos.addEventListener("submit", function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const fotografoId = localStorage.getItem('fotografoId') || '1';
        
        // Add fotografo ID and upload type to the form data
        formData.append('id_fotografo', fotografoId);
        formData.append('tipo', 'portafolio');

        fetch(getApiUrl('/upload'), {
            method: "POST",
            body: formData
        })
        .then(async res => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw json;
            return json;
        })
        .then(msg => {
            alert(msg.message || "Fotos subidas");
            subir_fotos.reset();
            showImages();
        })
        .catch(err => { console.error(err); alert(err && err.message ? err.message : 'Error'); });
    });
}

const imagenes = document.getElementById("imagenes");
const fotografoId = localStorage.getItem('fotografoId') || '1';

function getImageUrl(path) {
    if (!path) return "";
    if (String(path).startsWith("http")) return path;
    return getApiUrl(String(path).startsWith("/") ? path : `/${path}`);
}

/* FUNCION PARA Q APAREZCAN TODAS LAS IMAGENS AL CARGAR LA PAGINA */
function showImages() {
    if (!imagenes) return;
    imagenes.innerHTML="";

    fetch(getApiUrl(`/fotos?fotografo=${fotografoId}`))
    .then(res => res.json())
    .then(data => {
        data.forEach(foto => {
            imagenes.innerHTML += `
            <div class="foto-item" data-id="${foto.id}">
                <img src="${getImageUrl(foto.url)}">
                <button class="btn-eliminar" data-accion="borrar"><i class="fa-solid fa-trash"></i></button>
            </div>
            `;
        });
    })
    .catch(console.error);
}
showImages();


// LISTENER PARA BORRAR IMAGEN
if (imagenes) {
    imagenes.addEventListener("click", function(e) {
        if (e.target.tagName === "BUTTON") {
            const accion = e.target.dataset.accion;
            const card = e.target.closest(".foto-item");
            const id = card.dataset.id;

            if (accion === "borrar") {
                fetch(getApiUrl(`/fotos/${id}`), {
                    method: 'DELETE'
                })
                .then(async res => {
                    const json = await res.json().catch(()=>({}));
                    if (!res.ok) throw json;
                    alert(json.message || 'Eliminado');
                    showImages();
                })
                .catch(error => { console.error("Error en la petición:", error); alert('Error al eliminar'); });
            }
        }
    });
}
