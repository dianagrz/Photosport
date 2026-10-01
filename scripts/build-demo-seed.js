// Builds the data used by the GitHub Pages demo (Assets/JS/demo/seed-data.json)
// from the same SQL seed file used by the local MySQL database.
//
//   npm run build:demo
//
// The SQL seed only contains core records, so a few demo-only extras are added
// here so the static demo has something to show: sport names, photographer
// bios, purchase dates, portfolio photos and delivered photos.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SQL_FILE = path.join(ROOT, 'Database', 'photosportData.sql');
const OUT_FILE = path.join(ROOT, 'Assets', 'JS', 'demo', 'seed-data.json');
const DEMO_IMG_DIR = 'Assets/IMG/demo';

const ID_COLUMNS = {
    cliente: 'id_cliente',
    fotografo: 'id_fotografo',
    evento: 'id_evento',
    paquete_fotografico: 'id_paquete',
    compra: 'id_compra',
    solicitud_evento: 'id_solicitud',
    foto_entregada: 'id_foto_entregada',
    foto_portafolio: 'id_foto_portafolio'
};

// Parses a SQL VALUES list such as: 'María José', 1200, NULL
function parseValues(list) {
    const values = [];
    let i = 0;
    while (i < list.length) {
        const ch = list[i];
        if (ch === ' ' || ch === ',') { i++; continue; }
        if (ch === "'") {
            let str = '';
            i++;
            while (i < list.length) {
                if (list[i] === "'" && list[i + 1] === "'") { str += "'"; i += 2; continue; }
                if (list[i] === "'") break;
                str += list[i++];
            }
            i++;
            values.push(str);
            continue;
        }
        let token = '';
        while (i < list.length && list[i] !== ',') token += list[i++];
        token = token.trim();
        values.push(/^null$/i.test(token) ? null : Number(token));
    }
    return values;
}

function parseSql(sql) {
    const tables = {};
    const re = /INSERT INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\((.*)\);/gi;
    let match;
    while ((match = re.exec(sql))) {
        const [, table, cols, vals] = match;
        const columns = cols.split(',').map(c => c.trim());
        const values = parseValues(vals);
        const row = {};
        columns.forEach((col, idx) => { row[col] = values[idx]; });
        (tables[table] = tables[table] || []).push(row);
    }
    // Emulate AUTO_INCREMENT ids in insertion order.
    Object.entries(tables).forEach(([table, rows]) => {
        const idCol = ID_COLUMNS[table];
        if (!idCol) return;
        rows.forEach((row, idx) => { if (row[idCol] == null) row[idCol] = idx + 1; });
    });
    return tables;
}

function addDays(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

const SPECIALTIES = [
    'Fotografía de natación', 'Atletismo y carreras de ruta', 'Triatlón y deportes de resistencia',
    'Fotografía de acción', 'Retratos deportivos', 'Deportes acuáticos'
];

function build() {
    const t = parseSql(fs.readFileSync(SQL_FILE, 'utf8'));
    const eventoById = Object.fromEntries(t.evento.map(e => [e.id_evento, e]));
    const portfolioImages = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `${DEMO_IMG_DIR}/foto-${n}.svg`);

    // Demo-only: sport names used by eventos_por_cliente (mapping from conexion.js).
    const nombre_deporte = [
        { id_deporte: 0, nombre: 'Natación' },
        { id_deporte: 1, nombre: 'Atletismo' },
        { id_deporte: 2, nombre: 'Triatlón' }
    ];

    // Demo-only: profile details for photographers.
    t.fotografo.forEach((f, idx) => {
        f.especialidad = f.especialidad || SPECIALTIES[idx % SPECIALTIES.length];
        f.experiencia = f.experiencia || `${3 + (idx * 2) % 9} años`;
        f.sobre = f.sobre || `Soy ${f.nombre} y me dedico a la fotografía deportiva en Puebla. Me especializo en capturar los momentos clave de cada competencia y entregar fotos editadas en pocos días.`;
        f.foto = f.foto || `${DEMO_IMG_DIR}/perfil-${(idx % 4) + 1}.svg`;
    });

    // Demo-only: purchase dates spread in the weeks before each event.
    t.compra.forEach(c => {
        const evento = eventoById[c.id_evento];
        c.fecha = c.fecha || (evento ? addDays(evento.fecha_ini, -((c.id_compra * 7) % 45)) : null);
        c.metodo_pago = c.metodo_pago || 'tarjeta';
    });

    // Demo-only: portfolio photos (4 per photographer).
    const foto_portafolio = [];
    t.fotografo.forEach((f, idx) => {
        for (let k = 0; k < 4; k++) {
            foto_portafolio.push({
                id_foto_portafolio: foto_portafolio.length + 1,
                id_fotografo: f.id_fotografo,
                enlace: portfolioImages[(idx + k * 3) % portfolioImages.length]
            });
        }
    });

    // Demo-only: delivered photos for purchases already marked as delivered.
    const paqueteById = Object.fromEntries(t.paquete_fotografico.map(p => [p.id_paquete, p]));
    const foto_entregada = [];
    t.compra.filter(c => Number(c.entregado) === 1).forEach(c => {
        const paquete = paqueteById[c.id_paquete];
        for (let k = 0; k < 3; k++) {
            foto_entregada.push({
                id_foto_entregada: foto_entregada.length + 1,
                fecha: eventoById[c.id_evento] ? eventoById[c.id_evento].fecha_fin : c.fecha,
                enlace: portfolioImages[(c.id_compra + k) % portfolioImages.length],
                id_compra: c.id_compra,
                id_fotografo: paquete ? paquete.id_fotografo : null
            });
        }
    });

    const data = {
        cliente: t.cliente,
        fotografo: t.fotografo,
        evento: t.evento,
        paquete_fotografico: t.paquete_fotografico,
        fotografo_evento: t.fotografo_evento,
        compra: t.compra,
        solicitud_evento: t.solicitud_evento || [],
        foto_entregada,
        foto_portafolio,
        nombre_deporte
    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 1) + '\n');
    const counts = Object.entries(data).map(([k, v]) => `${k}: ${v.length}`).join(', ');
    console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${counts})`);
}

build();
