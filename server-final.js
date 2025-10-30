const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuración de la base de datos Railway
const dbConfig = {
    host: 'interchange.proxy.rlwy.net',
    port: 55821,
    user: 'root',
    password: 'jrYHjccWYOFydWBzKpvPlGJQnnqTNjpF',
    database: 'railway',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    ssl: {
        rejectUnauthorized: false
    }
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Códigos de técnico válidos
const TECH_CODES = {
    'TECH_001': { nombre: 'Técnico Principal', email: 'tech001@lasgemelas.com', activo: true },
    'TECH_002': { nombre: 'Técnico Secundario', email: 'tech002@lasgemelas.com', activo: true },
    'TECH_ADMIN': { nombre: 'Administrador', email: 'admin@lasgemelas.com', activo: true },
    'T20137912': { nombre: 'Técnico Interno', email: 'interno@lasgemelas.com', activo: true }
};

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        console.log('🔄 Inicializando base de datos...');
        const connection = await pool.getConnection();
        
        // Crear tabla de usuarios si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(10) NOT NULL UNIQUE,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                correo VARCHAR(150) NOT NULL UNIQUE,
                contrasena VARCHAR(255) NOT NULL,
                telefono VARCHAR(30),
                direccion VARCHAR(255),
                rol ENUM('cliente', 'admin') DEFAULT 'cliente',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crear tabla de productos/disfraces si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                descripcion TEXT,
                precio_compra DECIMAL(10,2),
                precio_alquiler DECIMAL(10,2),
                categoria VARCHAR(50),
                talla VARCHAR(20),
                color VARCHAR(30),
                disponible_compra BOOLEAN DEFAULT TRUE,
                disponible_alquiler BOOLEAN DEFAULT TRUE,
                stock_compra INT DEFAULT 0,
                stock_alquiler INT DEFAULT 0,
                imagen VARCHAR(255),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crear tabla de compras
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS compras (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL DEFAULT 1,
                precio_unitario DECIMAL(10,2) NOT NULL,
                precio_total DECIMAL(10,2) NOT NULL,
                estado ENUM('pendiente', 'confirmada', 'enviada', 'entregada', 'cancelada') DEFAULT 'pendiente',
                metodo_pago VARCHAR(50),
                direccion_envio TEXT,
                fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_entrega DATE,
                notas TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
            )
        `);
        
        // Crear tabla de alquileres
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS alquileres (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL DEFAULT 1,
                precio_unitario DECIMAL(10,2) NOT NULL,
                precio_total DECIMAL(10,2) NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                dias_alquiler INT NOT NULL,
                estado ENUM('reservado', 'activo', 'devuelto', 'vencido', 'cancelado') DEFAULT 'reservado',
                metodo_pago VARCHAR(50),
                direccion_entrega TEXT,
                fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deposito DECIMAL(10,2) DEFAULT 0,
                notas TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
            )
        `);
        
        connection.release();
        console.log('✅ Base de datos inicializada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
        return false;
    }
}

// Middleware para verificar código de técnico
const verifyTechCode = (req, res, next) => {
    const techCode = req.headers['x-tech-code'] || req.headers['techcode'] || req.query.techCode;
    
    if (!techCode) {
        return res.status(401).json({ error: 'Código de técnico requerido' });
    }
    
    if (!TECH_CODES[techCode] || !TECH_CODES[techCode].activo) {
        return res.status(401).json({ error: 'Código de técnico inválido' });
    }
    
    req.techCode = techCode;
    req.techInfo = TECH_CODES[techCode];
    next();
};

// ===== RUTAS DE REGISTRO =====

// Registro principal
app.post('/api/registro', async (req, res) => {
    try {
        console.log('📝 REGISTRO - Datos recibidos:', JSON.stringify(req.body, null, 2));
        
        const { codigo, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        
        // Validar campos requeridos
        if (!codigo || !nombre || !apellido || !correo || !contrasena) {
            return res.status(400).json({ 
                error: 'Código, nombre, apellido, correo y contraseña son requeridos' 
            });
        }
        
        // Validar formato del código
        if (!codigo.startsWith('U')) {
            return res.status(400).json({ error: 'El código debe comenzar con "U"' });
        }
        
        const connection = await pool.getConnection();
        
        // Verificar si el código ya existe
        const [existingCode] = await connection.execute('SELECT id FROM usuarios WHERE codigo = ?', [codigo]);
        if (existingCode.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El código ya está registrado' });
        }
        
        // Verificar si el correo ya existe
        const [existingEmail] = await connection.execute('SELECT id FROM usuarios WHERE correo = ?', [correo]);
        if (existingEmail.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        
        // Insertar usuario
        const [result] = await connection.execute(
            'INSERT INTO usuarios (codigo, nombre, apellido, correo, contrasena, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo, nombre, apellido, correo, hashedPassword, telefono || null, direccion || null, 'cliente']
        );
        
        connection.release();
        
        console.log('✅ Usuario registrado con ID:', result.insertId);
        
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            userId: result.insertId,
            codigo: codigo
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE TÉCNICOS =====

// Obtener usuarios (para técnicos)
app.get('/api/usuarios-tech', verifyTechCode, async (req, res) => {
    try {
        console.log('👥 TÉCNICOS - Obteniendo usuarios');
        
        const connection = await pool.getConnection();
        
        // Obtener todos los usuarios (sin contraseñas)
        const [usuarios] = await connection.execute(`
            SELECT id, codigo, nombre, apellido, correo, telefono, direccion, rol, fecha_registro 
            FROM usuarios 
            ORDER BY fecha_registro DESC 
            LIMIT 50
        `);
        
        // Obtener estadísticas
        const [totalCount] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
        const [todayCount] = await connection.execute(`
            SELECT COUNT(*) as total FROM usuarios 
            WHERE DATE(fecha_registro) = CURDATE()
        `);
        const [weekCount] = await connection.execute(`
            SELECT COUNT(*) as total FROM usuarios 
            WHERE YEARWEEK(fecha_registro, 1) = YEARWEEK(CURDATE(), 1)
        `);
        
        connection.release();
        
        res.json({
            success: true,
            usuarios: usuarios,
            stats: {
                total: totalCount[0].total,
                hoy: todayCount[0].total,
                semana: weekCount[0].total
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Crear usuario (para técnicos)
app.post('/api/usuarios-tech', verifyTechCode, async (req, res) => {
    try {
        console.log('➕ TÉCNICOS - Creando usuario:', JSON.stringify(req.body, null, 2));
        
        const { codigo, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        
        if (!codigo || !nombre || !apellido || !correo || !contrasena) {
            return res.status(400).json({ error: 'Código, nombre, apellido, correo y contraseña son requeridos' });
        }
        
        if (!codigo.startsWith('U')) {
            return res.status(400).json({ error: 'El código debe comenzar con "U"' });
        }
        
        const connection = await pool.getConnection();
        
        // Verificar duplicados
        const [existingCode] = await connection.execute('SELECT id FROM usuarios WHERE codigo = ?', [codigo]);
        if (existingCode.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El código ya está registrado' });
        }
        
        const [existingEmail] = await connection.execute('SELECT id FROM usuarios WHERE correo = ?', [correo]);
        if (existingEmail.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        
        // Insertar usuario
        const [result] = await connection.execute(
            'INSERT INTO usuarios (codigo, nombre, apellido, correo, contrasena, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo, nombre, apellido, correo, hashedPassword, telefono || null, direccion || null, 'cliente']
        );
        
        connection.release();
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            userId: result.insertId,
            codigo: codigo
        });
        
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Eliminar usuario (para técnicos)
app.delete('/api/usuarios-tech/:id', verifyTechCode, async (req, res) => {
    try {
        const userId = req.params.id;
        console.log('🗑️ TÉCNICOS - Eliminando usuario ID:', userId);
        
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute('SELECT nombre, apellido FROM usuarios WHERE id = ?', [userId]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Eliminar usuario
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
        connection.release();
        
        res.json({
            success: true,
            message: `Usuario ${existing[0].nombre} ${existing[0].apellido} eliminado exitosamente`
        });
        
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE PRODUCTOS =====

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        console.log('🛍️ PRODUCTOS - Obteniendo catálogo');
        
        const connection = await pool.getConnection();
        const [productos] = await connection.execute(`
            SELECT id, nombre, descripcion, precio_compra, precio_alquiler, 
                   categoria, talla, color, disponible_compra, disponible_alquiler,
                   stock_compra, stock_alquiler, imagen
            FROM productos 
            WHERE (disponible_compra = TRUE OR disponible_alquiler = TRUE)
            ORDER BY categoria, nombre
        `);
        connection.release();
        
        res.json({
            success: true,
            productos: productos
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE CARRITO =====

// Procesar carrito completo (compras y alquileres)
app.post('/api/procesar-carrito', async (req, res) => {
    try {
        console.log('🛒 CARRITO - Procesando carrito:', JSON.stringify(req.body, null, 2));
        
        const { 
            usuario_codigo, 
            compras = [], 
            alquileres = [],
            metodo_pago,
            direccion_envio,
            notas_generales
        } = req.body;
        
        if (!usuario_codigo) {
            return res.status(400).json({ error: 'Código de usuario es requerido' });
        }
        
        if (compras.length === 0 && alquileres.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }
        
        const connection = await pool.getConnection();
        
        try {
            // Iniciar transacción
            await connection.beginTransaction();
            
            // Obtener usuario por código
            const [usuarios] = await connection.execute('SELECT id FROM usuarios WHERE codigo = ?', [usuario_codigo]);
            if (usuarios.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            const usuario_id = usuarios[0].id;
            
            const resultados = {
                compras_procesadas: [],
                alquileres_procesados: [],
                total_compras: 0,
                total_alquileres: 0,
                total_general: 0
            };
            
            // Procesar COMPRAS
            for (const compra of compras) {
                const { producto_id, cantidad, notas } = compra;
                
                // Obtener producto y verificar disponibilidad
                const [productos] = await connection.execute(`
                    SELECT id, nombre, precio_compra, stock_compra, disponible_compra 
                    FROM productos 
                    WHERE id = ? AND disponible_compra = TRUE
                `, [producto_id]);
                
                if (productos.length === 0) {
                    await connection.rollback();
                    connection.release();
                    return res.status(404).json({ error: `Producto ID ${producto_id} no disponible para compra` });
                }
                
                const producto = productos[0];
                
                if (producto.stock_compra < cantidad) {
                    await connection.rollback();
                    connection.release();
                    return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
                }
                
                const precio_unitario = producto.precio_compra;
                const precio_total = precio_unitario * cantidad;
                
                // Insertar compra
                const [result] = await connection.execute(`
                    INSERT INTO compras (usuario_id, producto_id, cantidad, precio_unitario, precio_total, 
                                       metodo_pago, direccion_envio, notas) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [usuario_id, producto_id, cantidad, precio_unitario, precio_total, 
                    metodo_pago, direccion_envio, notas || notas_generales]);
                
                // Actualizar stock
                await connection.execute(`
                    UPDATE productos 
                    SET stock_compra = stock_compra - ? 
                    WHERE id = ?
                `, [cantidad, producto_id]);
                
                resultados.compras_procesadas.push({
                    id: result.insertId,
                    producto: producto.nombre,
                    cantidad: cantidad,
                    precio_total: precio_total
                });
                
                resultados.total_compras += precio_total;
            }
            
            // Procesar ALQUILERES
            for (const alquiler of alquileres) {
                const { producto_id, cantidad, fecha_inicio, fecha_fin, deposito, notas } = alquiler;
                
                // Obtener producto y verificar disponibilidad
                const [productos] = await connection.execute(`
                    SELECT id, nombre, precio_alquiler, stock_alquiler, disponible_alquiler 
                    FROM productos 
                    WHERE id = ? AND disponible_alquiler = TRUE
                `, [producto_id]);
                
                if (productos.length === 0) {
                    await connection.rollback();
                    connection.release();
                    return res.status(404).json({ error: `Producto ID ${producto_id} no disponible para alquiler` });
                }
                
                const producto = productos[0];
                
                if (producto.stock_alquiler < cantidad) {
                    await connection.rollback();
                    connection.release();
                    return res.status(400).json({ error: `Stock insuficiente para alquiler de ${producto.nombre}` });
                }
                
                // Calcular días de alquiler
                const inicio = new Date(fecha_inicio);
                const fin = new Date(fecha_fin);
                const dias_alquiler = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
                
                if (dias_alquiler <= 0) {
                    await connection.rollback();
                    connection.release();
                    return res.status(400).json({ error: 'Las fechas de alquiler no son válidas' });
                }
                
                const precio_unitario = producto.precio_alquiler;
                const precio_total = precio_unitario * cantidad * dias_alquiler;
                
                // Insertar alquiler
                const [result] = await connection.execute(`
                    INSERT INTO alquileres (usuario_id, producto_id, cantidad, precio_unitario, precio_total,
                                          fecha_inicio, fecha_fin, dias_alquiler, metodo_pago, 
                                          direccion_entrega, deposito, notas) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [usuario_id, producto_id, cantidad, precio_unitario, precio_total,
                    fecha_inicio, fecha_fin, dias_alquiler, metodo_pago, 
                    direccion_envio, deposito || 0, notas || notas_generales]);
                
                // Actualizar stock (reservar)
                await connection.execute(`
                    UPDATE productos 
                    SET stock_alquiler = stock_alquiler - ? 
                    WHERE id = ?
                `, [cantidad, producto_id]);
                
                resultados.alquileres_procesados.push({
                    id: result.insertId,
                    producto: producto.nombre,
                    cantidad: cantidad,
                    dias_alquiler: dias_alquiler,
                    precio_total: precio_total
                });
                
                resultados.total_alquileres += precio_total;
            }
            
            // Confirmar transacción
            await connection.commit();
            connection.release();
            
            resultados.total_general = resultados.total_compras + resultados.total_alquileres;
            
            console.log('✅ Carrito procesado exitosamente:', resultados);
            
            res.status(201).json({
                success: true,
                message: 'Carrito procesado exitosamente',
                ...resultados
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error procesando carrito:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE COMPRAS =====

// Realizar compra individual (mantener compatibilidad)
app.post('/api/compras', async (req, res) => {
    try {
        console.log('💰 COMPRA - Nueva compra:', JSON.stringify(req.body, null, 2));
        
        const { 
            usuario_codigo, 
            producto_id, 
            cantidad, 
            metodo_pago, 
            direccion_envio,
            notas 
        } = req.body;
        
        if (!usuario_codigo || !producto_id || !cantidad) {
            return res.status(400).json({ 
                error: 'Código de usuario, producto y cantidad son requeridos' 
            });
        }
        
        const connection = await pool.getConnection();
        
        // Obtener usuario por código
        const [usuarios] = await connection.execute('SELECT id FROM usuarios WHERE codigo = ?', [usuario_codigo]);
        if (usuarios.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const usuario_id = usuarios[0].id;
        
        // Obtener producto y verificar disponibilidad
        const [productos] = await connection.execute(`
            SELECT id, nombre, precio_compra, stock_compra, disponible_compra 
            FROM productos 
            WHERE id = ? AND disponible_compra = TRUE
        `, [producto_id]);
        
        if (productos.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Producto no disponible para compra' });
        }
        
        const producto = productos[0];
        
        if (producto.stock_compra < cantidad) {
            connection.release();
            return res.status(400).json({ error: 'Stock insuficiente' });
        }
        
        const precio_unitario = producto.precio_compra;
        const precio_total = precio_unitario * cantidad;
        
        // Insertar compra
        const [result] = await connection.execute(`
            INSERT INTO compras (usuario_id, producto_id, cantidad, precio_unitario, precio_total, 
                               metodo_pago, direccion_envio, notas) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [usuario_id, producto_id, cantidad, precio_unitario, precio_total, 
            metodo_pago, direccion_envio, notas]);
        
        // Actualizar stock
        await connection.execute(`
            UPDATE productos 
            SET stock_compra = stock_compra - ? 
            WHERE id = ?
        `, [cantidad, producto_id]);
        
        connection.release();
        
        console.log('✅ Compra registrada con ID:', result.insertId);
        
        res.status(201).json({
            success: true,
            message: 'Compra registrada exitosamente',
            compra_id: result.insertId,
            producto: producto.nombre,
            cantidad: cantidad,
            precio_total: precio_total
        });
        
    } catch (error) {
        console.error('❌ Error en compra:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE ALQUILERES =====

// Realizar alquiler
app.post('/api/alquileres', async (req, res) => {
    try {
        console.log('🏠 ALQUILER - Nuevo alquiler:', JSON.stringify(req.body, null, 2));
        
        const { 
            usuario_codigo, 
            producto_id, 
            cantidad,
            fecha_inicio,
            fecha_fin,
            metodo_pago, 
            direccion_entrega,
            deposito,
            notas 
        } = req.body;
        
        if (!usuario_codigo || !producto_id || !cantidad || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ 
                error: 'Código de usuario, producto, cantidad y fechas son requeridos' 
            });
        }
        
        const connection = await pool.getConnection();
        
        // Obtener usuario por código
        const [usuarios] = await connection.execute('SELECT id FROM usuarios WHERE codigo = ?', [usuario_codigo]);
        if (usuarios.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const usuario_id = usuarios[0].id;
        
        // Obtener producto y verificar disponibilidad
        const [productos] = await connection.execute(`
            SELECT id, nombre, precio_alquiler, stock_alquiler, disponible_alquiler 
            FROM productos 
            WHERE id = ? AND disponible_alquiler = TRUE
        `, [producto_id]);
        
        if (productos.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Producto no disponible para alquiler' });
        }
        
        const producto = productos[0];
        
        if (producto.stock_alquiler < cantidad) {
            connection.release();
            return res.status(400).json({ error: 'Stock insuficiente para alquiler' });
        }
        
        // Calcular días de alquiler
        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);
        const dias_alquiler = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        
        if (dias_alquiler <= 0) {
            connection.release();
            return res.status(400).json({ error: 'Las fechas de alquiler no son válidas' });
        }
        
        const precio_unitario = producto.precio_alquiler;
        const precio_total = precio_unitario * cantidad * dias_alquiler;
        
        // Insertar alquiler
        const [result] = await connection.execute(`
            INSERT INTO alquileres (usuario_id, producto_id, cantidad, precio_unitario, precio_total,
                                  fecha_inicio, fecha_fin, dias_alquiler, metodo_pago, 
                                  direccion_entrega, deposito, notas) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [usuario_id, producto_id, cantidad, precio_unitario, precio_total,
            fecha_inicio, fecha_fin, dias_alquiler, metodo_pago, 
            direccion_entrega, deposito || 0, notas]);
        
        // Actualizar stock (reservar)
        await connection.execute(`
            UPDATE productos 
            SET stock_alquiler = stock_alquiler - ? 
            WHERE id = ?
        `, [cantidad, producto_id]);
        
        connection.release();
        
        console.log('✅ Alquiler registrado con ID:', result.insertId);
        
        res.status(201).json({
            success: true,
            message: 'Alquiler registrado exitosamente',
            alquiler_id: result.insertId,
            producto: producto.nombre,
            cantidad: cantidad,
            dias_alquiler: dias_alquiler,
            precio_total: precio_total
        });
        
    } catch (error) {
        console.error('❌ Error en alquiler:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS PARA TÉCNICOS - GESTIÓN DE TRANSACCIONES =====

// Ver compras (para técnicos)
app.get('/api/compras-tech', verifyTechCode, async (req, res) => {
    try {
        console.log('📊 TÉCNICOS - Obteniendo compras');
        
        const connection = await pool.getConnection();
        const [compras] = await connection.execute(`
            SELECT c.*, u.codigo as usuario_codigo, u.nombre as usuario_nombre, 
                   u.apellido as usuario_apellido, p.nombre as producto_nombre
            FROM compras c
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN productos p ON c.producto_id = p.id
            ORDER BY c.fecha_compra DESC
            LIMIT 100
        `);
        connection.release();
        
        res.json({
            success: true,
            compras: compras
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo compras:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Ver alquileres (para técnicos)
app.get('/api/alquileres-tech', verifyTechCode, async (req, res) => {
    try {
        console.log('📊 TÉCNICOS - Obteniendo alquileres');
        
        const connection = await pool.getConnection();
        const [alquileres] = await connection.execute(`
            SELECT a.*, u.codigo as usuario_codigo, u.nombre as usuario_nombre, 
                   u.apellido as usuario_apellido, p.nombre as producto_nombre
            FROM alquileres a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN productos p ON a.producto_id = p.id
            ORDER BY a.fecha_reserva DESC
            LIMIT 100
        `);
        connection.release();
        
        res.json({
            success: true,
            alquileres: alquileres
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo alquileres:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE AUTENTICACIÓN =====

// Login de usuarios
app.post('/api/login', async (req, res) => {
    try {
        console.log('🔐 LOGIN - Intento de login:', JSON.stringify({ usuario: req.body.usuario || req.body.correo }, null, 2));
        
        const { usuario, correo, contrasena } = req.body;
        
        // Aceptar tanto 'usuario' como 'correo' para compatibilidad
        const identificador = usuario || correo;
        
        if (!identificador || !contrasena) {
            return res.status(400).json({ error: 'Usuario/correo y contraseña son requeridos' });
        }
        
        const connection = await pool.getConnection();
        
        // Determinar si es código (comienza con U) o correo (contiene @)
        let query, params;
        
        if (identificador.startsWith('U')) {
            // Buscar por código
            console.log('🔍 Buscando por código:', identificador);
            query = `
                SELECT id, codigo, nombre, apellido, correo, contrasena, rol, fecha_registro 
                FROM usuarios 
                WHERE codigo = ?
            `;
            params = [identificador];
        } else if (identificador.includes('@')) {
            // Buscar por correo
            console.log('🔍 Buscando por correo:', identificador);
            query = `
                SELECT id, codigo, nombre, apellido, correo, contrasena, rol, fecha_registro 
                FROM usuarios 
                WHERE correo = ?
            `;
            params = [identificador];
        } else {
            // Buscar en ambos campos por si acaso
            console.log('🔍 Buscando en ambos campos:', identificador);
            query = `
                SELECT id, codigo, nombre, apellido, correo, contrasena, rol, fecha_registro 
                FROM usuarios 
                WHERE codigo = ? OR correo = ?
            `;
            params = [identificador, identificador];
        }
        
        const [usuarios] = await connection.execute(query, params);
        connection.release();
        
        if (usuarios.length === 0) {
            console.log('❌ Usuario no encontrado:', identificador);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const usuarioEncontrado = usuarios[0];
        
        // Verificar contraseña
        const contrasenaValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);
        
        if (!contrasenaValida) {
            console.log('❌ Contraseña incorrecta para:', identificador);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        console.log('✅ Login exitoso para:', identificador, `(${usuarioEncontrado.codigo})`);
        
        // Generar JWT (opcional, para sesiones)
        const token = jwt.sign(
            { 
                userId: usuarioEncontrado.id, 
                codigo: usuarioEncontrado.codigo,
                correo: usuarioEncontrado.correo,
                rol: usuarioEncontrado.rol 
            },
            process.env.JWT_SECRET || 'secreto_temporal',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            usuario: {
                id: usuarioEncontrado.id,
                codigo: usuarioEncontrado.codigo,
                nombre: usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido,
                correo: usuarioEncontrado.correo,
                rol: usuarioEncontrado.rol,
                fecha_registro: usuarioEncontrado.fecha_registro
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Verificar token (middleware para rutas protegidas)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal');
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Obtener perfil del usuario (ruta protegida)
app.get('/api/perfil', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [usuarios] = await connection.execute(`
            SELECT id, codigo, nombre, apellido, correo, telefono, direccion, rol, fecha_registro 
            FROM usuarios 
            WHERE id = ?
        `, [req.usuario.userId]);
        
        connection.release();
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            usuario: usuarios[0]
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Obtener historial de compras del usuario
app.get('/api/mis-compras', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [compras] = await connection.execute(`
            SELECT c.*, p.nombre as producto_nombre, p.categoria
            FROM compras c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.usuario_id = ?
            ORDER BY c.fecha_compra DESC
        `, [req.usuario.userId]);
        
        connection.release();
        
        res.json({
            success: true,
            compras: compras
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo compras:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Obtener historial de alquileres del usuario
app.get('/api/mis-alquileres', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [alquileres] = await connection.execute(`
            SELECT a.*, p.nombre as producto_nombre, p.categoria
            FROM alquileres a
            JOIN productos p ON a.producto_id = p.id
            WHERE a.usuario_id = ?
            ORDER BY a.fecha_reserva DESC
        `, [req.usuario.userId]);
        
        connection.release();
        
        res.json({
            success: true,
            alquileres: alquileres
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo alquileres:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// ===== RUTAS DE DEBUG =====

// Test de conexión a BD
app.get('/api/test-db', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1 as test');
        
        const [tables] = await connection.execute('SHOW TABLES LIKE "usuarios"');
        const [count] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
        
        connection.release();
        
        res.json({ 
            success: true,
            message: 'Conexión a la base de datos exitosa',
            database: 'railway',
            host: 'interchange.proxy.rlwy.net',
            tablaUsuarios: tables.length > 0 ? 'existe' : 'no existe',
            totalUsuarios: count[0].total
        });
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        res.status(500).json({ 
            error: 'Error de conexión a la base de datos',
            details: error.message
        });
    }
});

// Verificar técnicos
app.get('/api/debug/tecnicos', (req, res) => {
    const tecnicos = Object.keys(TECH_CODES).map(codigo => ({
        codigo,
        nombre: TECH_CODES[codigo].nombre,
        email: TECH_CODES[codigo].email,
        activo: TECH_CODES[codigo].activo
    }));
    
    res.json({
        success: true,
        data: tecnicos
    });
});

// Crear productos de ejemplo (solo para desarrollo)
app.post('/api/debug/crear-productos', async (req, res) => {
    try {
        console.log('🎭 DEBUG - Creando productos de ejemplo');
        
        const connection = await pool.getConnection();
        
        const productosEjemplo = [
            {
                nombre: 'Disfraz de Superhéroe',
                descripcion: 'Disfraz completo de superhéroe con capa y máscara',
                precio_compra: 150000,
                precio_alquiler: 25000,
                categoria: 'Superhéroes',
                talla: 'M',
                color: 'Azul/Rojo',
                stock_compra: 5,
                stock_alquiler: 3
            },
            {
                nombre: 'Disfraz de Princesa',
                descripcion: 'Elegante vestido de princesa con accesorios',
                precio_compra: 200000,
                precio_alquiler: 35000,
                categoria: 'Princesas',
                talla: 'S',
                color: 'Rosa',
                stock_compra: 3,
                stock_alquiler: 2
            },
            {
                nombre: 'Disfraz de Pirata',
                descripcion: 'Disfraz de pirata con sombrero y espada de juguete',
                precio_compra: 120000,
                precio_alquiler: 20000,
                categoria: 'Aventura',
                talla: 'L',
                color: 'Negro/Rojo',
                stock_compra: 4,
                stock_alquiler: 2
            },
            {
                nombre: 'Disfraz de Bruja',
                descripcion: 'Disfraz de bruja con sombrero y varita mágica',
                precio_compra: 100000,
                precio_alquiler: 18000,
                categoria: 'Halloween',
                talla: 'M',
                color: 'Negro/Morado',
                stock_compra: 6,
                stock_alquiler: 4
            }
        ];
        
        let insertados = 0;
        
        for (const producto of productosEjemplo) {
            // Verificar si ya existe
            const [existing] = await connection.execute('SELECT id FROM productos WHERE nombre = ?', [producto.nombre]);
            
            if (existing.length === 0) {
                await connection.execute(`
                    INSERT INTO productos (nombre, descripcion, precio_compra, precio_alquiler, 
                                         categoria, talla, color, stock_compra, stock_alquiler,
                                         disponible_compra, disponible_alquiler) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
                `, [
                    producto.nombre, producto.descripcion, producto.precio_compra, 
                    producto.precio_alquiler, producto.categoria, producto.talla, 
                    producto.color, producto.stock_compra, producto.stock_alquiler
                ]);
                insertados++;
            }
        }
        
        connection.release();
        
        res.json({
            success: true,
            message: `${insertados} productos de ejemplo creados`,
            productos_creados: insertados
        });
        
    } catch (error) {
        console.error('❌ Error creando productos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Listar rutas disponibles
app.get('/api/routes', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas disponibles en el servidor',
        routes: {
            autenticacion: [
                'POST /api/registro',
                'POST /api/login'
            ],
            usuario: [
                'GET /api/perfil (requiere token)',
                'GET /api/mis-compras (requiere token)',
                'GET /api/mis-alquileres (requiere token)'
            ],
            productos: [
                'GET /api/productos'
            ],
            carrito: [
                'POST /api/procesar-carrito (compras y alquileres en una transacción)'
            ],
            compras: [
                'POST /api/compras (individual)'
            ],
            alquileres: [
                'POST /api/alquileres (individual)'
            ],
            tecnicos: [
                'GET /api/usuarios-tech (requiere código de técnico)',
                'POST /api/usuarios-tech (requiere código de técnico)',
                'DELETE /api/usuarios-tech/:id (requiere código de técnico)',
                'GET /api/compras-tech (requiere código de técnico)',
                'GET /api/alquileres-tech (requiere código de técnico)'
            ],
            debug: [
                'GET /api/test-db',
                'GET /api/debug/tecnicos',
                'GET /api/routes'
            ]
        },
        codigosTecnico: Object.keys(TECH_CODES)
    });
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Middleware para rutas no encontradas (DEBE IR AL FINAL)
app.use('*', (req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        mensaje: 'Usa GET /api/routes para ver rutas disponibles'
    });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔑 Códigos de técnico disponibles:', Object.keys(TECH_CODES).join(', '));
    console.log('📋 Rutas principales:');
    console.log('  POST /api/registro');
    console.log('  GET  /api/usuarios-tech');
    console.log('  POST /api/usuarios-tech');
    console.log('  GET  /api/test-db');
    console.log('  GET  /api/routes');

    // Inicializar base de datos
    initializeDatabase().then(success => {
        if (success) {
            console.log('✅ Aplicación lista para recibir conexiones');
        } else {
            console.log('⚠️ Aplicación iniciada pero con problemas de base de datos');
        }
    });
});

// Manejo de errores del servidor
server.on('error', (error) => {
    console.error('❌ Error del servidor:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

module.exports = app;