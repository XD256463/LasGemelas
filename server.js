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

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
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
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
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
    const { nombre, email, password, telefono, direccion } = req.body;
    
    // Verificar si el usuario ya existe
    const [existingUser] = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar usuario
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, email, password, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hashedPassword, telefono, direccion]
    );
    
    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    res.json({ message: 'Conexión a la base de datos exitosa' });
  } catch (error) {
    console.error('Error de conexión:', error);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  await initializeDatabase();
});