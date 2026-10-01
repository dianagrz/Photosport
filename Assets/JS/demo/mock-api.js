// PhotoSport demo mode
// ---------------------------------------------------------------------------
// GitHub Pages can only host static files, so the Express + MySQL backend in
// Assets/JS/conexion.js can't run there. When the site is served from
// *.github.io (or opened with ?demo=1), this script intercepts the calls the
// pages make to the API (http://localhost:3000/...) and answers them in the
// browser with the same JSON shapes as the real server. Data comes from
// seed-data.json (generated from Database/photosportData.sql) and changes are
// saved in localStorage.
//
// Running locally (localhost, no ?demo=1) this script does nothing.
// ---------------------------------------------------------------------------
(function () {
    const MODE_KEY = 'photosportDemoMode';
    const DB_KEY = 'photosportDemoDB';
    const DB_VERSION = 1;
    const API_ORIGIN = 'http://localhost:3000';

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
    }
    function storageRemove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') storageSet(MODE_KEY, '1');
    if (params.get('demo') === '0') storageRemove(MODE_KEY);

    const enabled = window.location.hostname.endsWith('github.io') || storageGet(MODE_KEY) === '1';
    if (!enabled) return;

    const scriptUrl = document.currentScript && document.currentScript.src;
    const SITE_ROOT = new URL('../../../', scriptUrl || window.location.href).href;
    const SEED_URL = new URL('seed-data.json', scriptUrl || window.location.href).href;
    const realFetch = window.fetch.bind(window);

    window.PhotoSportDemo = { enabled: true, reset: resetDemo };

    // ---------------------------------------------------------------------
    // Data store
    // ---------------------------------------------------------------------
    let db = null;
    let dbPromise = null;

    function todayIso() {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function addDays(isoDate, days) {
        if (!isoDate) return isoDate;
        const d = new Date(isoDate + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    // Keep the demo alive over time: move all dates forward so the last event
    // is always a few weeks away when the data is first loaded.
    function shiftDates(data) {
        const lastEnd = data.evento.map(e => e.fecha_fin || e.fecha_ini).sort().pop();
        if (!lastEnd) return;
        const target = addDays(todayIso(), 21);
        const diff = Math.round((new Date(target) - new Date(lastEnd)) / 86400000);
        if (diff <= 0) return;
        data.evento.forEach(e => { e.fecha_ini = addDays(e.fecha_ini, diff); e.fecha_fin = addDays(e.fecha_fin, diff); });
        data.compra.forEach(c => { c.fecha = addDays(c.fecha, diff); });
        data.foto_entregada.forEach(f => { f.fecha = addDays(f.fecha, diff); });
    }

    function loadDb() {
        if (dbPromise) return dbPromise;
        dbPromise = (async () => {
            const stored = storageGet(DB_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.version === DB_VERSION) { db = parsed.data; return db; }
                } catch (e) { /* fall through to seed */ }
            }
            const res = await realFetch(SEED_URL);
            const data = await res.json();
            shiftDates(data);
            db = data;
            save();
            return db;
        })();
        return dbPromise;
    }

    function save() {
        return storageSet(DB_KEY, JSON.stringify({ version: DB_VERSION, data: db }));
    }

    function resetDemo() {
        storageRemove(DB_KEY);
        ['clienteId', 'fotografoId', 'userName', 'nombre', 'userType'].forEach(storageRemove);
        try { sessionStorage.removeItem('photosportCompraPendiente'); } catch (e) { /* ignore */ }
        const pagesIndex = window.location.pathname.indexOf('/Pages/');
        const base = pagesIndex >= 0 ? window.location.pathname.slice(0, pagesIndex) : '';
        window.location.href = `${window.location.origin}${base}/Pages/index.html`;
    }

    function nextId(table, column) {
        return db[table].reduce((max, row) => Math.max(max, Number(row[column]) || 0), 0) + 1;
    }

    const eq = (a, b) => a != null && b != null && String(a) === String(b);
    const byId = (table, column, id) => db[table].find(row => eq(row[column], id));
    const clone = obj => JSON.parse(JSON.stringify(obj));

    // Demo images are stored as relative paths or data: URLs. Pages only treat
    // "http..." (and data:/blob:) as absolute, so resolve relative paths here.
    function imgUrl(enlace) {
        if (!enlace) return enlace;
        if (/^(https?:|data:|blob:)/i.test(enlace)) return enlace;
        return new URL(String(enlace).replace(/^\//, ''), SITE_ROOT).href;
    }

    function withoutPassword(row) {
        if (!row) return row;
        const copy = clone(row);
        delete copy.contrasena;
        if (copy.foto) copy.foto = imgUrl(copy.foto);
        return copy;
    }

    function packagesOf(fotografoId) {
        return db.paquete_fotografico.filter(p => eq(p.id_fotografo, fotografoId));
    }

    function comprasOfFotografo(fotografoId) {
        const ids = new Set(packagesOf(fotografoId).map(p => p.id_paquete));
        return db.compra.filter(c => ids.has(c.id_paquete));
    }

    function precioOf(compra) {
        const p = byId('paquete_fotografico', 'id_paquete', compra.id_paquete);
        return p ? Number(p.precio) || 0 : 0;
    }

    const eventoFields = e => ({
        id_evento: e.id_evento, nombre: e.nombre, deporte: e.deporte, fecha_ini: e.fecha_ini,
        fecha_fin: e.fecha_fin, lugar: e.lugar, organizador: e.organizador
    });

    // ---------------------------------------------------------------------
    // Responses
    // ---------------------------------------------------------------------
    class HttpError extends Error {
        constructor(status, message) { super(message); this.status = status; }
    }
    const fail = (status, message) => { throw new HttpError(status, message); };

    function persistOrFail() {
        if (!save()) fail(507, 'El almacenamiento del navegador está lleno. Usa "Reiniciar demo" para liberar espacio.');
    }

    // ---------------------------------------------------------------------
    // Routes (mirror Assets/JS/conexion.js)
    // ---------------------------------------------------------------------
    const routes = [];
    const route = (method, pattern, handler) => routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });

    route('POST', '/registro', ({ body }) => {
        const { nombre, apellido, correo, telefono, password, tipo } = body;
        if (!nombre || !apellido || !correo || !password || !tipo) fail(400, 'Faltan campos requeridos');
        const exists = db.cliente.some(c => c.correo === correo) || db.fotografo.some(f => f.correo === correo);
        if (exists) fail(409, 'El correo ya está registrado');
        const row = { nombre, apellido, correo, telefono: telefono || null, contrasena: password };
        if (tipo === 'cliente') {
            row.id_cliente = nextId('cliente', 'id_cliente');
            db.cliente.push(row);
            persistOrFail();
            return { message: 'Cliente registrado correctamente', tipo: 'cliente', id: row.id_cliente };
        }
        if (tipo === 'fotografo') {
            row.id_fotografo = nextId('fotografo', 'id_fotografo');
            db.fotografo.push(row);
            persistOrFail();
            return { message: 'Fotógrafo registrado correctamente', tipo: 'fotografo', id: row.id_fotografo };
        }
        fail(400, 'Tipo de usuario inválido');
    });

    route('POST', '/login', ({ body }) => {
        const { email, password } = body;
        if (!email || !password) fail(400, 'Faltan credenciales');
        const cliente = db.cliente.find(c => c.correo === email && c.contrasena === password);
        if (cliente) return { id: cliente.id_cliente, tipo: 'cliente' };
        const fotografo = db.fotografo.find(f => f.correo === email && f.contrasena === password);
        if (fotografo) return { id: fotografo.id_fotografo, tipo: 'fotografo' };
        fail(401, 'Credenciales inválidas');
    });

    // Eventos
    route('GET', '/eventos', () => db.evento.map(eventoFields));

    route('POST', '/eventos', ({ body }) => {
        const { nombre, deporte, fecha_ini, fecha_fin, lugar, organizador } = body;
        if (!nombre || !fecha_ini || !lugar || !organizador) fail(400, 'Faltan campos requeridos');
        const id = nextId('evento', 'id_evento');
        db.evento.push({ id_evento: id, nombre, deporte: deporte ?? null, fecha_ini, fecha_fin: fecha_fin || null, lugar, organizador });
        persistOrFail();
        return { message: 'Evento creado correctamente', id_evento: id };
    });

    route('POST', '/solicitud_evento', ({ body }) => {
        const { nombre, deporte, fromFecha, toFecha, lugar, organizador } = body;
        if (!nombre || !fromFecha || !lugar || !organizador) fail(400, 'Faltan campos requeridos');
        const map = { 'natación': 0, natacion: 0, atletismo: 1, 'triatlón': 2, triatlon: 2 };
        const deporteValue = deporte == null ? null : (typeof deporte === 'number' ? deporte : map[String(deporte).trim().toLowerCase()] ?? null);
        const id = nextId('solicitud_evento', 'id_solicitud');
        db.solicitud_evento.push({ id_solicitud: id, nombre, deporte: deporteValue, fecha_ini: fromFecha, fecha_fin: toFecha || null, lugar, organizador });
        persistOrFail();
        return { message: 'Solicitud de evento enviada correctamente', id_solicitud: id };
    });

    route('GET', '/eventos/fotografo/:id', ({ p }) => {
        const ids = new Set(db.fotografo_evento.filter(fe => eq(fe.id_fotografo, p.id)).map(fe => fe.id_evento));
        return db.evento.filter(e => ids.has(e.id_evento)).map(eventoFields);
    });

    route('GET', '/eventos/no-inscritos/:id', ({ p }) => {
        const ids = new Set(db.fotografo_evento.filter(fe => eq(fe.id_fotografo, p.id)).map(fe => fe.id_evento));
        const today = todayIso();
        return db.evento.filter(e => !ids.has(e.id_evento) && e.fecha_fin >= today).map(eventoFields);
    });

    route('GET', '/eventos/no-inscritos-cliente/:id', ({ p }) => {
        const ids = new Set(db.compra.filter(c => eq(c.id_cliente, p.id)).map(c => c.id_evento));
        const today = todayIso();
        return db.evento.filter(e => !ids.has(e.id_evento) && e.fecha_fin >= today).map(eventoFields);
    });

    route('GET', '/eventos/cliente/:id', ({ p }) => {
        return db.compra.filter(c => eq(c.id_cliente, p.id)).map(c => {
            const e = byId('evento', 'id_evento', c.id_evento);
            const paquete = byId('paquete_fotografico', 'id_paquete', c.id_paquete);
            const f = paquete && byId('fotografo', 'id_fotografo', paquete.id_fotografo);
            if (!e || !paquete || !f) return null;
            const deporte = db.nombre_deporte.find(d => eq(d.id_deporte, e.deporte));
            return {
                id_compra: c.id_compra,
                id_evento: e.id_evento,
                evento_nombre: e.nombre,
                lugar: e.lugar,
                deporte_nombre: deporte ? deporte.nombre : 'Sin deporte',
                fotografo_nombre: `${f.nombre} ${f.apellido}`,
                paquete_nombre: paquete.nombre,
                status: Number(c.entregado) ? 1 : 0
            };
        }).filter(Boolean);
    });

    route('GET', '/eventos/:id', ({ p }) => {
        const e = byId('evento', 'id_evento', p.id);
        return e ? eventoFields(e) : {};
    });

    route('GET', '/fotografos/evento/:id', ({ p }) => {
        const ids = new Set(db.fotografo_evento.filter(fe => eq(fe.id_evento, p.id)).map(fe => fe.id_fotografo));
        return db.fotografo
            .filter(f => ids.has(f.id_fotografo))
            .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`))
            .map(f => ({ id_fotografo: f.id_fotografo, nombre: f.nombre, apellido: f.apellido, correo: f.correo, telefono: f.telefono, foto: imgUrl(f.foto) }));
    });

    // Estadísticas del fotógrafo (stored procedures / functions in the SQL schema)
    route('GET', '/fotografo/:id/portafolio', ({ p }) =>
        db.foto_portafolio.filter(f => eq(f.id_fotografo, p.id)).map(f => ({ ...f, enlace: imgUrl(f.enlace) })));

    route('GET', '/fotografo/:id/ingresos_por_mes', ({ p }) => {
        const groups = new Map();
        comprasOfFotografo(p.id).forEach(c => {
            const anio = c.fecha ? Number(c.fecha.slice(0, 4)) : null;
            const mes = c.fecha ? Number(c.fecha.slice(5, 7)) : null;
            const key = `${anio}-${mes}`;
            const row = groups.get(key) || { anio, mes, total: 0 };
            row.total += precioOf(c);
            groups.set(key, row);
        });
        return [...groups.values()].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
    });

    route('GET', '/fotografo/:id/ingresos_por_evento', ({ p }) => {
        const groups = new Map();
        comprasOfFotografo(p.id).forEach(c => {
            const e = byId('evento', 'id_evento', c.id_evento);
            if (!e) return;
            const row = groups.get(e.id_evento) || { id_evento: e.id_evento, evento: e.nombre, clientes: new Set(), total: 0 };
            row.clientes.add(c.id_cliente);
            row.total += precioOf(c);
            groups.set(e.id_evento, row);
        });
        return [...groups.values()].map(r => ({ ...r, clientes: r.clientes.size }));
    });

    route('GET', '/fotografo/:id/ingresos_totales', ({ p }) =>
        ({ total: comprasOfFotografo(p.id).reduce((sum, c) => sum + precioOf(c), 0) }));

    route('GET', '/fotografo/:id/clientes_atendidos', ({ p }) =>
        ({ total: new Set(comprasOfFotografo(p.id).map(c => c.id_cliente)).size }));

    route('GET', '/fotografo/:id/eventos_cubiertos', ({ p }) => {
        const today = todayIso();
        return {
            total: db.fotografo_evento.filter(fe => {
                const e = byId('evento', 'id_evento', fe.id_evento);
                return eq(fe.id_fotografo, p.id) && e && e.fecha_ini < today;
            }).length
        };
    });

    route('GET', '/fotografo/:id/fotos_guardadas', ({ p }) =>
        ({ total: db.foto_entregada.filter(f => eq(f.id_fotografo, p.id)).length }));

    route('GET', '/fotografo/:id/eventos_inscritos', ({ p }) =>
        ({ total: db.fotografo_evento.filter(fe => eq(fe.id_fotografo, p.id)).length }));

    route('POST', '/inscribir', ({ body }) => {
        const { id_evento, id_fotografo } = body;
        if (!id_evento || !id_fotografo) fail(400, 'Faltan datos');
        const exists = db.fotografo_evento.some(fe => eq(fe.id_evento, id_evento) && eq(fe.id_fotografo, id_fotografo));
        if (exists) fail(500, 'Error al inscribir');
        db.fotografo_evento.push({ id_fotografo: Number(id_fotografo), id_evento: Number(id_evento) });
        persistOrFail();
        return { message: 'Inscripción realizada' };
    });

    // Compras
    route('POST', '/compra', ({ body }) => {
        const { id_paquete, id_cliente, id_evento, atleta, edad, categoria, rama, equipo, pruebas, metodo_pago } = body;
        if (!id_paquete || !id_cliente || !id_evento) fail(400, 'Faltan datos para crear la compra');
        const paquete = byId('paquete_fotografico', 'id_paquete', id_paquete);
        const inscrito = paquete && db.fotografo_evento.some(fe => eq(fe.id_fotografo, paquete.id_fotografo) && eq(fe.id_evento, id_evento));
        if (!inscrito) fail(400, 'El paquete no corresponde a un fotografo inscrito en el evento');
        const edadValue = edad === '' || edad == null ? null : Number(edad);
        const id = nextId('compra', 'id_compra');
        db.compra.push({
            id_compra: id,
            id_paquete: Number(id_paquete),
            id_cliente: Number(id_cliente),
            id_evento: Number(id_evento),
            fecha: todayIso(),
            entregado: 0,
            atleta: atleta || null,
            edad: Number.isFinite(edadValue) ? edadValue : null,
            categoria: categoria || null,
            rama: rama || null,
            equipo: equipo || null,
            pruebas: pruebas || null,
            metodo_pago: metodo_pago || 'tarjeta'
        });
        persistOrFail();
        return { message: 'Compra creada correctamente', id_compra: id };
    });

    route('GET', '/compra/:id', ({ p }) =>
        db.foto_entregada.filter(f => eq(f.id_compra, p.id)).map(f => ({ id: f.id_foto_entregada, url: imgUrl(f.enlace) })));

    route('DELETE', '/compra/:id', ({ p }) => {
        const idx = db.compra.findIndex(c => eq(c.id_compra, p.id));
        if (idx < 0) fail(404, 'No encontrado');
        db.compra.splice(idx, 1);
        db.foto_entregada.forEach(f => { if (eq(f.id_compra, p.id)) f.id_compra = null; });
        persistOrFail();
        return { message: 'Compra eliminada' };
    });

    // Fotos / archivos
    route('POST', '/upload', async ({ body }) => {
        const files = body.files || [];
        const { id_fotografo, tipo, id_compra } = body;
        if (files.length === 0) fail(400, 'No hay archivos');
        if (!id_fotografo) fail(400, 'Falta id_fotografo');
        if (tipo === 'entrega' && !id_compra) fail(400, 'Falta id_compra');

        const enlaces = await Promise.all(files.map(toDataUrl));
        const fecha = todayIso();

        if (tipo === 'perfil') {
            return { message: 'Foto de perfil subida correctamente', files: [enlaces[0]] };
        }

        if (tipo === 'entrega') {
            let id = nextId('foto_entregada', 'id_foto_entregada');
            const rows = enlaces.map(enlace => ({ id_foto_entregada: id++, fecha, enlace, id_compra: Number(id_compra), id_fotografo: Number(id_fotografo) }));
            db.foto_entregada.push(...rows);
            const compra = byId('compra', 'id_compra', id_compra);
            const previous = compra ? compra.entregado : null;
            if (compra) compra.entregado = 1;
            if (!save()) {
                db.foto_entregada = db.foto_entregada.filter(r => !rows.includes(r));
                if (compra) compra.entregado = previous;
                persistOrFail();
            }
            return { message: 'Fotos entregadas guardadas correctamente', files: enlaces };
        }

        let id = nextId('foto_portafolio', 'id_foto_portafolio');
        const rows = enlaces.map(enlace => ({ id_foto_portafolio: id++, id_fotografo: Number(id_fotografo), enlace }));
        db.foto_portafolio.push(...rows);
        if (!save()) {
            db.foto_portafolio = db.foto_portafolio.filter(r => !rows.includes(r));
            persistOrFail();
        }
        return { message: 'Fotos subidas correctamente', files: enlaces };
    });

    route('GET', '/fotos/:eventoId', ({ p }) => {
        const compras = new Set(db.compra.filter(c => eq(c.id_evento, p.eventoId)).map(c => c.id_compra));
        return db.foto_entregada
            .filter(f => compras.has(f.id_compra))
            .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id_foto_entregada - a.id_foto_entregada)
            .map(f => ({ id: f.id_foto_entregada, fecha: f.fecha, id_compra: f.id_compra, url: imgUrl(f.enlace) }));
    });

    route('GET', '/fotos', ({ query }) => {
        const fotografo = query.get('fotografo');
        return db.foto_portafolio
            .filter(f => !fotografo || eq(f.id_fotografo, fotografo))
            .map(f => ({ id: f.id_foto_portafolio, url: imgUrl(f.enlace) }));
    });

    route('DELETE', '/fotos/:id', ({ p }) => {
        const idx = db.foto_portafolio.findIndex(f => eq(f.id_foto_portafolio, p.id));
        if (idx < 0) fail(404, 'No encontrado');
        db.foto_portafolio.splice(idx, 1);
        persistOrFail();
        return { message: 'Archivo eliminado' };
    });

    // Paquetes
    route('GET', '/paquetes', ({ query }) => {
        const fotografo = query.get('fotografo');
        return db.paquete_fotografico.filter(p => !fotografo || eq(p.id_fotografo, fotografo));
    });

    route('GET', '/paquetes/:id', ({ p }) => byId('paquete_fotografico', 'id_paquete', p.id) || fail(404, 'Paquete no encontrado'));

    route('POST', '/paquetes', ({ body }) => {
        const { id_fotografo, nombre, precio, cobertura, descripcion } = body;
        if (!byId('fotografo', 'id_fotografo', id_fotografo)) fail(500, 'Error al crear paquete');
        db.paquete_fotografico.push({
            id_paquete: nextId('paquete_fotografico', 'id_paquete'),
            id_fotografo: Number(id_fotografo), nombre, precio: Number(precio) || 0, cobertura, descripcion
        });
        persistOrFail();
        return { message: 'Paquete creado' };
    });

    route('PUT', '/paquetes/:id', ({ p, body }) => {
        const paquete = byId('paquete_fotografico', 'id_paquete', p.id);
        if (!paquete || (body.id_fotografo && !eq(paquete.id_fotografo, body.id_fotografo))) fail(404, 'Paquete no encontrado');
        Object.assign(paquete, { nombre: body.nombre, precio: Number(body.precio) || 0, cobertura: body.cobertura, descripcion: body.descripcion });
        persistOrFail();
        return { message: 'Paquete actualizado' };
    });

    route('DELETE', '/paquetes/:id', ({ p }) => {
        const idx = db.paquete_fotografico.findIndex(x => eq(x.id_paquete, p.id));
        if (idx < 0) fail(404, 'No encontrado');
        db.paquete_fotografico.splice(idx, 1);
        db.compra.forEach(c => { if (eq(c.id_paquete, p.id)) c.id_paquete = null; });
        persistOrFail();
        return { message: 'Paquete eliminado' };
    });

    // Clientes
    route('GET', '/clientes/:fotografoId/:eventoId', ({ p }) => {
        const f = byId('fotografo', 'id_fotografo', p.fotografoId);
        const inscrito = db.fotografo_evento.some(fe => eq(fe.id_fotografo, p.fotografoId) && eq(fe.id_evento, p.eventoId));
        if (!f || !inscrito) return [];
        const paquetes = new Map(packagesOf(p.fotografoId).map(x => [x.id_paquete, x]));
        return db.compra
            .filter(c => paquetes.has(c.id_paquete) && eq(c.id_evento, p.eventoId))
            .map(c => {
                const cliente = byId('cliente', 'id_cliente', c.id_cliente);
                if (!cliente) return null;
                return {
                    id_compra: c.id_compra,
                    id: c.id_cliente,
                    id_evento: c.id_evento,
                    fecha: c.fecha,
                    entregado: Number(c.entregado) ? 1 : 0,
                    nombre: cliente.nombre,
                    apellido: cliente.apellido,
                    correo: cliente.correo,
                    paquete: paquetes.get(c.id_paquete).nombre,
                    fotografo: `${f.nombre} ${f.apellido}`,
                    atleta: c.atleta || null,
                    edad: c.edad ?? null,
                    rama: c.rama || null,
                    equipo: c.equipo || null,
                    categoria: c.categoria || 'No registrada',
                    pruebas: c.pruebas || 'No registradas'
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.entregado - b.entregado) || String(a.fecha).localeCompare(String(b.fecha)) || (a.id_compra - b.id_compra));
    });

    route('DELETE', '/clientes/:fotografoId/:eventoId/:clienteId', ({ p }) => {
        const paquetes = new Set(packagesOf(p.fotografoId).map(x => x.id_paquete));
        const before = db.compra.length;
        db.compra = db.compra.filter(c => !(paquetes.has(c.id_paquete) && eq(c.id_evento, p.eventoId) && eq(c.id_cliente, p.clienteId)));
        if (db.compra.length === before) fail(404, 'No encontrado');
        persistOrFail();
        return { message: 'Cliente eliminado del evento' };
    });

    route('GET', '/clientes', () => db.cliente.map(c => ({ id_cliente: c.id_cliente, nombre: c.nombre, apellido: c.apellido, correo: c.correo })));

    route('GET', '/cliente/:id', ({ p }) => {
        const c = byId('cliente', 'id_cliente', p.id);
        return c ? { id_cliente: c.id_cliente, nombre: c.nombre, apellido: c.apellido, correo: c.correo } : {};
    });

    // Fotógrafos
    route('GET', '/fotografos', () => db.fotografo.map(f => ({
        id_fotografo: f.id_fotografo, nombre: f.nombre, apellido: f.apellido, correo: f.correo, telefono: f.telefono, foto: imgUrl(f.foto)
    })));

    route('GET', '/fotografos/:id', ({ p }) => withoutPassword(byId('fotografo', 'id_fotografo', p.id)) || {});

    route('POST', '/fotografos', ({ body }) => {
        const id = nextId('fotografo', 'id_fotografo');
        db.fotografo.push({ id_fotografo: id, nombre: body.nombre, apellido: body.apellido, correo: body.correo, telefono: body.telefono || null, contrasena: body.password || null });
        persistOrFail();
        return { message: 'Fotógrafo creado', id };
    });

    route('PUT', '/fotografos/:id', ({ p, body }) => {
        const f = byId('fotografo', 'id_fotografo', p.id);
        if (!f) return { message: 'Fotógrafo actualizado' };
        Object.assign(f, {
            nombre: body.nombre,
            apellido: body.apellido,
            correo: body.correo,
            telefono: body.tel || body.telefono || null,
            especialidad: body.especial || body.especialidad || null,
            experiencia: body.expo || body.experiencia || null,
            sobre: body.sobre || null,
            foto: body.foto || null
        });
        persistOrFail();
        return { message: 'Fotógrafo actualizado' };
    });

    // ---------------------------------------------------------------------
    // Uploads: shrink images and keep them as data: URLs
    // ---------------------------------------------------------------------
    function readAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async function toDataUrl(file) {
        if (!/^image\/(jpeg|png|webp|bmp)$/.test(file.type) || typeof createImageBitmap !== 'function') {
            return readAsDataUrl(file);
        }
        try {
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            return readAsDataUrl(file);
        }
    }

    // ---------------------------------------------------------------------
    // fetch() interception
    // ---------------------------------------------------------------------
    function parseBody(body) {
        if (!body) return {};
        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            const out = { files: [] };
            body.forEach((value, key) => {
                if (typeof File !== 'undefined' && value instanceof File) out.files.push(value);
                else out[key] = value;
            });
            return out;
        }
        if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
        if (typeof body === 'string') {
            try { return JSON.parse(body); } catch (e) { return Object.fromEntries(new URLSearchParams(body).entries()); }
        }
        return {};
    }

    function match(method, pathname) {
        const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
        for (const r of routes) {
            if (r.method !== method || r.parts.length !== parts.length) continue;
            const p = {};
            const ok = r.parts.every((part, i) => {
                if (part.startsWith(':')) { p[part.slice(1)] = parts[i]; return true; }
                return part === parts[i];
            });
            if (ok) return { handler: r.handler, p };
        }
        return null;
    }

    function jsonResponse(status, data) {
        return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    }

    async function handle(url, init) {
        await loadDb();
        const method = (init.method || 'GET').toUpperCase();
        const found = match(method, url.pathname);
        if (!found) return jsonResponse(404, { message: `Cannot ${method} ${url.pathname}` });
        try {
            const data = await found.handler({ p: found.p, query: url.searchParams, body: parseBody(init.body) });
            return jsonResponse(200, clone(data));
        } catch (err) {
            if (err instanceof HttpError) return jsonResponse(err.status, { message: err.message });
            console.error('[PhotoSport demo]', err);
            return jsonResponse(500, { message: 'Error' });
        }
    }

    window.fetch = function (input, init) {
        const rawUrl = typeof input === 'string' ? input : (input && input.url) || String(input);
        let url;
        try { url = new URL(rawUrl, window.location.href); } catch (e) { return realFetch(input, init); }
        if (url.origin !== API_ORIGIN) return realFetch(input, init);
        const options = Object.assign({}, init || {});
        if (!options.method && input && typeof input === 'object' && input.method) options.method = input.method;
        return handle(url, options);
    };

    // ---------------------------------------------------------------------
    // Demo UI: banner + demo accounts on the login page
    // ---------------------------------------------------------------------
    const DEMO_ACCOUNTS = [
        { label: 'Cliente', icon: 'fa-user', email: 'lorena.tovar24@mail.com', password: 'cliente24123' },
        { label: 'Fotógrafo', icon: 'fa-camera', email: 'fotografo5@photosport.com', password: 'foto5secure' }
    ];

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ps-demo-banner { position: fixed; right: 12px; bottom: 12px; z-index: 9999;
                display: flex; gap: 10px; align-items: center; max-width: calc(100% - 24px); padding: 8px 14px;
                background: rgba(20, 24, 33, .92); color: #fff; border-radius: 999px; font: 13px/1.3 Arial, sans-serif;
                box-shadow: 0 4px 16px rgba(0,0,0,.25); }
            .ps-demo-banner button { background: transparent; color: #9fd3ff; border: 1px solid #9fd3ff; border-radius: 999px;
                padding: 3px 10px; font: inherit; cursor: pointer; }
            .ps-demo-accounts { margin: 18px auto 0; max-width: 360px; padding: 14px 16px; border-radius: 12px;
                background: rgba(255,255,255,.92); color: #1b2430; font: 14px/1.4 Arial, sans-serif; text-align: left;
                box-shadow: 0 4px 16px rgba(0,0,0,.15); }
            .ps-demo-accounts h4 { margin: 0 0 6px; font-size: 15px; }
            .ps-demo-accounts p { margin: 0 0 10px; font-size: 13px; color: #4a5564; }
            .ps-demo-accounts .ps-demo-row { display: flex; flex-wrap: wrap; gap: 8px; }
            .ps-demo-accounts button { flex: 1 1 140px; padding: 8px 10px; border: 0; border-radius: 8px; cursor: pointer;
                background: #1f6feb; color: #fff; font: 600 13px Arial, sans-serif; }
            .ps-demo-accounts a { display: inline-block; margin-top: 10px; font-size: 13px; color: #1f6feb; }
        `;
        document.head.appendChild(style);
    }

    function injectBanner() {
        const banner = document.createElement('div');
        banner.className = 'ps-demo-banner';
        banner.innerHTML = '<span>🧪 Demo en vivo · los datos se guardan solo en tu navegador</span><button type="button">Reiniciar demo</button>';
        banner.querySelector('button').addEventListener('click', () => {
            if (confirm('¿Borrar los cambios hechos en la demo y volver a los datos originales?')) resetDemo();
        });
        document.body.appendChild(banner);
    }

    function injectDemoAccounts() {
        const form = document.getElementById('logSession');
        if (!form) return;
        const box = document.createElement('div');
        box.className = 'ps-demo-accounts';
        box.innerHTML = `
            <h4>Cuentas de demostración</h4>
            <p>Entra con un clic para explorar cada rol.</p>
            <div class="ps-demo-row">
                ${DEMO_ACCOUNTS.map((a, i) => `<button type="button" data-i="${i}"><i class="fa-solid ${a.icon}"></i> Entrar como ${a.label}</button>`).join('')}
            </div>
            <a href="admin/home_admin.html">Ver panel de administrador (prototipo) →</a>
        `;
        box.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
            const account = DEMO_ACCOUNTS[Number(btn.dataset.i)];
            form.email.value = account.email;
            form.password.value = account.password;
            if (typeof form.requestSubmit === 'function') form.requestSubmit();
            else form.dispatchEvent(new Event('submit', { cancelable: true }));
        }));
        form.insertAdjacentElement('afterend', box);
    }

    function initUi() {
        injectStyles();
        injectBanner();
        injectDemoAccounts();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUi);
    else initUi();

    loadDb();
})();
