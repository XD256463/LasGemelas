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

// Listar rutas disponibles
app.get('/api/routes', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas disponibles en el servidor',
        routes: {
            registro: [
                'POST /api/registro'
            ],
            tecnicos: [
                'GET /api/usuarios-tech (requiere código de técnico)',
                'POST /api/usuarios-tech (requiere código de técnico)',
                'DELETE /api/usuarios-tech/:id (requiere código de técnico)'
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