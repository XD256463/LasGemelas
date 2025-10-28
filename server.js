const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'gondola.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT) || 29190,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rwqaWmQZieEweZGMtPBtjKCaKkAFvMEQ',
    database: process.env.DB_NAME || 'railway',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    ssl: {
        rejectUnauthorized: false
    }
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        console.log('Intentando conectar a la base de datos...');
        const connection = await pool.getConnection();
        console.log('Conexión exitosa a la base de datos');

        // Crear tabla de usuarios si no existe
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        telefono VARCHAR(20),
        direccion TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Crear tabla de productos si no existe
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(10,2) NOT NULL,
        imagen VARCHAR(255),
        categoria VARCHAR(50),
        stock INT DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Crear tabla de pedidos si no existe
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        total DECIMAL(10,2) NOT NULL,
        estado VARCHAR(50) DEFAULT 'pendiente',
        fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

        // Crear tabla de detalles de pedidos si no existe
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS detalle_pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT,
        producto_id INT,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

        connection.release();
        console.log('Base de datos inicializada correctamente');
        return true;
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        return false;
    }
}

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Rutas de autenticación
app.post('/api/registro', async (req, res) => {
    try {
        console.log('Datos recibidos para registro:', req.body);
        
        const { nombre, email, password, telefono, direccion } = req.body;

        // Validar datos requeridos
        if (!nombre || !email || !password) {
            console.log('Datos faltantes:', { nombre: !!nombre, email: !!email, password: !!password });
            return res.status(400).json({ 
                error: 'Nombre, email y contraseña son requeridos' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Formato de email inválido' 
            });
        }

        console.log('Verificando si el usuario existe...');
        
        // Verificar si el usuario ya existe
        const [existingUser] = await pool.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            console.log('Usuario ya existe:', email);
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        console.log('Encriptando contraseña...');
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Insertando usuario en la base de datos...');
        
        // Insertar usuario
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nombre, email, password, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hashedPassword, telefono || null, direccion || null]
        );

        console.log('Usuario registrado exitosamente:', result.insertId);

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error detallado en registro:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });
        
        // Enviar error más específico según el tipo
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El email ya está registrado' });
        } else if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ error: 'No se puede conectar a la base de datos' });
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            return res.status(500).json({ error: 'Error de autenticación con la base de datos' });
        } else {
            return res.status(500).json({ 
                error: 'Error interno del servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// Endpoint de registro simplificado para pruebas
app.post('/api/registro-simple', async (req, res) => {
    try {
        console.log('=== REGISTRO SIMPLE - INICIO ===');
        console.log('Body recibido:', JSON.stringify(req.body, null, 2));
        
        const { nombre, email, password } = req.body;
        
        // Validaciones básicas
        if (!nombre) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Password es requerido' });
        }
        
        console.log('Datos validados:', { nombre, email, passwordLength: password.length });
        
        // Probar conexión
        console.log('Obteniendo conexión...');
        const connection = await pool.getConnection();
        console.log('Conexión obtenida exitosamente');
        
        // Verificar si usuario existe
        console.log('Verificando si usuario existe...');
        const [existing] = await connection.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        console.log('Usuarios existentes con este email:', existing.length);
        
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Usuario ya existe' });
        }
        
        // Encriptar password
        console.log('Encriptando password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password encriptado exitosamente');
        
        // Insertar usuario con valores mínimos
        console.log('Insertando usuario...');
        const [result] = await connection.execute(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        console.log('Usuario insertado con ID:', result.insertId);
        
        connection.release();
        console.log('=== REGISTRO SIMPLE - ÉXITO ===');
        
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('=== REGISTRO SIMPLE - ERROR ===');
        console.error('Error completo:', error);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message,
            code: error.code,
            errno: error.errno
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const [users] = await pool.execute(
            'SELECT id, nombre, email, password FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de productos
app.get('/api/productos', async (req, res) => {
    try {
        const [productos] = await pool.execute('SELECT * FROM productos');
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/productos', verifyToken, async (req, res) => {
    try {
        const { nombre, descripcion, precio, imagen, categoria, stock } = req.body;

        const [result] = await pool.execute(
            'INSERT INTO productos (nombre, descripcion, precio, imagen, categoria, stock) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, precio, imagen, categoria, stock]
        );

        res.status(201).json({
            message: 'Producto creado exitosamente',
            productId: result.insertId
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de pedidos
app.post('/api/pedidos', verifyToken, async (req, res) => {
    try {
        const { productos, total } = req.body;
        const userId = req.userId;

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Crear pedido
            const [pedidoResult] = await connection.execute(
                'INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)',
                [userId, total]
            );

            const pedidoId = pedidoResult.insertId;

            // Insertar detalles del pedido
            for (const producto of productos) {
                await connection.execute(
                    'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                    [pedidoId, producto.id, producto.cantidad, producto.precio]
                );
            }

            await connection.commit();
            connection.release();

            res.status(201).json({
                message: 'Pedido creado exitosamente',
                pedidoId
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/pedidos', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;

        const [pedidos] = await pool.execute(`
      SELECT p.*, u.nombre as usuario_nombre 
      FROM pedidos p 
      JOIN usuarios u ON p.usuario_id = u.id 
      WHERE p.usuario_id = ?
      ORDER BY p.fecha_pedido DESC
    `, [userId]);

        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta de prueba de conexión
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Probando conexión a la base de datos...');
        const connection = await pool.getConnection();
        
        // Probar consulta simple
        await connection.execute('SELECT 1 as test');
        
        // Verificar que la tabla usuarios existe
        const [tables] = await connection.execute('SHOW TABLES LIKE "usuarios"');
        
        // Obtener información de la tabla usuarios
        let tableInfo = null;
        if (tables.length > 0) {
            const [columns] = await connection.execute('DESCRIBE usuarios');
            tableInfo = columns;
        }
        
        connection.release();
        
        res.json({ 
            message: 'Conexión a la base de datos exitosa',
            database: process.env.DB_NAME || 'railway',
            host: process.env.DB_HOST || 'gondola.proxy.rlwy.net',
            tablaUsuarios: tables.length > 0 ? 'existe' : 'no existe',
            columnas: tableInfo
        });
    } catch (error) {
        console.error('Error de conexión detallado:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
        res.status(500).json({ 
            error: 'Error de conexión a la base de datos',
            details: error.message,
            code: error.code
        });
    }
});

// Endpoint para verificar variables de entorno
app.get('/api/debug-env', (req, res) => {
    res.json({
        NODE_ENV: process.env.NODE_ENV,
        DB_HOST: process.env.DB_HOST ? 'configurado' : 'no configurado',
        DB_PORT: process.env.DB_PORT ? 'configurado' : 'no configurado',
        DB_USER: process.env.DB_USER ? 'configurado' : 'no configurado',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'configurado' : 'no configurado',
        DB_NAME: process.env.DB_NAME ? 'configurado' : 'no configurado',
        JWT_SECRET: process.env.JWT_SECRET ? 'configurado' : 'no configurado',
        PORT: process.env.PORT || 3000
    });
});

// Endpoint para verificar estructura de tabla usuarios
app.get('/api/debug-usuarios', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Obtener estructura de la tabla
        const [structure] = await connection.execute('DESCRIBE usuarios');
        
        // Contar usuarios existentes
        const [count] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
        
        // Obtener algunos usuarios de ejemplo (sin contraseñas)
        const [samples] = await connection.execute('SELECT id, nombre, email, telefono, direccion, fecha_registro FROM usuarios LIMIT 3');
        
        connection.release();
        
        res.json({
            estructura: structure,
            totalUsuarios: count[0].total,
            ejemplos: samples
        });
    } catch (error) {
        console.error('Error verificando tabla usuarios:', error);
        res.status(500).json({ 
            error: 'Error verificando tabla usuarios',
            details: error.message 
        });
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Inicializar base de datos después de que el servidor esté corriendo
    initializeDatabase().then(success => {
        if (success) {
            console.log('Aplicación lista para recibir conexiones');
        } else {
            console.log('Aplicación iniciada pero con problemas de base de datos');
        }
    });
});

// Manejo de errores del servidor
server.on('error', (error) => {
    console.error('Error del servidor:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});