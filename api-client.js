// Configuración del cliente API
class ApiClient {
  constructor() {
    // Cambia esta URL por la URL de tu aplicación en Railway
    this.baseURL = window.location.origin;
    this.token = localStorage.getItem('authToken');
  }

  // Método para hacer peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('Error en la petición:', error);
      throw error;
    }
  }

  // Métodos de autenticación
  async registro(userData) {
    const response = await this.request('/registro', {
      method: 'POST',
      body: userData,
    });
    return response;
  }

  async login(credentials) {
    const response = await this.request('/login', {
      method: 'POST',
      body: credentials,
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Métodos de productos
  async getProductos() {
    return await this.request('/productos');
  }

  async createProducto(productoData) {
    return await this.request('/productos', {
      method: 'POST',
      body: productoData,
    });
  }

  // Métodos de pedidos
  async createPedido(pedidoData) {
    return await this.request('/pedidos', {
      method: 'POST',
      body: pedidoData,
    });
  }

  async getPedidos() {
    return await this.request('/pedidos');
  }

  // Método para probar la conexión
  async testConnection() {
    return await this.request('/test-db');
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return !!this.token;
  }

  // Obtener usuario actual
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

// Crear instancia global
const apiClient = new ApiClient();