// Script de respaldo para el toggle de contraseña
// Se puede incluir en cualquier página que necesite esta funcionalidad

function initPasswordToggle(passwordInputId, toggleButtonId) {
    const passwordInput = document.getElementById(passwordInputId);
    const toggleButton = document.getElementById(toggleButtonId);
    
    if (!passwordInput || !toggleButton) {
        console.error('Password toggle elements not found:', {
            passwordInput: !!passwordInput,
            toggleButton: !!toggleButton
        });
        return false;
    }
    
    // Función principal de toggle
    function togglePassword(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        // Buscar icono Bootstrap
        const icon = toggleButton.querySelector('i');
        
        if (icon) {
            // Usar Bootstrap Icons
            if (isPassword) {
                icon.className = 'bi bi-eye-slash';
                toggleButton.title = 'Ocultar contraseña';
            } else {
                icon.className = 'bi bi-eye';
                toggleButton.title = 'Mostrar contraseña';
            }
        } else {
            // Usar emojis como fallback
            if (isPassword) {
                toggleButton.innerHTML = '🙈';
                toggleButton.title = 'Ocultar contraseña';
            } else {
                toggleButton.innerHTML = '👁️';
                toggleButton.title = 'Mostrar contraseña';
            }
        }
        
        // Mantener foco en el input si lo tenía
        if (document.activeElement === passwordInput) {
            setTimeout(() => {
                passwordInput.focus();
                passwordInput.setSelectionRange(passwordInput.value.length, passwordInput.value.length);
            }, 10);
        }
        
        console.log(`Password visibility toggled to: ${passwordInput.type}`);
    }
    
    // Event listeners múltiples
    toggleButton.addEventListener('click', togglePassword);
    toggleButton.addEventListener('mousedown', function(e) {
        e.preventDefault(); // Prevenir pérdida de foco
    });
    
    // Configurar propiedades del botón
    toggleButton.title = 'Mostrar contraseña';
    toggleButton.setAttribute('tabindex', '-1');
    toggleButton.disabled = false;
    toggleButton.style.pointerEvents = 'auto';
    toggleButton.style.opacity = '1';
    toggleButton.style.cursor = 'pointer';
    
    console.log('Password toggle initialized for:', passwordInputId);
    
    return true;
}

// Auto-inicializar para elementos comunes
document.addEventListener('DOMContentLoaded', function() {
    // Intentar inicializar para el formulario de registro
    initPasswordToggle('registerPassword', 'registerTogglePassword');
    
    // Intentar inicializar para el formulario de login
    initPasswordToggle('loginPassword', 'togglePassword');
    
    // Intentar inicializar para otros formularios comunes
    initPasswordToggle('password', 'togglePassword');
    initPasswordToggle('loginPassword', 'loginTogglePassword');
});

// Función para crear toggle dinámicamente
function createPasswordToggle(passwordInput) {
    if (typeof passwordInput === 'string') {
        passwordInput = document.getElementById(passwordInput);
    }
    
    if (!passwordInput) return false;
    
    // Crear botón de toggle
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'btn btn-outline-secondary';
    toggleButton.innerHTML = '<i class="bi bi-eye"></i>';
    toggleButton.title = 'Mostrar contraseña';
    
    // Envolver input en input-group si no está ya
    const parent = passwordInput.parentElement;
    if (!parent.classList.contains('input-group')) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';
        
        parent.insertBefore(inputGroup, passwordInput);
        inputGroup.appendChild(passwordInput);
        inputGroup.appendChild(toggleButton);
    } else {
        parent.appendChild(toggleButton);
    }
    
    // Agregar funcionalidad
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
        
        toggleButton.title = isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
    });
    
    return toggleButton;
}