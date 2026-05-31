CREATE DATABASE IF NOT EXISTS PHOTOSPORT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE PHOTOSPORT;

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    contrasena VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS fotografo (
    id_fotografo INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    contrasena VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255),
    experiencia VARCHAR(100),
    sobre TEXT,
    foto VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS paquete_fotografico (
    id_paquete INT PRIMARY KEY AUTO_INCREMENT,
    id_fotografo INT NOT NULL,
    nombre VARCHAR(100),
    precio DECIMAL(10,2),
    cobertura VARCHAR(500),
    descripcion VARCHAR(1000),
    FOREIGN KEY (id_fotografo) REFERENCES fotografo(id_fotografo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evento (
    id_evento INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    deporte TINYINT,
    fecha_ini DATE,
    fecha_fin DATE,
    lugar VARCHAR(200),
    organizador VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS solicitud_evento (
    id_solicitud INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    deporte TINYINT,
    fecha_ini DATE,
    fecha_fin DATE,
    lugar VARCHAR(200),
    organizador VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS fotografo_evento (
    id_evento INT NOT NULL,
    id_fotografo INT NOT NULL,
    PRIMARY KEY (id_evento, id_fotografo),
    FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE,
    FOREIGN KEY (id_fotografo) REFERENCES fotografo(id_fotografo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compra (
    id_compra INT PRIMARY KEY AUTO_INCREMENT,
    id_paquete INT,
    id_cliente INT,
    id_evento INT,
    fecha DATE,
    entregado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_paquete) REFERENCES paquete_fotografico(id_paquete) ON DELETE SET NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS foto_entregada (
    id_foto_entregada INT PRIMARY KEY AUTO_INCREMENT,
    fecha DATE,
    enlace VARCHAR(1000),
    id_compra INT,
    id_fotografo INT,
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra) ON DELETE SET NULL,
    FOREIGN KEY (id_fotografo) REFERENCES fotografo(id_fotografo) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS foto_portafolio (
	id_foto_portafolio	INT PRIMARY KEY AUTO_INCREMENT,
    id_fotografo INT,
    enlace VARCHAR(1000),
    FOREIGN KEY (id_fotografo) REFERENCES fotografo(id_fotografo) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS nombre_deporte (
    id_deporte TINYINT PRIMARY KEY,
    nombre VARCHAR(100)
);
-- Para paginas del fotografo
DELIMITER $$
CREATE PROCEDURE eventos_por_fotografo (
	in_id_fotografo INT
) 
BEGIN 
	SELECT  e.id_evento,
			 e.nombre,
			 e.deporte,
			 e.fecha_ini,
			 e.fecha_fin,
			 e.lugar,
			 e.organizador
    FROM fotografo_evento fe
    JOIN evento e ON fe.id_evento = e.id_evento
    WHERE fe.id_fotografo = in_id_fotografo;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE eventos_no_inscritos_fotografo(
	in_id_fotografo INT
)
BEGIN
	SELECT  e.id_evento,
			 e.nombre,
			 e.deporte,
			 e.fecha_ini,
			 e.fecha_fin,
			 e.lugar,
			 e.organizador
    FROM evento e
    WHERE e.id_evento NOT IN (
		SELECT fe.id_evento 
        FROM fotografo_evento fe
        WHERE id_fotografo = in_id_fotografo
    ) AND e.fecha_fin >= CURDATE();
CREATE PROCEDURE clientes_por_evento(
	in_id_evento INT
)
BEGIN
	SELECT `cliente`.`id_cliente`,
    `cliente`.`nombre`,
    `cliente`.`apellido`,
    `cliente`.`correo`,
    `cliente`.`telefono`,
    `cliente`.`contrasena`
	FROM cliente cli
    JOIN compra com ON com.cliente_id = cli.cliente_id
    WHERE id_evento = in_id_evento;
END ;
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE foto_por_evento(
	in_id_evento INT
)
BEGIN
	SELECT fe.`id_foto_entregada`,
		fe.`fecha`,
		fe.`enlace`,
		fe.`id_compra`,
		fe.`id_fotografo`
	FROM foto_entregada fe;
	JOIN compra c ON fe.id_compra = c.id_compra
    WHERE c.id_evento = in_id_evento
	ORDER BY fe.fecha DESC, fe.id_foto_entregada DESC;
END ;
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE foto_por_compra(
	in_id_compra INT
)
BEGIN
	SELECT fe.`id_foto_entregada`,
		fe.`fecha`,
		fe.`enlace`,
		fe.`id_compra`,
		fe.`id_fotografo`
	FROM foto_entregada fe
	JOIN compra c ON fe.id_compra = c.id_compra
    WHERE c.id_compra = in_id_compra;
END $$
DELIMITER ;


DELIMITER $$
CREATE PROCEDURE ingresos_por_mes(
	in_id_fotografo INT
)
BEGIN
	SELECT YEAR(c.fecha) AS anio,
	       MONTH(c.fecha) AS mes,
	       SUM(p.precio) AS total
    FROM compra c
    JOIN paquete_fotografico p USING(id_paquete)
    WHERE p.id_fotografo = in_id_fotografo
    GROUP BY YEAR(c.fecha), MONTH(c.fecha)
    ORDER BY YEAR(c.fecha), MONTH(c.fecha);
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE ingresos_por_evento(
	in_id_fotografo INT
)
BEGIN
	SELECT c.id_evento AS id_evento,
	       e.nombre AS evento,
	       COUNT(DISTINCT c.id_cliente) AS clientes,
	       SUM(p.precio) AS total
	FROM compra c
	JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
	JOIN evento e ON c.id_evento = e.id_evento
	WHERE p.id_fotografo = in_id_fotografo
	GROUP BY c.id_evento, e.nombre;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE portafolio_por_fotografo(
	in_id_fotografo INT
)
BEGIN
	SELECT *
    FROM foto_portafolio 
    WHERE id_fotografo = in_id_fotografo;
END $$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION ingresos_totales (
	 in_id_fotografo INT
)
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
    SELECT COALESCE(SUM(p.precio), 0) INTO total
    FROM compra c
    JOIN paquete_fotografico p USING(id_paquete)
    WHERE p.id_fotografo = in_id_fotografo;
	RETURN total;
END $$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION clientes_atendidos (
	 in_id_fotografo INT
)
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
    SELECT COUNT(DISTINCT c.id_cliente) INTO total
    FROM compra c
    JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
    WHERE p.id_fotografo = in_id_fotografo;
	RETURN total;
END $$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION eventos_cubiertos (
	 in_id_fotografo INT
)
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
    SELECT COUNT(*) INTO total
    FROM fotografo_evento
    JOIN evento e 
    ON e.id_evento = fotografo_evento.id_evento
    WHERE fotografo_evento.id_fotografo = in_id_fotografo
    AND e.fecha_ini < NOW();
	RETURN total;
END $$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION total_fotos_guardadas (
	 in_id_fotografo INT
)
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
    SELECT COUNT(*) INTO total
    FROM foto_entregada
    WHERE id_fotografo = in_id_fotografo;
	RETURN total;
END $$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION eventos_inscritos (
	in_id_fotografo INT
) 
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
	SELECT COUNT(*) INTO total
    FROM fotografo_evento
    WHERE id_fotografo = in_id_fotografo;
    RETURN total;
END $$
DELIMITER;

DELIMITER $$
CREATE FUNCTION clientes_registrados (
	in_id_fotografo INT
) 
RETURNS INT
READS SQL DATA
BEGIN
	DECLARE total INT DEFAULT 0;
	SELECT COUNT(*) INTO total
    FROM fotografo_evento
    WHERE id_fotografo = in_id_fotografo;
    RETURN total;
END $$
DELIMITER;

-- Para paginas del cliente
DELIMITER $$
CREATE PROCEDURE eventos_por_cliente(
	in_id_cliente INT
)
BEGIN
	SELECT 
		c.id_compra,
		e.id_evento,
		e.nombre AS evento_nombre,
		e.lugar,
		COALESCE(d.nombre, 'Sin deporte') AS deporte_nombre,
		CONCAT(f.nombre, ' ', f.apellido) AS fotografo_nombre,
		p.nombre AS paquete_nombre,
		c.entregado AS status
	FROM compra c
	JOIN evento e ON c.id_evento = e.id_evento
	JOIN paquete_fotografico p ON c.id_paquete = p.id_paquete
	JOIN fotografo f ON p.id_fotografo = f.id_fotografo
	LEFT JOIN nombre_deporte d ON e.deporte = d.id_deporte
	WHERE c.id_cliente = in_id_cliente;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE eventos_no_inscritos_cliente(
	in_id_cliente INT
)
BEGIN
	SELECT  e.id_evento,
			 e.nombre,
			 e.deporte,
			 e.fecha_ini,
			 e.fecha_fin,
			 e.lugar,
			 e.organizador
    FROM evento e
    WHERE e.id_evento NOT IN (
		SELECT DISTINCT id_evento
        FROM compra
        WHERE id_cliente = in_id_cliente
    ) AND e.fecha_fin >= CURDATE();
END $$
DELIMITER ;
