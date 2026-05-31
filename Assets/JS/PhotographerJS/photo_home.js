const photographerId = window.PhotoSportAuth ? window.PhotoSportAuth.getFotografoId() : localStorage.getItem('fotografoId');

function safeNumber(value) {
    return Number(value || 0);
}

function getApiUrl(path) {
    if (typeof apiUrl === 'function') return apiUrl(path);
    const API_BASE = 'http://localhost:3000';
    return String(path).startsWith('http') ? path : API_BASE + path;
}

function fetchJson(url) {
    const full = getApiUrl(url);
    return fetch(full).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });
}

function fetchStat(url) {
    return fetchJson(url).catch(err => {
        console.error(`Error cargando ${url}:`, err);
        return { total: 0 };
    });
}

function setText(el, value) {
    if (el) el.textContent = value;
}

function cambiar_valores() {
    const eventos = document.getElementById("home-eventos-inscritos");
    const clientes = document.getElementById("home-clientes");
    const fotos = document.getElementById("home-fotos");
    const ingresos = document.getElementById("home-ingresos");

    if (!photographerId) {
        setText(eventos, 0);
        setText(clientes, 0);
        setText(fotos, 0);
        setText(ingresos, "$0.00");
        return;
    }

    Promise.all([
        fetchStat(`/fotografo/${photographerId}/eventos_inscritos`),
        fetchStat(`/fotografo/${photographerId}/clientes_atendidos`),
        fetchStat(`/fotografo/${photographerId}/fotos_guardadas`),
        fetchStat(`/fotografo/${photographerId}/ingresos_totales`)
    ])
    .then(([eventosData, clientesData, fotosData, ingresosData]) => {
        setText(eventos, safeNumber(eventosData.total));
        setText(clientes, safeNumber(clientesData.total));
        setText(fotos, safeNumber(fotosData.total));
        setText(ingresos, "$" + safeNumber(ingresosData.total).toFixed(2));
    })
    .catch(err => {
        console.error('Error cargando métricas de fotógrafo:', err);
        setText(eventos, 0);
        setText(clientes, 0);
        setText(fotos, 0);
        setText(ingresos, "$0.00");
    });
}

document.addEventListener('DOMContentLoaded', cambiar_valores);
