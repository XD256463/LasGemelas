// Guardian del Toggle de Contraseña
// Este script asegura que el toggle NUNCA se desactive

(function() {
    'use strict';
    
    console.log('🛡️ Toggle Guardian iniciado');
    
    let guardianActive = false;
    let toggleButton = null;
    let passwordInput = null;
    let passwordIcon = null;
    let isPasswordVisible = false;
    
    // Función para encontrar los elementos (registro o login)
    function findElements() {
        // Intentar primero con elementos de registro
        toggleButton = document.getElementById('registerTogglePassword');
        passwordInput = document.getElementById('registerPassword');
        passwordIcon = document.getElementById('passwordIcon');
        
        // Si no se encuentran, intentar con elementos de login
        if (!toggleButton || !passwordInput) {
            toggleButton = document.getElementById('togglePassword');
            passwordInput = document.getElementById('loginPassword');
            passwordIcon = document.getElementById('loginPasswordIcon');
        }
        
        return toggleButton && passwordInput;
    }
    
    // Función para forzar que el botón esté activo
    function forceActive() {
        if (!toggleButton) return;
        
        // Remover atributos que puedan desactivarlo
        toggleButton.removeAttribute('disabled');
        toggleButton.disabled = false;
        
        // Forzar estilos activos
        toggleButton.style.pointerEvents = 'auto';
        toggleButton.style.opacity = '1';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.backgroundColor = '#f8f9fa';
        toggleButton.style.borderColor = '#ced4da';
        toggleButton.style.color = '#495057';
        
        // Remover clases que puedan desactivarlo
        toggleButton.classList.remove('disabled');
        
        // Asegurar que el icono esté visible
        if (passwordIcon) {
            passwordIcon.style.opacity = '1';
            passwordIcon.style.color = '#495057';
        }
    }
    
    // Función principal de toggle
    function executeToggle(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!passwordInput || !toggleButton) return;
        
        console.log('🔄 Guardian ejecutando toggle');
        
        // Cambiar estado
        isPasswordVisible = !isPasswordVisible;
        passwordInput.type = isPasswordVisible ? 'text' : 'password';
        
        // Actualizar icono
        if (passwordIcon) {
            if (isPasswordVisible) {
                passwordIcon.className = 'bi bi-eye-slash';
                toggleButton.title = 'Ocultar contraseña';
            } else {
                passwordIcon.className = 'bi bi-eye';
                toggleButton.title = 'Mostrar contraseña';
            }
        } else {
            // Fallback sin Bootstrap Icons
            toggleButton.innerHTML = isPasswordVisible ? '🙈' : '👁️';
            toggleButton.title = isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
        }
        
        // Forzar que siga activo
        setTimeout(forceActive, 10);
        
        console.log('✅ Toggle completado por Guardian');
    }
    
    // Función para inicializar el guardian
    function initGuardian() {
        if (guardianActive || !findElements()) {
            return;
        }
        
        console.log('🚀 Inicializando Guardian del Toggle');
        
        // Remover event listeners existentes para evitar conflictos
        const newButton = toggleButton.cloneNode(true);
        toggleButton.parentNode.replaceChild(newButton, toggleButton);
        toggleButton = newButton;
        passwordIcon = toggleButton.querySelector('i') || document.getElementById('passwordIcon');
        
        // Agregar nuestro event listener
        toggleButton.addEventListener('click', executeToggle, true);
        toggleButton.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, true);
        
        // Observer para detectar cambios
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'disabled' || 
                     mutation.attributeName === 'class' || 
                     mutation.attributeName === 'style')) {
                    console.log('🔧 Guardian detectó cambio, reactivando...');
                    forceActive();
                }
            });
        });
        
        observer.observe(toggleButton, {
            attributes: true,
            attributeFilter: ['disabled', 'class', 'style']
        });
        
        // Configurar estado inicial
        forceActive();
        guardianActive = true;
        
        console.log('✅ Guardian activado y protegiendo el toggle');
    }
    
    // Función de mantenimiento
    function maintenance() {
        if (toggleButton) {
            forceActive();
        } else if (!guardianActive) {
            initGuardian();
        }
    }
    
    // Interceptar eventos globales
    function interceptGlobalEvents() {
        // Interceptar clicks fuera del botón
        document.addEventListener('click', function(e) {
            if (e.target !== toggleButton && !toggleButton?.contains(e.target)) {
                setTimeout(forceActive, 10);
            }
        }, true);
        
        // Interceptar focus/blur
        document.addEventListener('focusin', function(e) {
            setTimeout(forceActive, 10);
        }, true);
        
        document.addEventListener('focusout', function(e) {
            setTimeout(forceActive, 10);
        }, true);
    }
    
    // Inicialización múltiple para asegurar que funcione
    function multiInit() {
        initGuardian();
        setTimeout(initGuardian, 100);
        setTimeout(initGuardian, 500);
        setTimeout(initGuardian, 1000);
        setTimeout(initGuardian, 2000);
    }
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', multiInit);
    } else {
        multiInit();
    }
    
    // Mantenimiento periódico
    setInterval(maintenance, 300);
    
    // Interceptar eventos globales
    interceptGlobalEvents();
    
    // Función global para testing
    window.guardianToggle = executeToggle;
    window.guardianForceActive = forceActive;
    
    console.log('🛡️ Toggle Guardian completamente inicializado');
    
})();