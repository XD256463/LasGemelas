const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Configuración de base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'gondola.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT) || 29190,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rwqaWmQZieEweZGMtPBtjKCaKkAFvMEQ',
    database: process.env.DB_NAME || 'railway',
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000,
    ssl: {
        rejectUnauthorized: false
    }
};

console.log('Configuración de BD:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
});

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Test de conexión simple
app.get('/api/test-connection', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1 as test');
        connection.release();
        res.json({ success: true, message: 'Conexión exitosa' });
    } catch (error) {
        console.error('Error de conexión:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            code: error.code 
        });
    }
});

// Registro simplificado
app.post('/api/registro', async (req, res) => {
    try {
        console.log('=== INICIO REGISTRO ===');
        console.log('Body:', req.body);
        
        const { nombre, email, password, telefono, direccion } = req.body;
        
        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({ 
                error: 'Nombre, email y password son requeridos' 
            });
        }
        
        console.log('Obteniendo conexión...');
        const connection = await pool.getConnection();
        
        try {
            // Verificar si existe
            console.log('Verificando usuario existente...');
            const [existing] = await connection.execute(
                'SELECT id FROM usuarios WHERE email = ?',
                [email]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Usuario ya existe' });
            }
            
            // Encriptar password
            console.log('Encriptando password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insertar usuario
            console.log('Insertando usuario...');
            const [result] = await connection.execute(
                'INSERT INTO usuarios (nombre, email, password, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
                [nombre, email, hashedPassword, telefono || null, direccion || null]
            );
            
            console.log('Usuario creado con ID:', result.insertId);
            
            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                userId: result.insertId
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('=== ERROR REGISTRO ===');
        console.error('Error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message,
            code: error.code
        });
    }
});

// Login básico
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password requeridos' });
        }
        
        const connection = await pool.getConnection();
        
        try {
            const [users] = await connection.execute(
                'SELECT id, nombre, email, password FROM usuarios WHERE email = ?',
                [email]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            const user = users[0];
            const isValid = await bcrypt.compare(password, user.password);
            
            if (!isValid) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'default-secret',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email
                }
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
    });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT recibido, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Excepción no capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
    process.exit(1);
});

console.log('✅ Servidor configurado correctamente');