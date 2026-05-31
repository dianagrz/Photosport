const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../../')));

const conexion = mysql.createConnection({
    host: "localhost",
    database: "PHOTOSPORT",
    user: "root",
    password: ""
});

const compraDetailColumns = {
    atleta: 'VARCHAR(200)',
    edad: 'INT',
    categoria: 'VARCHAR(100)',
    rama: 'VARCHAR(50)',
    equipo: 'VARCHAR(150)',
    pruebas: 'VARCHAR(500)',
    metodo_pago: 'VARCHAR(100)'
};

function ensureCompraDetailColumns() {
    conexion.query('SHOW COLUMNS FROM compra', (err, rows) => {
        if (err) {
            console.error('No se pudieron revisar columnas de compra:', err.message || err);
            return;
        }

        const existingColumns = new Set(rows.map(row => row.Field));
        Object.entries(compraDetailColumns).forEach(([column, type]) => {
            if (existingColumns.has(column)) return;

            conexion.query(`ALTER TABLE compra ADD COLUMN ${column} ${type}`, (alterErr) => {
                if (alterErr) {
                    console.error(`No se pudo agregar compra.${column}:`, alterErr.message || alterErr);
                }
            });
        });
    });
}

conexion.connect(err => {
    if (err) throw err;
    console.log("Conectado a MySQL (PHOTOSPORT)");
    ensureCompraDetailColumns();
});

// Register (cliente or fotografo)
app.post('/registro', (req, res) => {
    const { nombre, apellido, correo, telefono, password, tipo } = req.body;
    if (!nombre || !apellido || !correo || !password || !tipo) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const checkQuery = `SELECT correo FROM cliente WHERE correo = ? UNION SELECT correo FROM fotografo WHERE correo = ?`;
    conexion.query(checkQuery, [correo, correo], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error en la base de datos' });
        if (rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

        if (tipo === 'cliente') {
            const q = 'INSERT INTO cliente (nombre, apellido, correo, telefono, contrasena) VALUES (?,?,?,?,?)';
            conexion.query(q, [nombre, apellido, correo, telefono || null, password], (err2, result) => {
                if (err2) return res.status(500).json({ message: 'Error al crear cliente' });
                res.json({ message: 'Cliente registrado correctamente', tipo: 'cliente', id: result.insertId });
            });
        } else if (tipo === 'fotografo') {
            const q = 'INSERT INTO fotografo (nombre, apellido, correo, telefono, contrasena) VALUES (?,?,?,?,?)';
            conexion.query(q, [nombre, apellido, correo, telefono || null, password], (err2, result) => {
                if (err2) return res.status(500).json({ message: 'Error al crear fotógrafo' });
                res.json({ message: 'Fotógrafo registrado correctamente', tipo: 'fotografo', id: result.insertId });
            });
        } else {
            res.status(400).json({ message: 'Tipo de usuario inválido' });
        }
    });
});

// Login: check both tables
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales' });

    const q = `SELECT id_cliente AS id, 'cliente' AS tipo FROM cliente WHERE correo = ? AND contrasena = ? UNION SELECT id_fotografo AS id, 'fotografo' AS tipo FROM fotografo WHERE correo = ? AND contrasena = ?`;
    conexion.query(q, [email, password, email, password], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error en la base de datos' });
        if (results.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });
        res.json({ id: results[0].id, tipo: results[0].tipo });
    });
});

// Eventos
app.get('/eventos', (req, res) => {
    conexion.query('SELECT * FROM evento', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.post('/eventos', (req, res) => {
    const { nombre, deporte, fecha_ini, fecha_fin, lugar, organizador } = req.body;
    if (!nombre || !fecha_ini || !lugar || !organizador) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }
    const q = 'INSERT INTO evento (nombre, deporte, fecha_ini, fecha_fin, lugar, organizador) VALUES (?,?,?,?,?,?)';
    conexion.query(q, [nombre, deporte || null, fecha_ini, fecha_fin || null, lugar, organizador], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al crear evento' });
        res.json({ message: 'Evento creado correctamente', id_evento: result.insertId });
    });
});

function mapDeporteValue(deporte) {
    if (deporte == null) return null;
    if (typeof deporte === 'number') return deporte;
    const normalized = String(deporte).trim().toLowerCase();
    const map = {
        'natación': 0,
        'natacion': 0,
        'atletismo': 1,
        'triatlón': 2,
        'triatlon': 2
    };
    return map[normalized] ?? null;
}

app.post('/solicitud_evento', (req, res) => {
    const { nombre, deporte, fromFecha, toFecha, lugar, organizador } = req.body;
    if (!nombre || !fromFecha || !lugar || !organizador) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }
    const deporteValue = mapDeporteValue(deporte);
    const q = 'INSERT INTO solicitud_evento (nombre, deporte, fecha_ini, fecha_fin, lugar, organizador) VALUES (?,?,?,?,?,?)';
    conexion.query(q, [nombre, deporteValue, fromFecha, toFecha || null, lugar, organizador], (err, result) => {
        if (err) {
            console.error('Solicitud evento error:', err.message || err);
            return res.status(500).json({ message: 'Error al crear solicitud de evento' });
        }
        res.json({ message: 'Solicitud de evento enviada correctamente', id_solicitud: result.insertId });
    });
});

app.get('/eventos/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('SELECT * FROM evento WHERE id_evento = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || {});
    });
});

app.get('/eventos/fotografo/:fotografoId', (req, res) => {
    const id = req.params.fotografoId;
    const q = `CALL eventos_por_fotografo(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/eventos/no-inscritos/:fotografoId', (req, res) => {
    const id = req.params.fotografoId;
    const q = `CALL eventos_no_inscritos_fotografo(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/eventos/no-inscritos-cliente/:clienteId', (req, res) => {
    const id = req.params.clienteId;
    const q = `CALL eventos_no_inscritos_cliente(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/eventos/cliente/:clienteId', (req, res) => {
    const id = req.params.clienteId;
    const q = `CALL eventos_por_cliente(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/fotografos/evento/:eventoId', (req, res) => {
    const id = req.params.eventoId;
    const q = `SELECT f.id_fotografo,
                      f.nombre,
                      f.apellido,
                      f.correo,
                      f.telefono,
                      f.foto
               FROM fotografo_evento fe
               JOIN fotografo f ON fe.id_fotografo = f.id_fotografo
               WHERE fe.id_evento = ?
               ORDER BY f.nombre, f.apellido`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.get('/fotografo/:id/portafolio', (req, res) => {
    const id = req.params.id;
    const q = `CALL portafolio_por_fotografo(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/fotografo/:id/ingresos_por_mes', (req, res) => {
    const id = req.params.id;
    const q = `SELECT YEAR(c.fecha) AS anio,
                       MONTH(c.fecha) AS mes,
                       SUM(p.precio) AS total
                FROM compra c
                JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
                WHERE p.id_fotografo = ?
                GROUP BY YEAR(c.fecha), MONTH(c.fecha)
                ORDER BY YEAR(c.fecha), MONTH(c.fecha)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) {
            console.error('ingresos_por_mes direct query error:', err.message);
            // If the 'fecha' column does not exist in compra, try fallback using foto_entregada.fecha
            if (err.message && err.message.includes("Unknown column 'c.fecha'")) {
                const q2 = `SELECT YEAR(f.fecha) AS anio,
                                   MONTH(f.fecha) AS mes,
                                   SUM(p.precio) AS total
                            FROM compra c
                            JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
                            JOIN foto_entregada f ON f.id_compra = c.id_compra
                            WHERE p.id_fotografo = ?
                            GROUP BY YEAR(f.fecha), MONTH(f.fecha)
                            ORDER BY YEAR(f.fecha), MONTH(f.fecha)`;
                return conexion.query(q2, [id], (err2, rows2) => {
                    if (err2) {
                        console.error('ingresos_por_mes fallback error:', err2);
                        return res.status(500).json({ message: err2.message });
                    }
                    return res.json(rows2 || []);
                });
            }
            return res.status(500).json({ message: err.message });
        }
        res.json(rows || []);
    });
});

app.get('/fotografo/:id/ingresos_por_evento', (req, res) => {
    const id = req.params.id;
    const q = `CALL ingresos_por_evento(?)`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
        res.json(data);
    });
});

app.get('/fotografo/:id/ingresos_totales', (req, res) => {
    const id = req.params.id;
    const q = `SELECT COALESCE(SUM(p.precio), 0) AS total
               FROM compra c
               JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
               WHERE p.id_fotografo = ?`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || { total: 0 });
    });
});

app.get('/fotografo/:id/clientes_atendidos', (req, res) => {
    const id = req.params.id;
    const q = `SELECT COUNT(DISTINCT c.id_cliente) AS total FROM compra c JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete WHERE p.id_fotografo = ?`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || { total: 0 });
    });
});

app.get('/fotografo/:id/eventos_cubiertos', (req, res) => {
    const id = req.params.id;
    const q = `SELECT COUNT(*) AS total
               FROM fotografo_evento fe
               JOIN evento e ON e.id_evento = fe.id_evento
               WHERE fe.id_fotografo = ?
               AND e.fecha_ini < CURDATE()`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || { total: 0 });
    });
});

app.get('/fotografo/:id/fotos_guardadas', (req, res) => {
    const id = req.params.id;
    const q = `SELECT COUNT(*) AS total
               FROM foto_entregada
               WHERE id_fotografo = ?`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || { total: 0 });
    });
});

app.get('/fotografo/:id/eventos_inscritos', (req, res) => {
    const id = req.params.id;
    const q = `SELECT COUNT(*) AS total
               FROM fotografo_evento
               WHERE id_fotografo = ?`;
    conexion.query(q, [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || { total: 0 });
    });
});

// Inscribir fotografo a evento
app.post('/inscribir', (req, res) => {
    const { id_evento, id_fotografo } = req.body;
    if (!id_evento || !id_fotografo) return res.status(400).json({ message: 'Faltan datos' });
    const q = 'INSERT INTO fotografo_evento (id_evento, id_fotografo) VALUES (?,?)';
    conexion.query(q, [id_evento, id_fotografo], (err) => {
        if (err) return res.status(500).json({ message: 'Error al inscribir' });
        res.json({ message: 'Inscripción realizada' });
    });
});

// Compras (contratar paquete)
app.post('/compra', (req, res) => {
    const {
        id_paquete,
        id_cliente,
        id_evento,
        atleta,
        edad,
        categoria,
        rama,
        equipo,
        pruebas,
        metodo_pago
    } = req.body;

    if (!id_paquete || !id_cliente || !id_evento) {
        return res.status(400).json({ message: 'Faltan datos para crear la compra' });
    }

    const edadValue = edad === '' || edad == null ? null : Number(edad);
    const normalizedEdad = Number.isFinite(edadValue) ? edadValue : null;
    const q = `INSERT INTO compra (
                    id_paquete,
                    id_cliente,
                    id_evento,
                    fecha,
                    entregado,
                    atleta,
                    edad,
                    categoria,
                    rama,
                    equipo,
                    pruebas,
                    metodo_pago
                )
                SELECT p.id_paquete, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?
                FROM paquete_fotografico p
                JOIN fotografo_evento fe
                     ON fe.id_fotografo = p.id_fotografo
                    AND fe.id_evento = ?
                WHERE p.id_paquete = ?`;

    conexion.query(q, [
        id_cliente,
        id_evento,
        false,
        atleta || null,
        normalizedEdad,
        categoria || null,
        rama || null,
        equipo || null,
        pruebas || null,
        metodo_pago || 'tarjeta',
        id_evento,
        id_paquete
    ], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al crear compra' });
        if (!result || result.affectedRows === 0) {
            return res.status(400).json({ message: 'El paquete no corresponde a un fotografo inscrito en el evento' });
        }
        res.json({ message: 'Compra creada correctamente', id_compra: result.insertId });
    });
});

// Fotos / archivos
const multer = require('multer');
const fs = require('fs');
const uploadDir = path.join(__dirname, '../../Uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random()*1E9);
        cb(null, unique + '-' + file.originalname);
    }
});
const upload = multer({ storage });
app.use('/Uploads', express.static(uploadDir));

app.post('/upload', upload.array('fotos', 50), (req, res) => {
    const files = req.files || [];
    const evento_id = req.body.evento_id || null;
    const id_fotografo = req.body.id_fotografo || null;
    const tipo = req.body.tipo || null;

    if (files.length === 0) return res.status(400).json({ message: 'No hay archivos' });
    if (!id_fotografo) return res.status(400).json({ message: 'Falta id_fotografo' });

    const fecha = new Date();
    const fileData = files.map(f => ({
        fecha,
        enlace: path.relative(path.join(__dirname, '../../'), f.path).replace(/\\/g, '/'),
        id_fotografo
    }));

    if (tipo === 'perfil') {
        // Replace existing profile photo for this photographer
        const file = fileData[0];
        conexion.query('DELETE FROM foto_perfil WHERE id_fotografo = ?', [id_fotografo], (deleteErr) => {
            if (deleteErr) {
                console.error('Upload delete foto_perfil error:', deleteErr);
                return res.status(500).json({ message: 'Error al guardar foto de perfil' });
            }
            const sql = 'INSERT INTO foto_perfil (fecha, enlace, id_fotografo) VALUES (?,?,?)';
            conexion.query(sql, [file.fecha, file.enlace, id_fotografo], (err) => {
                if (err) {
                    console.error('Upload DB error foto_perfil:', err);
                    return res.status(500).json({ message: 'Error al guardar foto de perfil' });
                }
                res.json({ message: 'Foto de perfil subida correctamente', files: ['/' + file.enlace] });
            });
        });
        return;
    }

    if (tipo === 'entrega') {
        const id_compra = req.body.id_compra || null;
        if (!id_compra) return res.status(400).json({ message: 'Falta id_compra' });

        const inserts = fileData.map(f => [f.fecha, f.enlace, id_compra, f.id_fotografo]);
        const sql = 'INSERT INTO foto_entregada (fecha, enlace, id_compra, id_fotografo) VALUES ?';
        conexion.query(sql, [inserts], (err) => {
            if (err) {
                console.error('Upload DB error foto_entregada:', err);
                return res.status(500).json({ message: 'Error al guardar fotos entregadas' });
            }
            conexion.query('UPDATE compra SET entregado = 1 WHERE id_compra = ?', [id_compra], (updateErr) => {
                if (updateErr) {
                    console.error('Upload update compra error:', updateErr);
                    return res.status(500).json({ message: 'Fotos guardadas, pero no se pudo actualizar la compra' });
                }
                const fileUrls = inserts.map(i => '/' + i[1]);
                res.json({ message: 'Fotos entregadas guardadas correctamente', files: fileUrls });
            });
        });
        return;
    }

    const inserts = fileData.map(f => [f.id_fotografo, f.enlace]);
    const sql = 'INSERT INTO foto_portafolio (id_fotografo, enlace) VALUES ?';
    conexion.query(sql, [inserts], (err) => {
        if (err) {
            console.error('Upload DB error foto_portafolio:', err);
            return res.status(500).json({ message: 'Error al guardar fotos de portafolio' });
        }
        const fileUrls = inserts.map(i => '/' + i[1]);
        res.json({ message: 'Fotos subidas correctamente', files: fileUrls });
    });
});

app.get('/fotos/:eventoId', (req, res) => {
    const eventoId = req.params.eventoId;
    const q = `CALL foto_por_evento(?)`;
    conexion.query(q, [eventoId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows.map(r => ({ id: r.id, fecha: r.fecha, id_compra: r.id_compra, url: '/' + r.enlace }))); 
    });
});

app.get('/fotos', (req, res) => {
    const { fotografo } = req.query;
    let q = 'SELECT * FROM foto_portafolio';
    const params = [];
    if (fotografo) {
        q += ' WHERE id_fotografo = ?';
        params.push(fotografo);
    }
    conexion.query(q, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows.map(r => ({ id: r.id_foto_portafolio, url: '/' + r.enlace })));
    });
});

app.delete('/fotos/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('SELECT enlace FROM foto_portafolio WHERE id_foto_portafolio = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        if (!rows[0]) return res.status(404).json({ message: 'No encontrado' });
        const enlace = path.join(__dirname, '../../', rows[0].enlace);
        fs.unlink(enlace, () => {
            conexion.query('DELETE FROM foto_portafolio WHERE id_foto_portafolio = ?', [id], (err2) => {
                if (err2) return res.status(500).json({ message: 'Error al eliminar' });
                res.json({ message: 'Archivo eliminado' });
            });
        });
    });
});

// Paquetes
app.get('/paquetes', (req, res) => {
    const fotografo = req.query.fotografo;
    let q = 'SELECT * FROM paquete_fotografico';
    const params = [];
    if (fotografo) {
        q += ' WHERE id_fotografo = ?';
        params.push(fotografo);
    }
    conexion.query(q, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.get('/paquetes/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('SELECT * FROM paquete_fotografico WHERE id_paquete = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        if (!rows[0]) return res.status(404).json({ message: 'Paquete no encontrado' });
        res.json(rows[0]);
    });
});

app.post('/paquetes', (req, res) => {
    const { id_fotografo, nombre, precio, cobertura, descripcion } = req.body;
    const q = 'INSERT INTO paquete_fotografico (id_fotografo, nombre, precio, cobertura, descripcion) VALUES (?,?,?,?,?)';
    conexion.query(q, [id_fotografo, nombre, precio, cobertura, descripcion], (err) => {
        if (err) return res.status(500).json({ message: 'Error al crear paquete' });
        res.json({ message: 'Paquete creado' });
    });
});

app.put('/paquetes/:id', (req, res) => {
    const id = req.params.id;
    const { id_fotografo, nombre, precio, cobertura, descripcion } = req.body;
    let q = 'UPDATE paquete_fotografico SET nombre = ?, precio = ?, cobertura = ?, descripcion = ? WHERE id_paquete = ?';
    const values = [nombre, precio, cobertura, descripcion, id];

    if (id_fotografo) {
        q += ' AND id_fotografo = ?';
        values.push(id_fotografo);
    }

    conexion.query(q, values, (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al actualizar paquete' });
        if (!result || result.affectedRows === 0) return res.status(404).json({ message: 'Paquete no encontrado' });
        res.json({ message: 'Paquete actualizado' });
    });
});

app.delete('/paquetes/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('DELETE FROM paquete_fotografico WHERE id_paquete = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar' });
        if (result.affectedRows > 0) res.json({ message: 'Paquete eliminado' }); else res.status(404).json({ message: 'No encontrado' });
    });
});

// Clientes por evento (compras)
app.get('/clientes/:fotografoId/:eventoId', (req, res) => {
    const fotografoId = req.params.fotografoId;
    const eventoId = req.params.eventoId;
    const q = `SELECT ca.id_compra,
                      ca.id_cliente AS id,
                      ca.id_evento,
                      ca.fecha,
                      ca.entregado,
                      c.nombre,
                      c.apellido,
                      c.correo,
                      p.nombre AS paquete,
                      CONCAT(f.nombre, ' ', f.apellido) AS fotografo,
                      ca.atleta,
                      ca.edad,
                      ca.rama,
                      ca.equipo,
                      COALESCE(ca.categoria, 'No registrada') AS categoria,
                      COALESCE(ca.pruebas, 'No registradas') AS pruebas
               FROM compra ca
               JOIN cliente c ON c.id_cliente = ca.id_cliente
               JOIN paquete_fotografico p ON ca.id_paquete = p.id_paquete
               JOIN fotografo f ON p.id_fotografo = f.id_fotografo
               JOIN fotografo_evento fe
                    ON fe.id_evento = ca.id_evento
                   AND fe.id_fotografo = p.id_fotografo
               WHERE p.id_fotografo = ? AND ca.id_evento = ?
               ORDER BY ca.entregado ASC,
                        ca.fecha ASC,
                        ca.id_compra ASC`;
    conexion.query(q, [fotografoId, eventoId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.delete('/clientes/:fotografoId/:eventoId/:clienteId', (req, res) => {
    const { fotografoId, eventoId, clienteId } = req.params;
    const q = 'DELETE FROM compra WHERE id_fotografo = ? AND id_evento = ? AND id_cliente = ?';
    conexion.query(q, [fotografoId, eventoId, clienteId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar' });
        if (result.affectedRows > 0) {
            res.json({ message: 'Cliente eliminado del evento' });
        } else {
            res.status(404).json({ message: 'No encontrado' });
        }
    });
});

app.get('/compra/:id', (req, res) => {
    const compraId = req.params.id;
    const q = `CALL foto_por_compra(?)`;
    conexion.query(q, [compraId], (err, rows) => {
        if (err) {
            console.error('foto_por_compra error:', err.message || err);
            return res.status(500).json({ message: 'Error' });
        }
        // Stored procedures return an array with result sets. Normalize to a flat array
        const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : (Array.isArray(rows) ? rows : []);
        // Map possible column names to a consistent `{ id, url }` shape expected by client
        const mapped = (data || []).map(r => ({
            id: r.id_foto_entregada || r.id || r.id_foto_portafolio || null,
            url: '/' + (r.enlace || r.path || r.url || '').replace(/^\//, '')
        }));
        res.json(mapped);
    });
});

app.delete('/compra/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('DELETE FROM compra WHERE id_compra = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al eliminar' });
        if (result.affectedRows > 0) res.json({ message: 'Compra eliminada' }); else res.status(404).json({ message: 'No encontrado' });
    });
});


// Example list endpoints (optional)
app.get('/clientes', (req, res) => {
    conexion.query('SELECT id_cliente, nombre, apellido, correo FROM cliente', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.get('/cliente/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('SELECT id_cliente, nombre, apellido, correo FROM cliente WHERE id_cliente = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || {});
    });
});

app.get('/fotografos', (req, res) => {
    conexion.query('SELECT id_fotografo, nombre, apellido, correo, telefono, foto FROM fotografo', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows);
    });
});

app.get('/fotografos/:id', (req, res) => {
    const id = req.params.id;
    conexion.query('SELECT * FROM fotografo WHERE id_fotografo = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(rows[0] || {});
    });
});

app.post('/fotografos', (req, res) => {
    const { nombre, apellido, correo, telefono, password } = req.body;
    const q = 'INSERT INTO fotografo (nombre, apellido, correo, telefono, contrasena) VALUES (?,?,?,?,?)';
    conexion.query(q, [nombre, apellido, correo, telefono || null, password || null], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al crear fotografo' });
        res.json({ message: 'Fotógrafo creado', id: result.insertId });
    });
});

app.put('/fotografos/:id', (req, res) => {
    const id = req.params.id;
    const {
        nombre,
        apellido,
        correo,
        tel,
        telefono,
        especial,
        especialidad,
        expo,
        experiencia,
        sobre,
        foto
    } = req.body;
    const q = `UPDATE fotografo
               SET nombre = ?,
                   apellido = ?,
                   correo = ?,
                   telefono = ?,
                   especialidad = ?,
                   experiencia = ?,
                   sobre = ?,
                   foto = ?
               WHERE id_fotografo = ?`;
    conexion.query(q, [
        nombre,
        apellido,
        correo,
        tel || telefono || null,
        especial || especialidad || null,
        expo || experiencia || null,
        sobre || null,
        foto || null,
        id
    ], (err) => {
        if (err) return res.status(500).json({ message: 'Error al actualizar' });
        res.json({ message: 'Fotógrafo actualizado' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});
