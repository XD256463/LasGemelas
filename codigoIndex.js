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

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('📝 Formulario enviado');
        
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const errorMessage = document.getElementById('errorMessage');
        
        if (!usernameInput || !passwordInput) {
            console.error('❌ No se encontraron los campos de entrada');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        console.log('🔍 Datos ingresados:', { username });
        
        const validation = validateCredentials(username, password);
        console.log('🔐 Resultado de validación:', validation);

        if (validation.isValid) {
            console.log('✅ Credenciales correctas');
            
            // Guardar información de sesión
            sessionStorage.setItem('currentUser', JSON.stringify({
                username: username.toUpperCase(),
                role: validation.role,
                source: validation.source,
                loginTime: new Date().toISOString()
            }));
            
            let redirectPage = '';
            let welcomeMessage = '';
            
            if (validation.role === 'user') {
                redirectPage = 'catalogo.html';
                welcomeMessage = '¡Bienvenido usuario!';
            } else if (validation.role === 'tech') {
                redirectPage = 'Interno.html';
                welcomeMessage = '¡Bienvenido técnico!';
            }
            
            console.log('🔄 Redirigiendo a:', redirectPage);
            
            if (errorMessage) {
                errorMessage.className = 'alert success';
                errorMessage.textContent = `${welcomeMessage} Redirigiendo...`;
                errorMessage.style.display = 'block';
            }
            
            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = redirectPage;
            }, 1500);
            
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