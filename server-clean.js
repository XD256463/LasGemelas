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
        console.error('Error completo:', error);
        console.error('Stack:', error.stack);
        
        // Asegurar que siempre respondemos con JSON
        if (!res.headersSent) {
            let errorMessage = 'Error interno del servidor';
            let statusCode = 500;
            
            // Manejar errores específicos de MySQL
            if (error.code === 'ER_DUP_ENTRY') {
                errorMessage = 'El email ya está registrado';
                statusCode = 400;
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'No se puede conectar a la base de datos';
                statusCode = 503;
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                errorMessage = 'Error de autenticación con la base de datos';
                statusCode = 503;
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Timeout de conexión a la base de datos';
                statusCode = 503;
            }
            
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                code: error.code,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Endpoint de debug para probar registro paso a paso
app.post('/api/debug-registro', async (req, res) => {
    const steps = [];
    
    try {
        steps.push('1. Recibiendo petición');
        console.log('=== DEBUG REGISTRO ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        
        const { nombre, email, password, telefono, direccion } = req.body;
        
        steps.push('2. Validando datos');
        if (!nombre) throw new Error('Nombre requerido');
        if (!email) throw new Error('Email requerido');
        if (!password) throw new Error('Password requerido');
        
        steps.push('3. Obteniendo conexión BD');
        const connection = await pool.getConnection();
        
        steps.push('4. Verificando usuario existente');
        const [existing] = await connection.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Usuario ya existe',
                steps: steps
            });
        }
        
        steps.push('5. Encriptando password');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        steps.push('6. Insertando en BD');
        const [result] = await connection.execute(
            'INSERT INTO usuarios (nombre, email, password, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hashedPassword, telefono || null, direccion || null]
        );
        
        steps.push('7. Usuario creado exitosamente');
        connection.release();
        
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            userId: result.insertId,
            steps: steps
        });
        
    } catch (error) {
        console.error('Error en debug registro:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            steps: steps,
            errorDetails: {
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState
            }
        });
    }
});

// ========== ENDPOINTS PARA TÉCNICOS - CRUD ==========

// Middleware para verificar si es técnico
const verifyTechnician = async (req, res, next) => {
    try {
        const { techCode } = req.headers;
        
        // Verificar código de técnico (puedes cambiar esta lógica)
        if (!techCode || !techCode.startsWith('TECH_')) {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requiere código de técnico'
            });
        }
        
        // Verificar en BD si el técnico existe
        const connection = await pool.getConnection();
        const [technician] = await connection.execute(
            'SELECT id, nombre FROM tecnicos WHERE codigo = ?',
            [techCode]
        );
        connection.release();
        
        if (technician.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Código de técnico inválido'
            });
        }
        
        req.technician = technician[0];
        next();
    } catch (error) {
        console.error('Error verificando técnico:', error);
        res.status(500).json({
            success: false,
            error: 'Error verificando permisos'
        });
    }
};

// 1. OBTENER TODOS LOS USUARIOS
app.get('/api/tech/usuarios', verifyTechnician, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        const connection = await pool.getConnection();
        
        let query = 'SELECT id, nombre, email, telefono, direccion, fecha_registro FROM usuarios';
        let countQuery = 'SELECT COUNT(*) as total FROM usuarios';
        let params = [];
        
        if (search) {
            query += ' WHERE nombre LIKE ? OR email LIKE ?';
            countQuery += ' WHERE nombre LIKE ? OR email LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }
        
        query += ' ORDER BY fecha_registro DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [usuarios] = await connection.execute(query, params);
        const [countResult] = await connection.execute(countQuery, search ? [`%${search}%`, `%${search}%`] : []);
        
        connection.release();
        
        res.json({
            success: true,
            data: usuarios,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuarios'
        });
    }
});

// 2. OBTENER USUARIO POR ID
app.get('/api/tech/usuarios/:id', verifyTechnician, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        
        const [usuario] = await connection.execute(
            'SELECT id, nombre, email, telefono, direccion, fecha_registro FROM usuarios WHERE id = ?',
            [id]
        );
        
        connection.release();
        
        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: usuario[0]
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuario'
        });
    }
});

// 3. CREAR USUARIO (TÉCNICO)
app.post('/api/tech/usuarios', verifyTechnician, async (req, res) => {
    try {
        const { nombre, email, password, telefono, direccion } = req.body;
        
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Nombre, email y password son requeridos'
            });
        }
        
        const connection = await pool.getConnection();
        
        // Verificar si el email ya existe
        const [existing] = await connection.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                error: 'El email ya está registrado'
            });
        }
        
        // Encriptar password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insertar usuario
        const [result] = await connection.execute(
            'INSERT INTO usuarios (nombre, email, password, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hashedPassword, telefono || null, direccion || null]
        );
        
        connection.release();
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: result.insertId,
                nombre,
                email,
                telefono,
                direccion
            }
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando usuario'
        });
    }
});

// 4. ACTUALIZAR USUARIO
app.put('/api/tech/usuarios/:id', verifyTechnician, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, telefono, direccion, password } = req.body;
        
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute(
            'SELECT id FROM usuarios WHERE id = ?',
            [id]
        );
        
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        // Verificar email único (excluyendo el usuario actual)
        if (email) {
            const [emailCheck] = await connection.execute(
                'SELECT id FROM usuarios WHERE email = ? AND id != ?',
                [email, id]
            );
            
            if (emailCheck.length > 0) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: 'El email ya está en uso por otro usuario'
                });
            }
        }
        
        // Construir query de actualización
        let updateFields = [];
        let updateValues = [];
        
        if (nombre) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (telefono !== undefined) {
            updateFields.push('telefono = ?');
            updateValues.push(telefono || null);
        }
        if (direccion !== undefined) {
            updateFields.push('direccion = ?');
            updateValues.push(direccion || null);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            updateValues.push(hashedPassword);
        }
        
        if (updateFields.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                error: 'No hay campos para actualizar'
            });
        }
        
        updateValues.push(id);
        
        await connection.execute(
            `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        // Obtener usuario actualizado
        const [updated] = await connection.execute(
            'SELECT id, nombre, email, telefono, direccion, fecha_registro FROM usuarios WHERE id = ?',
            [id]
        );
        
        connection.release();
        
        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando usuario'
        });
    }
});

// 5. ELIMINAR USUARIO
app.delete('/api/tech/usuarios/:id', verifyTechnician, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute(
            'SELECT id, nombre, email FROM usuarios WHERE id = ?',
            [id]
        );
        
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        const userData = existing[0];
        
        // Eliminar usuario
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        
        connection.release();
        
        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente',
            data: userData
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error eliminando usuario'
        });
    }
});

// 6. ESTADÍSTICAS PARA TÉCNICOS
app.get('/api/tech/stats', verifyTechnician, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Contar usuarios
        const [userCount] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
        
        // Usuarios registrados hoy
        const [todayCount] = await connection.execute(
            'SELECT COUNT(*) as total FROM usuarios WHERE DATE(fecha_registro) = CURDATE()'
        );
        
        // Usuarios registrados esta semana
        const [weekCount] = await connection.execute(
            'SELECT COUNT(*) as total FROM usuarios WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
        );
        
        // Últimos 5 usuarios registrados
        const [recentUsers] = await connection.execute(
            'SELECT id, nombre, email, fecha_registro FROM usuarios ORDER BY fecha_registro DESC LIMIT 5'
        );
        
        connection.release();
        
        res.json({
            success: true,
            data: {
                totalUsuarios: userCount[0].total,
                usuariosHoy: todayCount[0].total,
                usuariosSemana: weekCount[0].total,
                ultimosUsuarios: recentUsers
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
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

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    
    if (!res.headersSent) {
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
            timestamp: new Date().toISOString()
        });
    }
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

// Función para inicializar técnicos por defecto
async function initializeTechnicians() {
    try {
        const connection = await pool.getConnection();
        
        // Crear tabla de técnicos si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tecnicos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                activo BOOLEAN DEFAULT TRUE,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar si ya existen técnicos
        const [existing] = await connection.execute('SELECT COUNT(*) as count FROM tecnicos');
        
        if (existing[0].count === 0) {
            // Crear técnicos por defecto
            const defaultTechnicians = [
                { codigo: 'TECH_001', nombre: 'Técnico Principal', email: 'tech1@lasgemelas.com' },
                { codigo: 'TECH_002', nombre: 'Técnico Secundario', email: 'tech2@lasgemelas.com' },
                { codigo: 'TECH_ADMIN', nombre: 'Administrador', email: 'admin@lasgemelas.com' }
            ];
            
            for (const tech of defaultTechnicians) {
                await connection.execute(
                    'INSERT INTO tecnicos (codigo, nombre, email) VALUES (?, ?, ?)',
                    [tech.codigo, tech.nombre, tech.email]
                );
            }
            
            console.log('✅ Técnicos por defecto creados');
        }
        
        connection.release();
    } catch (error) {
        console.error('Error inicializando técnicos:', error);
    }
}

// Endpoint para listar técnicos (solo para debug)
app.get('/api/debug/tecnicos', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tecnicos] = await connection.execute('SELECT codigo, nombre, email, activo FROM tecnicos');
        connection.release();
        
        res.json({
            success: true,
            data: tecnicos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo técnicos'
        });
    }
});

console.log('✅ Servidor configurado correctamente');

// Inicializar técnicos al arrancar
setTimeout(() => {
    initializeTechnicians();
}, 2000);