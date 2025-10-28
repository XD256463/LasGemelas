// Script simplificado y funcional para el login
console.log('🚀 Login script iniciado');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado - Inicializando login');
    
    // Inicializar toggle de contraseña primero
    initSimplePasswordToggle();
    
    // Luego inicializar el formulario de login
    initLoginForm();
});

// Función simple para el toggle de contraseña
function initSimplePasswordToggle() {
    const toggleButton = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    const passwordIcon = document.getElementById('loginPasswordIcon');
    
    if (!toggleButton || !passwordInput) {
        console.log('⚠️ Elementos del toggle no encontrados');
        return;
    }
    
    console.log('🔐 Inicializando toggle de contraseña');
    
    let isVisible = false;
    
    function togglePassword() {
        isVisible = !isVisible;
        passwordInput.type = isVisible ? 'text' : 'password';
        
        if (passwordIcon) {
            passwordIcon.className = isVisible ? 'bi bi-eye-slash' : 'bi bi-eye';
        } else {
            toggleButton.innerHTML = isVisible ? '🙈' : '👁️';
        }
        
        toggleButton.title = isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
        console.log('🔄 Toggle ejecutado:', isVisible ? 'visible' : 'oculta');
    }
    
    // Event listener simple
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        togglePassword();
    });
    
    // Asegurar que el botón esté siempre activo
    function keepActive() {
        toggleButton.disabled = false;
        toggleButton.style.pointerEvents = 'auto';
        toggleButton.style.opacity = '1';
    }
    
    keepActive();
    setInterval(keepActive, 1000);
    
    console.log('✅ Toggle de contraseña inicializado');
}

// Función para inicializar el formulario de login
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('❌ Formulario de login no encontrado');
        return;
    }
    
    console.log('📝 Inicializando formulario de login');
    
    // Cuentas predefinidas
    const accounts = {
        "U23201604": { password: "Usuario123@", role: "user" },
        "U23256703": { password: "Miodemi456#", role: "user" },
        "T20137912": { password: "Tecnico456#", role: "tech" }
    };
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('📤 Formulario enviado');
        
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const errorMessage = document.getElementById('errorMessage');
        
        if (!usernameInput || !passwordInput) {
            console.error('❌ Campos de entrada no encontrados');
            return;
        }
        
        const username = usernameInput.value.trim().toUpperCase();
        const password = passwordInput.value;
        
        console.log('🔍 Validando:', username);
        
        // Validar credenciales
        if (accounts[username] && accounts[username].password === password) {
            console.log('✅ Login exitoso');
            
            // Mostrar mensaje de éxito
            if (errorMessage) {
                errorMessage.className = 'alert alert-success';
                errorMessage.textContent = '✅ ¡Login exitoso! Redirigiendo...';
                errorMessage.style.display = 'block';
            }
            
            // Guardar sesión
            sessionStorage.setItem('currentUser', JSON.stringify({
                username: username,
                role: accounts[username].role,
                loginTime: new Date().toISOString()
            }));
            
            // Redirigir según el rol
            setTimeout(() => {
                if (accounts[username].role === 'tech') {
                    window.location.href = 'panel-tecnico.html';
                } else {
                    window.location.href = 'catalogo.html';
                }
            }, 1500);
            
        } else {
            console.log('❌ Credenciales incorrectas');
            
            if (errorMessage) {
                errorMessage.className = 'alert alert-danger';
                errorMessage.textContent = '❌ Usuario o contraseña incorrectos';
                errorMessage.style.display = 'block';
            }
        }
    });
    
    console.log('✅ Formulario de login configurado');
}

// Función global para testing
window.testLogin = function() {
    document.getElementById('loginUsername').value = 'U23201604';
    document.getElementById('loginPassword').value = 'Usuario123@';
    console.log('🧪 Datos de prueba cargados');
};

console.log('✅ Script de login cargado completamente');