console.log('page-binding.js loaded');

function q(param) {
    const u = new URL(window.location.href);
    return u.searchParams.get(param);
}

// Always use localhost:3000 for backend API
window.API_BASE = 'http://localhost:3000';

// If the page was opened via the file: protocol, redirect to the equivalent http URL
if (window.location.protocol === 'file:') {
    try {
        const filePath = window.location.pathname.replace(/\\\\/g, '/');
        const hostUrl = window.API_BASE.replace(/\/$/, '');
        const projectIndex = filePath.indexOf('/Pagina_Patrones_Natacion_2');
        let relativePath = filePath;
        if (projectIndex >= 0) {
            relativePath = filePath.slice(projectIndex + '/Pagina_Patrones_Natacion_2'.length);
        } else {
            relativePath = filePath.replace(/^\/[A-Za-z]:/, '');
        }
        if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
        }
        const target = hostUrl + relativePath + (window.location.search || '');
        console.warn('Page opened via file:// — redirecting to', target);
        window.location.href = target;
    } catch (e) {
        console.error('Redirect from file: to http failed', e);
    }
}

window.apiUrl = function(path) {
    return String(path).startsWith('http') ? path : window.API_BASE + path;
};

const SESSION_KEYS = ['clienteId', 'fotografoId', 'userName', 'nombre', 'userType'];
const SESSION_STORAGE_KEYS = ['photosportCompraPendiente'];

function getLoginUrl() {
    const pagesIndex = window.location.pathname.indexOf('/Pages/');
    const basePath = pagesIndex >= 0 ? window.location.pathname.slice(0, pagesIndex) : '';
    return `${window.location.origin}${basePath}/Pages/index.html`;
}

function clearPhotoSportSession() {
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    SESSION_STORAGE_KEYS.forEach(key => sessionStorage.removeItem(key));
}

function getRequiredRole() {
    const path = window.location.pathname;
    if (path.includes('/Pages/client/')) return 'cliente';
    if (path.includes('/Pages/photographer/')) return 'fotografo';
    return null;
}

function hasRequiredSession(role) {
    if (role === 'cliente') return Boolean(localStorage.getItem('clienteId'));
    if (role === 'fotografo') return Boolean(localStorage.getItem('fotografoId'));
    return true;
}

function redirectIfMissingSession() {
    const role = getRequiredRole();
    if (!role || hasRequiredSession(role)) return false;

    window.PhotoSportAuth.isRedirecting = true;
    window.location.replace(getLoginUrl());
    return true;
}

function logout(targetUrl) {
    clearPhotoSportSession();
    window.location.replace(targetUrl || getLoginUrl());
}

window.PhotoSportAuth = {
    isRedirecting: false,
    clearSession: clearPhotoSportSession,
    getClienteId: () => localStorage.getItem('clienteId'),
    getFotografoId: () => localStorage.getItem('fotografoId'),
    logout,
    redirectIfMissingSession
};

redirectIfMissingSession();
window.addEventListener('pageshow', redirectIfMissingSession);

function fetchJson(url) {
    const full = window.apiUrl(url);
    return fetch(full).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}

// Renderers
function renderFotografosContainer(container, data) {
    if (!container) return;
    if (!data || data.length === 0) { container.innerHTML = '<p class="empty-state">No hay fotógrafos disponibles.</p>'; return; }
    container.innerHTML = '';
    data.forEach(f => {
        container.innerHTML += `
            <div class="fotografo-card" data-id="${f.id_fotografo}">
                <img src="../../Assets/IMG/fondo.jpg" alt="${f.nombre} ${f.apellido}">
                <h3>${f.nombre} ${f.apellido}</h3>
                <p>Correo: ${f.correo}</p>
                <a href="perfil-fotografo.html?id=${f.id_fotografo}"><button>Ver portafolio</button></a>
            </div>
        `;
    });
}

function renderEventosContainer(container, data) {
    if (!container) return;
    if (!data || data.length === 0) { container.innerHTML = '<p class="empty-state">No hay eventos disponibles.</p>'; return; }
    container.innerHTML = '';
    data.forEach(e => {
        container.innerHTML += `
            <div class="evento-card" data-id="${e.id_evento}">
                <img src="../../Assets/IMG/fondo.jpg" alt="${e.nombre}">
                <h3>${e.nombre}</h3>
                <p>Fecha inicio: ${e.fecha_ini || 'Sin fecha'}</p>
                <p>Organizador: ${e.organizador || 'No disponible'}</p>
                <a href="../client/galeria.html?id=${e.id_evento}"><button>Ver fotos</button></a>
            </div>
        `;
    });
}

function renderGaleria(container, fotos) {
    if (!container) return;
    if (!fotos || fotos.length === 0) { container.innerHTML = '<p class="empty-state">No hay fotos para este evento.</p>'; return; }
    container.innerHTML = '';
    fotos.forEach(f => {
        container.innerHTML += `
            <div class="foto-item" data-id="${f.id}">
                <img src="${f.url}" alt="foto-${f.id}">
            </div>
        `;
    });
}

function renderPerfil(container, perfil) {
    if (!container) return;
    if (!perfil || !perfil.id_fotografo) { container.innerHTML = '<p class="empty-state">Perfil no disponible.</p>'; return; }
    container.innerHTML = `
        <div class="perfil-header">
            <img src="../../Assets/IMG/fondo.jpg" alt="${perfil.nombre} ${perfil.apellido}">
            <h2>${perfil.nombre} ${perfil.apellido}</h2>
            <p>Correo: ${perfil.correo}</p>
            <p>Teléfono: ${perfil.telefono || 'No disponible'}</p>
        </div>
        <div class="perfil-about">
            <h3>Sobre</h3>
            <p>${perfil.sobre || ''}</p>
        </div>
    `;
}

// Bindings
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a').forEach(link => {
        const label = link.textContent.trim().toLowerCase();
        if (!label.includes('cerrar sesión') && !label.includes('cerrar sesion')) return;

        link.addEventListener('click', event => {
            event.preventDefault();
            logout(link.href || getLoginUrl());
        });
    });

    // fotografos
    const fotosContainer = document.getElementById('fotografos');
    if (fotosContainer) {
        console.log('page-binding: loading fotografos');
        if (fotosContainer.innerHTML && fotosContainer.innerHTML.trim().length > 0) {
            console.log('page-binding: fotografos container already populated, skipping');
        } else {
            fetchJson('/fotografos').then(data => renderFotografosContainer(fotosContainer, data)).catch(err => { console.error(err); fotosContainer.innerHTML = '<p class="error-state">No se pudieron cargar los fotógrafos.</p>'; });
        }
    }

    // eventos
    const eventosContainer = document.getElementById('eventos');
    if (eventosContainer) {
        console.log('page-binding: loading eventos');
        if (eventosContainer.innerHTML && eventosContainer.innerHTML.trim().length > 0) {
            console.log('page-binding: eventos container already populated, skipping');
        } else {
            fetchJson('/eventos').then(data => renderEventosContainer(eventosContainer, data)).catch(err => { console.error(err); eventosContainer.innerHTML = '<p class="error-state">No se pudieron cargar los eventos.</p>'; });
        }
    }

    // galeria
    const galeriaContainer = document.getElementById('galeria');
    if (galeriaContainer) {
        const eventoId = q('id');
        if (eventoId) {
            console.log('page-binding: loading galeria for evento', eventoId);
            if (galeriaContainer.innerHTML && galeriaContainer.innerHTML.trim().length > 0) {
                console.log('page-binding: galeria container already populated, skipping');
            } else {
                fetchJson(`/fotos?evento=${eventoId}`).then(data => renderGaleria(galeriaContainer, data)).catch(err => { console.error(err); galeriaContainer.innerHTML = '<p class="error-state">No se pudieron cargar las fotos.</p>'; });
            }
        }
    }

    // perfil fotografo
    const perfilContainer = document.getElementById('perfil-fotografo');
    if (perfilContainer) {
        const id = q('id');
        if (id) {
            console.log('page-binding: loading perfil fotografo', id);
            if (perfilContainer.innerHTML && perfilContainer.innerHTML.trim().length > 0) {
                console.log('page-binding: perfil container already populated, skipping');
            } else {
                fetchJson(`/fotografos/${id}`).then(data => renderPerfil(perfilContainer, data)).catch(err => { console.error(err); perfilContainer.innerHTML = '<p class="error-state">No se pudo cargar el perfil.</p>'; });
            }
        }
    }

    // paquetes list
    const paquetesContainer = document.getElementById('paquetes');
    if (paquetesContainer) {
        const fotografo = q('fotografo') || q('id');
        let url = '/paquetes';
        if (fotografo) url += `?fotografo=${fotografo}`;
        if (paquetesContainer.innerHTML && paquetesContainer.innerHTML.trim().length > 0) {
            console.log('page-binding: paquetes container already populated, skipping');
        } else {
            fetchJson(url).then(data => {
            if (!data || data.length === 0) { paquetesContainer.innerHTML = '<p class="empty-state">No hay paquetes.</p>'; return; }
            paquetesContainer.innerHTML = '';
            data.forEach(p => {
                paquetesContainer.innerHTML += `
                    <div class="paquete-card" data-id="${p.id_paquete}">
                        <h4>${p.nombre || 'Paquete'}</h4>
                        <p>Precio: ${p.precio || '—'}</p>
                        <p>${p.descripcion || ''}</p>
                        <button class="comprar" data-id="${p.id_paquete}">Comprar</button>
                    </div>
                `;
            });
            }).catch(err => { console.error(err); paquetesContainer.innerHTML = '<p class="error-state">No se pudieron cargar los paquetes.</p>'; });
        }
    }

});
