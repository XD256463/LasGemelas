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
    host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT) || 55821,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'jrYHjccWYOFydWBzKpvPlGJQnnqTNjpF',
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
        console.log('=== REGISTRO PRINCIPAL ===');
        console.log('Body recibido:', JSON.stringify(req.body, null, 2));
        console.log('Content-Type:', req.headers['content-type']);
        
        // Extraer datos directamente
        const { codigo, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        
        console.log('Datos extraídos:', {
            codigo: codigo || 'FALTANTE',
            nombre: nombre || 'FALTANTE', 
            apellido: apellido || 'FALTANTE',
            correo: correo || 'FALTANTE',
            contrasena: contrasena ? 'PRESENTE' : 'FALTANTE'
        });

        // Validar datos requeridos
        if (!codigo || !nombre || !apellido || !correo || !contrasena) {
            console.log('❌ VALIDACIÓN FALLIDA');
            return res.status(400).json({ 
                error: 'Código, nombre, apellido, correo y contraseña son requeridos',
                debug: {
                    codigo: !!codigo,
                    nombre: !!nombre,
                    apellido: !!apellido,
                    correo: !!correo,
                    contrasena: !!contrasena,
                    recibido: req.body
                }
            });
        }

        // Validar que el código comience con "U"
        if (!codigo.startsWith('U') || codigo.length < 2) {
            return res.status(400).json({ 
                error: 'El código debe comenzar con "U" y tener al menos 2 caracteres' 
            });
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({ 
                error: 'Formato de correo electrónico inválido' 
            });
        }

        console.log('Verificando si el usuario existe...');
        
        // Verificar si el código ya existe
        const [existingCode] = await pool.execute(
            'SELECT id FROM usuarios WHERE codigo = ?',
            [codigo]
        );

        if (existingCode.length > 0) {
            console.log('Código ya existe:', codigo);
            return res.status(400).json({ error: 'El código de usuario ya está registrado' });
        }

        // Verificar si el correo ya existe
        const [existingEmail] = await pool.execute(
            'SELECT id FROM usuarios WHERE correo = ?',
            [correo]
        );

        if (existingEmail.length > 0) {
            console.log('Correo ya existe:', correo);
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }

        console.log('Encriptando contraseña...');
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        console.log('Insertando usuario en la base de datos...');
        
        // Insertar usuario
        const [result] = await pool.execute(
            'INSERT INTO usuarios (codigo, nombre, apellido, correo, contrasena, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo, nombre, apellido, correo, hashedPassword, telefono || null, direccion || null, 'cliente']
        );

        console.log('Usuario registrado exitosamente:', result.insertId);

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: result.insertId,
            codigo: codigo
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
            return res.status(400).json({ error: 'El código o correo ya está registrado' });
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
        
        const { codigo, nombre, apellido, correo, contrasena } = req.body;
        
        // Validaciones básicas
        if (!codigo) {
            return res.status(400).json({ error: 'Código es requerido' });
        }
        if (!nombre) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }
        if (!apellido) {
            return res.status(400).json({ error: 'Apellido es requerido' });
        }
        if (!correo) {
            return res.status(400).json({ error: 'Correo es requerido' });
        }
        if (!contrasena) {
            return res.status(400).json({ error: 'Contraseña es requerida' });
        }
        
        // Validar que el código comience con "U"
        if (!codigo.startsWith('U')) {
            return res.status(400).json({ error: 'El código debe comenzar con "U"' });
        }
        
        console.log('Datos validados:', { codigo, nombre, apellido, correo, contrasenaLength: contrasena.length });
        
        // Probar conexión
        console.log('Obteniendo conexión...');
        const connection = await pool.getConnection();
        console.log('Conexión obtenida exitosamente');
        
        // Verificar si código existe
        console.log('Verificando si código existe...');
        const [existingCode] = await connection.execute(
            'SELECT id FROM usuarios WHERE codigo = ?',
            [codigo]
        );
        console.log('Usuarios existentes con este código:', existingCode.length);
        
        if (existingCode.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Código ya existe' });
        }
        
        // Verificar si correo existe
        console.log('Verificando si correo existe...');
        const [existingEmail] = await connection.execute(
            'SELECT id FROM usuarios WHERE correo = ?',
            [correo]
        );
        console.log('Usuarios existentes con este correo:', existingEmail.length);
        
        if (existingEmail.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Correo ya existe' });
        }
        
        // Encriptar password
        console.log('Encriptando contraseña...');
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        console.log('Contraseña encriptada exitosamente');
        
        // Insertar usuario
        console.log('Insertando usuario...');
        const [result] = await connection.execute(
            'INSERT INTO usuarios (codigo, nombre, apellido, correo, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [codigo, nombre, apellido, correo, hashedPassword, 'cliente']
        );
        console.log('Usuario insertado con ID:', result.insertId);
        
        connection.release();
        console.log('=== REGISTRO SIMPLE - ÉXITO ===');
        
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: result.insertId,
            codigo: codigo
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
            host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
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

// Endpoint para técnicos - Obtener todos los usuarios
app.get('/api/usuarios-tech', async (req, res) => {
    try {
        const techCode = req.headers['x-tech-code'] || req.headers['techcode'] || req.query.techCode;
        
        // Verificar código de técnico
        const validCodes = ['TECH_001', 'TECH_002', 'TECH_ADMIN', 'T20137912'];
        if (!validCodes.includes(techCode)) {
            return res.status(401).json({ error: 'Código de técnico requerido o inválido' });
        }
        
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
        console.error('Error obteniendo usuarios para técnicos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Endpoint para técnicos - Crear usuario
app.post('/api/usuarios-tech', async (req, res) => {
    try {
        const techCode = req.headers['x-tech-code'] || req.headers['techcode'];
        
        // Verificar código de técnico
        const validCodes = ['TECH_001', 'TECH_002', 'TECH_ADMIN', 'T20137912'];
        if (!validCodes.includes(techCode)) {
            return res.status(401).json({ error: 'Código de técnico requerido o inválido' });
        }
        
        const { codigo, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        
        if (!codigo || !nombre || !apellido || !correo || !contrasena) {
            return res.status(400).json({ error: 'Código, nombre, apellido, correo y contraseña son requeridos' });
        }
        
        // Validar que el código comience con "U"
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
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            userId: result.insertId,
            codigo: codigo
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Endpoint para técnicos - Eliminar usuario
app.delete('/api/usuarios-tech/:id', async (req, res) => {
    try {
        const techCode = req.headers['x-tech-code'] || req.headers['techcode'];
        
        // Verificar código de técnico
        const validCodes = ['TECH_001', 'TECH_002', 'TECH_ADMIN', 'T20137912'];
        if (!validCodes.includes(techCode)) {
            return res.status(401).json({ error: 'Código de técnico requerido o inválido' });
        }
        
        const userId = req.params.id;
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute('SELECT nombre FROM usuarios WHERE id = ?', [userId]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Eliminar usuario
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
        connection.release();
        
        res.json({
            success: true,
            message: `Usuario ${existing[0].nombre} eliminado exitosamente`
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Endpoint de prueba para debug
app.post('/api/test-registro', (req, res) => {
    console.log('=== TEST REGISTRO ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    
    res.json({
        success: true,
        message: 'Datos recibidos correctamente',
        recibido: req.body,
        headers: req.headers['content-type']
    });
});

// Endpoint de registro NUEVO y limpio
app.post('/api/registro-nuevo', async (req, res) => {
    try {
        console.log('=== REGISTRO NUEVO ===');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        
        const { codigo, nombre, apellido, correo, contrasena, telefono, direccion } = req.body;
        
        // Validar campos requeridos
        if (!codigo) {
            return res.status(400).json({ error: 'El código es requerido' });
        }
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }
        if (!apellido) {
            return res.status(400).json({ error: 'El apellido es requerido' });
        }
        if (!correo) {
            return res.status(400).json({ error: 'El correo es requerido' });
        }
        if (!contrasena) {
            return res.status(400).json({ error: 'La contraseña es requerida' });
        }
        
        // Validar formato del código
        if (!codigo.startsWith('U')) {
            return res.status(400).json({ error: 'El código debe comenzar con "U"' });
        }
        
        // Validar formato del correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({ error: 'Formato de correo inválido' });
        }
        
        console.log('✅ Validaciones pasadas');
        
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
        console.error('❌ Error en registro nuevo:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Endpoint para listar rutas disponibles
app.get('/api/routes', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas disponibles en el servidor',
        routes: {
            registro: [
                'POST /api/registro',
                'POST /api/registro-nuevo', 
                'POST /api/test-registro'
            ],
            tecnicos: [
                'GET /api/usuarios-tech',
                'POST /api/usuarios-tech',
                'DELETE /api/usuarios-tech/:id',
                'GET /api/tech/stats',
                'GET /api/debug/tecnicos'
            ],
            debug: [
                'GET /api/test-db',
                'GET /api/debug-usuarios',
                'GET /api/routes'
            ]
        }
    });
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// ===== FUNCIONALIDAD DE TÉCNICOS =====

// Códigos de técnico válidos (en producción deberían estar en base de datos)
const TECH_CODES = {
    'TECH_001': { nombre: 'Técnico Principal', email: 'tech001@lasgemelas.com', activo: true },
    'TECH_002': { nombre: 'Técnico Secundario', email: 'tech002@lasgemelas.com', activo: true },
    'TECH_ADMIN': { nombre: 'Administrador', email: 'admin@lasgemelas.com', activo: true },
    'T20137912': { nombre:'Técnico Interno', email: 'interno@lasgemelas.com', activo: true }
};

// Endpoint básico para verificar códigos de técnico
app.get('/api/tech-status', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Funcionalidad de técnicos activa',
        codigosDisponibles: Object.keys(TECH_CODES),
        timestamp: new Date().toISOString()
    });
});

// Middleware para verificar código de técnico
const verifyTechCode = (req, res, next) => {
    const techCode = req.headers['techcode'] || req.headers['techCode'] || req.headers['tech-code'];
    
    console.log('Headers recibidos:', req.headers);
    console.log('Código de técnico extraído:', techCode);
    
    if (!techCode) {
        return res.status(401).json({ error: 'Se requiere código de técnico' });
    }
    
    if (!TECH_CODES[techCode] || !TECH_CODES[techCode].activo) {
        console.log('Código inválido:', techCode);
        console.log('Códigos válidos:', Object.keys(TECH_CODES));
        return res.status(401).json({ error: 'Código de técnico inválido' });
    }
    
    console.log('Código válido:', techCode);
    req.techCode = techCode;
    req.techInfo = TECH_CODES[techCode];
    next();
};

// Rutas de técnicos - Estadísticas
app.get('/api/tech/stats', verifyTechCode, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Total de usuarios
        const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
        
        // Usuarios registrados hoy
        const [todayResult] = await connection.execute(`
            SELECT COUNT(*) as total FROM usuarios 
            WHERE DATE(fecha_registro) = CURDATE()
        `);
        
        // Usuarios registrados esta semana
        const [weekResult] = await connection.execute(`
            SELECT COUNT(*) as total FROM usuarios 
            WHERE YEARWEEK(fecha_registro, 1) = YEARWEEK(CURDATE(), 1)
        `);
        
        connection.release();
        
        res.json({
            success: true,
            data: {
                totalUsuarios: totalResult[0].total,
                usuariosHoy: todayResult[0].total,
                usuariosSemana: weekResult[0].total
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de técnicos - Listar usuarios
app.get('/api/tech/usuarios', verifyTechCode, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;
        
        const connection = await pool.getConnection();
        
        let whereClause = '';
        let queryParams = [];
        
        if (search) {
            whereClause = 'WHERE nombre LIKE ? OR email LIKE ?';
            queryParams = [`%${search}%`, `%${search}%`];
        }
        
        // Obtener usuarios con paginación
        const [usuarios] = await connection.execute(`
            SELECT id, nombre, email, telefono, direccion, fecha_registro 
            FROM usuarios 
            ${whereClause}
            ORDER BY fecha_registro DESC 
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        // Contar total de usuarios
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) as total FROM usuarios ${whereClause}
        `, queryParams);
        
        const total = countResult[0].total;
        const pages = Math.ceil(total / limit);
        
        connection.release();
        
        res.json({
            success: true,
            data: usuarios,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de técnicos - Obtener usuario específico
app.get('/api/tech/usuarios/:id', verifyTechCode, async (req, res) => {
    try {
        const userId = req.params.id;
        const connection = await pool.getConnection();
        
        const [usuarios] = await connection.execute(
            'SELECT id, nombre, email, telefono, direccion, fecha_registro FROM usuarios WHERE id = ?',
            [userId]
        );
        
        connection.release();
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            data: usuarios[0]
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de técnicos - Crear usuario
app.post('/api/tech/usuarios', verifyTechCode, async (req, res) => {
    try {
        const { nombre, email, password, telefono, direccion } = req.body;
        
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }
        
        const connection = await pool.getConnection();
        
        // Verificar si el email ya existe
        const [existing] = await connection.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        // Encriptar contraseña
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
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de técnicos - Actualizar usuario
app.put('/api/tech/usuarios/:id', verifyTechCode, async (req, res) => {
    try {
        const userId = req.params.id;
        const { nombre, email, password, telefono, direccion } = req.body;
        
        if (!nombre || !email) {
            return res.status(400).json({ error: 'Nombre y email son requeridos' });
        }
        
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute('SELECT id FROM usuarios WHERE id = ?', [userId]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar si el email ya existe en otro usuario
        const [emailCheck] = await connection.execute('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, userId]);
        if (emailCheck.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'El email ya está registrado por otro usuario' });
        }
        
        let updateQuery = 'UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, direccion = ?';
        let updateParams = [nombre, email, telefono || null, direccion || null];
        
        // Si se proporciona nueva contraseña, incluirla en la actualización
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
        }
        
        updateQuery += ' WHERE id = ?';
        updateParams.push(userId);
        
        await connection.execute(updateQuery, updateParams);
        connection.release();
        
        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de técnicos - Eliminar usuario
app.delete('/api/tech/usuarios/:id', verifyTechCode, async (req, res) => {
    try {
        const userId = req.params.id;
        const connection = await pool.getConnection();
        
        // Verificar que el usuario existe
        const [existing] = await connection.execute('SELECT id, nombre FROM usuarios WHERE id = ?', [userId]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Eliminar usuario
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
        connection.release();
        
        res.json({
            success: true,
            message: `Usuario ${existing[0].nombre} eliminado exitosamente`
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para debug - verificar técnicos
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

// Endpoint de prueba simple para verificar códigos
app.post('/api/tech/test', (req, res) => {
    const techCode = req.headers['techcode'] || req.headers['techCode'] || req.headers['tech-code'];
    
    console.log('=== TEST TÉCNICO ===');
    console.log('Headers:', req.headers);
    console.log('Código recibido:', techCode);
    console.log('Códigos válidos:', Object.keys(TECH_CODES));
    
    if (!techCode) {
        return res.status(401).json({ 
            error: 'Se requiere código de técnico',
            headers: req.headers
        });
    }
    
    if (!TECH_CODES[techCode] || !TECH_CODES[techCode].activo) {
        return res.status(401).json({ 
            error: 'Código de técnico inválido',
            codigoRecibido: techCode,
            codigosValidos: Object.keys(TECH_CODES)
        });
    }
    
    res.json({
        success: true,
        message: 'Código de técnico válido',
        techCode: techCode,
        techInfo: TECH_CODES[techCode]
    });
});

// Middleware para manejar rutas no encontradas (DEBE IR AL FINAL)
app.use('*', (req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        availableRoutes: [
            'GET /api/test-db',
            'GET /api/debug-usuarios', 
            'POST /api/registro',
            'POST /api/registro-nuevo',
            'POST /api/test-registro',
            'GET /api/usuarios-tech',
            'POST /api/usuarios-tech',
            'DELETE /api/usuarios-tech/:id',
            'GET /api/tech/stats',
            'GET /api/debug/tecnicos'
        ]
    });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Códigos de técnico disponibles:', Object.keys(TECH_CODES).join(', '));
    
    // Mostrar rutas disponibles
    console.log('🚀 Rutas disponibles:');
    console.log('  POST /api/registro');
    console.log('  POST /api/registro-nuevo');
    console.log('  POST /api/test-registro');
    console.log('  GET  /api/usuarios-tech');
    console.log('  POST /api/usuarios-tech');
    console.log('  GET  /api/tech/stats');
    console.log('  GET  /api/debug/tecnicos');

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