// Script para probar la conexión MySQL específica de Railway
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración exacta de tu MySQL en Railway
const dbConfig = {
    host: 'interchange.proxy.rlwy.net',
    port: 55821,
    user: 'root',
    password: 'jrYHjccWYOFydWBzKpvPlGJQnnqTNjpF',
    database: 'railway',
    ssl: {
        rejectUnauthorized: false
    }
};

async function testConnection() {
    console.log('🔍 Probando conexión a MySQL Railway...');
    console.log('Configuración:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
    });
    
    try {
        // Crear conexión
        console.log('📡 Creando conexión...');
        const connection = await mysql.createConnection(dbConfig);
        
        // Probar consulta simple
        console.log('🔍 Ejecutando SELECT 1...');
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Consulta exitosa:', rows);
        
        // Verificar tablas existentes
        console.log('📋 Verificando tablas...');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📊 Tablas encontradas:', tables);
        
        // Verificar estructura de tabla usuarios
        if (tables.some(table => Object.values(table)[0] === 'usuarios')) {
            console.log('👤 Verificando estructura de tabla usuarios...');
            const [structure] = await connection.execute('DESCRIBE usuarios');
            console.log('🏗️ Estructura de usuarios:', structure);
            
            // Contar usuarios
            const [count] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
            console.log('👥 Total de usuarios:', count[0].total);
        } else {
            console.log('⚠️ Tabla usuarios no encontrada');
        }
        
        // Cerrar conexión
        await connection.end();
        console.log('✅ Conexión cerrada correctamente');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error de conexión:');
        console.error('Código:', error.code);
        console.error('Mensaje:', error.message);
        console.error('SQL State:', error.sqlState);
        console.error('Error completo:', error);
        
        return false;
    }
}

// Ejecutar prueba
testConnection()
    .then(success => {
        if (success) {
            console.log('🎉 ¡Conexión MySQL exitosa!');
            process.exit(0);
        } else {
            console.log('💥 Falló la conexión MySQL');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Error inesperado:', error);
        process.exit(1);
    });