const ingreso = document.getElementById("ingreso");
const clientes = document.getElementById("clientes");
const eventos = document.getElementById("eventos-cubiertos");
const grafica = document.getElementById('graficaIngresos');
const graficaCtx = grafica ? grafica.getContext('2d') : null;
const ingresoCompe = document.getElementById("tabla-eventos");
const photographerId = localStorage.getItem('fotografoId') || '1';

function safeNumber(value) {
    return Number(value || 0);
}

function fetchJson(url) {
    const fullUrl = typeof apiUrl === 'function'
        ? apiUrl(url)
        : `http://localhost:3000${url}`;

    return fetch(fullUrl).then(res => {
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

function cambiar_valores() {
    if (!photographerId) {
        eventos.textContent = 0;
        clientes.textContent = 0;
        ingreso.textContent = "$0.00";
        return;
    }

    Promise.all([
        fetchStat(`/fotografo/${photographerId}/ingresos_totales`),
        fetchStat(`/fotografo/${photographerId}/clientes_atendidos`),
        fetchStat(`/fotografo/${photographerId}/eventos_cubiertos`)
    ])
    .then(([ingresosData, clientesData, eventosData]) => {
        ingreso.textContent = "$" + safeNumber(ingresosData.total).toFixed(2);
        clientes.textContent = safeNumber(clientesData.total);
        eventos.textContent = safeNumber(eventosData.total);
    })
    .catch(err => {
        console.error('Error cargando estadísticas:', err);
    });
}

function tabla() {
    if (!photographerId) return;

    fetchJson(`/fotografo/${photographerId}/ingresos_por_mes`)
        .then(data => {
            const months = Array(12).fill(0);
            data.forEach(row => {
                const index = Math.max(0, Math.min(11, Number(row.mes) - 1));
                months[index] = safeNumber(row.total);
            });

            if (!graficaCtx) return console.warn('No canvas context for chart');
            new Chart(graficaCtx, {
                type: 'bar',
                data: {
                    labels: ['Enero','Febrero','Marzo','Abril','Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
                    datasets: [{
                        label: 'Ingresos MXN',
                        data: months,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        })
        .catch(err => {
            console.error('Error cargando ingresos por mes:', err);
        });
}

function fcompe() {
    if (!photographerId) return;
    ingresoCompe.innerHTML = "";

    fetchJson(`/fotografo/${photographerId}/ingresos_por_evento`)
    .then(data => {
        if (!data || data.length === 0) {
            ingresoCompe.innerHTML = '<tr><td colspan="3">No hay datos de eventos.</td></tr>';
            return;
        }

        data.forEach(evento => {
            ingresoCompe.innerHTML += `
                <tr>
                    <td>${evento.evento || `Evento ${evento.id_evento}`}</td>
                    <td>${evento.clientes || 'N/A'}</td>
                    <td>$${safeNumber(evento.total).toFixed(2)}</td>
                </tr>
            `;
        });
    })
    .catch(err => {
        console.error('Error cargando ingresos por evento:', err);
        ingresoCompe.innerHTML = '<tr><td colspan="3">Error cargando datos.</td></tr>';
    });
}

cambiar_valores();
tabla();
fcompe();
