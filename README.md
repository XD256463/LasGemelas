# Las Gemelas - Aplicación Web con MySQL

Esta aplicación web está configurada para funcionar con Railway y una base de datos MySQL.

## Configuración Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - Copia `.env.example` a `.env`
   - Actualiza las variables según tu configuración

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Ejecutar en producción:**
   ```bash
   npm start
   ```

## Despliegue en Railway

1. **Conectar repositorio:**
   - Sube tu código a GitHub
   - Conecta el repositorio en Railway

2. **Variables de entorno en Railway:**
   Configura estas variables en el dashboard de Railway:
   ```
   DATABASE_URL=mysql://root:rwqaWmQZieEweZGMtPBtjKCaKkAFvMEQ@gondola.proxy.rlwy.net:29190/railway
   DB_HOST=gondola.proxy.rlwy.net
   DB_PORT=29190
   DB_USER=root
   DB_PASSWORD=rwqaWmQZieEweZGMtPBtjKCaKkAFvMEQ
   DB_NAME=railway
   JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
   PORT=3000
   ```

3. **Despliegue automático:**
   Railway detectará automáticamente tu aplicación Node.js y la desplegará.

## API Endpoints

### Autenticación
- `POST /api/registro` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión

### Productos
- `GET /api/productos` - Obtener todos los productos
- `POST /api/productos` - Crear nuevo producto (requiere autenticación)

### Pedidos
- `GET /api/pedidos` - Obtener pedidos del usuario (requiere autenticación)
- `POST /api/pedidos` - Crear nuevo pedido (requiere autenticación)

### Utilidades
- `GET /api/test-db` - Probar conexión a la base de datos

## Estructura de la Base de Datos

La aplicación creará automáticamente las siguientes tablas:

- `usuarios` - Información de usuarios registrados
- `productos` - Catálogo de productos
- `pedidos` - Pedidos realizados
- `detalle_pedidos` - Detalles de cada pedido

## Uso del Cliente API

Incluye `api-client.js` en tus páginas HTML para usar las funciones de la API:

```html
<script src="api-client.js"></script>
<script>
  // Ejemplo de uso
  apiClient.login({ email: 'usuario@email.com', password: 'password' })
    .then(response => console.log('Login exitoso', response))
    .catch(error => console.error('Error:', error));
</script>
```