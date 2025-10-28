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

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('loginPassword');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
    });
}