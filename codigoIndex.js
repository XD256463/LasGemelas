document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Script de login cargado');
    
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('❌ No se encontró el formulario de login');
        return;
    }
    
    console.log('✅ Formulario de login encontrado');

    // Cuentas predefinidas del sistema
    const systemAccounts = {
        "U23201604": { password: "Usuario123@", role: "user" },
        "U23256703": { password: "Miodemi456#", role: "user" },
        "T20137912": { password: "Tecnico456#", role: "tech" }
    };

    // Función para obtener usuarios registrados
    const getRegisteredUsers = () => {
        try {
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            console.log('👥 Usuarios registrados encontrados:', users.length);
            return users;
        } catch (error) {
            console.error('❌ Error al cargar usuarios registrados:', error);
            return [];
        }
    };

    // Función para validar credenciales
    const validateCredentials = (username, password) => {
        const upperUsername = username.toUpperCase();
        
        // Primero verificar cuentas del sistema
        if (systemAccounts[upperUsername] && systemAccounts[upperUsername].password === password) {
            return {
                isValid: true,
                role: systemAccounts[upperUsername].role,
                source: 'system'
            };
        }
        
        // Luego verificar usuarios registrados
        const registeredUsers = getRegisteredUsers();
        const registeredUser = registeredUsers.find(user => 
            user.username.toUpperCase() === upperUsername && user.password === password
        );
        
        if (registeredUser) {
            // Determinar rol basado en el prefijo del código
            const role = registeredUser.username.startsWith('T') ? 'tech' : 'user';
            return {
                isValid: true,
                role: role,
                source: 'registered'
            };
        }
        
        return { isValid: false };
    };

    console.log('📋 Sistema de autenticación configurado');
    
    // Función para mostrar errores
    function showError(errorElement, message) {
        if (errorElement) {
            errorElement.className = 'alert alert-danger';
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Ocultar mensaje después de 5 segundos
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Formulario enviado');
        
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const errorMessage = document.getElementById('errorMessage');
        const loginButton = document.getElementById('loginButton');
        
        if (!usernameInput || !passwordInput) {
            console.error('❌ No se encontraron los campos de entrada');
            return;
        }

        const usuario = usernameInput.value.trim();
        const contrasena = passwordInput.value;
        
        if (!usuario || !contrasena) {
            showError(errorMessage, 'Por favor completa todos los campos');
            return;
        }
        
        console.log('🔍 Intentando login con:', { usuario });
        
        // Deshabilitar botón durante el proceso
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = '⏳ Iniciando sesión...';
        }
        
        try {
            // Intentar login con el servidor
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: usuario,
                    contrasena: contrasena
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                console.log('✅ Login exitoso:', result.usuario);
                
                // Guardar información de sesión
                sessionStorage.setItem('currentUser', JSON.stringify({
                    id: result.usuario.id,
                    codigo: result.usuario.codigo,
                    nombre: result.usuario.nombre,
                    apellido: result.usuario.apellido,
                    correo: result.usuario.correo,
                    rol: result.usuario.rol,
                    token: result.token,
                    loginTime: new Date().toISOString()
                }));
                
                // Determinar página de destino según el rol
                let redirectPage = '';
                let welcomeMessage = '';
                
                if (result.usuario.rol === 'admin') {
                    redirectPage = 'panel-tecnico.html';
                    welcomeMessage = `¡Bienvenido administrador ${result.usuario.nombre}!`;
                } else {
                    redirectPage = 'test-carrito.html'; // Por ahora redirigir al carrito
                    welcomeMessage = `¡Bienvenido ${result.usuario.nombre}!`;
                }
                
                console.log('🔄 Redirigiendo a:', redirectPage);
                
                if (errorMessage) {
                    errorMessage.className = 'alert alert-success';
                    errorMessage.textContent = `${welcomeMessage} Redirigiendo...`;
                    errorMessage.style.display = 'block';
                }
                
                // Redirigir después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = redirectPage;
                }, 1500);
                
            } else {
                console.log('❌ Login fallido:', result.error);
                showError(errorMessage, result.error || 'Credenciales inválidas');
                
                // Rehabilitar botón
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = '✨ Iniciar Sesión ✨';
                }
            }
            
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            showError(errorMessage, 'Error de conexión. Verifica tu internet.');
            
            // Rehabilitar botón
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = '✨ Iniciar Sesión ✨';
            }
        }
            
        } else {
            console.log('❌ Credenciales incorrectas');
            if (errorMessage) {
                errorMessage.className = 'alert error';
                errorMessage.textContent = '❌ Código de usuario o contraseña incorrectos.';
                errorMessage.style.display = 'block';
            }
        }
    });
    
    console.log('🎯 Event listener del login configurado');
});

// Toggle para mostrar/ocultar contraseña en LOGIN - Versión ULTRA ROBUSTA
function initLoginPasswordToggle() {
    console.log('🔐 Inicializando toggle de contraseña para login...');
    
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    const passwordIcon = document.getElementById('loginPasswordIcon');
    
    if (!togglePassword || !passwordInput) {
        console.error('❌ Elementos del toggle no encontrados:', {
            togglePassword: !!togglePassword,
            passwordInput: !!passwordInput
        });
        return;
    }

    let isPasswordVisible = false; // Estado interno
    
    // Función principal de toggle
    function togglePasswordVisibility(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log('🔄 Toggle login ejecutado - Estado actual:', isPasswordVisible ? 'visible' : 'oculta');
        
        // Cambiar estado
        isPasswordVisible = !isPasswordVisible;
        
        // Aplicar cambios al input
        passwordInput.type = isPasswordVisible ? 'text' : 'password';
        
        // Actualizar icono
        updateToggleIcon();
        
        // Forzar que el botón permanezca activo
        forceButtonActive();
        
        console.log('✅ Toggle login completado - Nuevo estado:', isPasswordVisible ? 'visible' : 'oculta');
    }
    
    // Función para actualizar el icono
    function updateToggleIcon() {
        if (passwordIcon) {
            if (isPasswordVisible) {
                passwordIcon.className = 'bi bi-eye-slash';
                togglePassword.title = 'Ocultar contraseña';
            } else {
                passwordIcon.className = 'bi bi-eye';
                togglePassword.title = 'Mostrar contraseña';
            }
        } else {
            // Fallback para emoji
            togglePassword.innerHTML = isPasswordVisible ? '🙈' : '👁️';
            togglePassword.title = isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
        }
    }
    
    // Función para forzar que el botón esté siempre activo
    function forceButtonActive() {
        togglePassword.disabled = false;
        togglePassword.style.pointerEvents = 'auto';
        togglePassword.style.opacity = '1';
        togglePassword.style.cursor = 'pointer';
        togglePassword.setAttribute('tabindex', '-1');
        
        // Remover cualquier clase que pueda desactivarlo
        togglePassword.classList.remove('disabled');
        togglePassword.removeAttribute('disabled');
    }
    
    // Event listeners múltiples
    togglePassword.addEventListener('click', togglePasswordVisibility, true);
    togglePassword.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }, true);
    
    // Interceptar todos los eventos que puedan desactivar el botón
    togglePassword.addEventListener('blur', forceButtonActive, true);
    togglePassword.addEventListener('focusout', forceButtonActive, true);
    
    // Configurar estado inicial
    forceButtonActive();
    updateToggleIcon();
    
    // Observer para detectar cambios en el botón
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes') {
                if (mutation.attributeName === 'disabled' || 
                    mutation.attributeName === 'class' ||
                    mutation.attributeName === 'style') {
                    console.log('🔧 Detectado cambio en botón login, forzando activación...');
                    forceButtonActive();
                }
            }
        });
    });
    
    observer.observe(togglePassword, {
        attributes: true,
        attributeFilter: ['disabled', 'class', 'style']
    });
    
    // Función de mantenimiento que se ejecuta periódicamente
    function maintainButton() {
        forceButtonActive();
        updateToggleIcon();
    }
    
    // Ejecutar mantenimiento cada 500ms
    setInterval(maintainButton, 500);
    
    // Función global para testing
    window.testLoginPasswordToggle = togglePasswordVisibility;
    window.forceLoginPasswordToggleActive = forceButtonActive;
    
    console.log('✅ Toggle de login inicializado con protección ultra robusta');
}

// Inicializar el toggle de login
initLoginPasswordToggle();

// Re-inicializar múltiples veces para asegurar que funcione
setTimeout(initLoginPasswordToggle, 100);
setTimeout(initLoginPasswordToggle, 500);
setTimeout(initLoginPasswordToggle, 1000);

// Interceptar eventos globales que puedan afectar el botón
document.addEventListener('click', function(e) {
    // Si se hace clic fuera, asegurar que el botón siga activo
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        setTimeout(() => {
            togglePassword.disabled = false;
            togglePassword.style.pointerEvents = 'auto';
            togglePassword.style.opacity = '1';
        }, 10);
    }
});