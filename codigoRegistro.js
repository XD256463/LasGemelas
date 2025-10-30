document.addEventListener('DOMContentLoaded', () => {
    // Verificar que todos los elementos existan
    const codeInput = document.getElementById('registerCode');
    const nameInput = document.getElementById('registerName');
    const lastNameInput = document.getElementById('registerLastName');
    const emailInput = document.getElementById('registerEmail');
    const phoneInput = document.getElementById('registerPhone');
    const addressInput = document.getElementById('registerAddress');
    const passwordInput = document.getElementById('registerPassword');
    const toggleIcon = document.getElementById('registerTogglePassword');
    const submitButton = document.getElementById('registerButton');
    const messageElement = document.getElementById('registerMessage');

    const reqLength = document.getElementById('reqLength');
    const reqDigit = document.getElementById('reqDigit');
    const reqUppercase = document.getElementById('reqUppercase');
    const reqSpecial = document.getElementById('reqSpecial');

    // Verificar que todos los elementos críticos existan
    if (!passwordInput || !reqLength || !reqDigit || !reqUppercase || !reqSpecial) {
        console.error('Elementos críticos no encontrados:', {
            passwordInput: !!passwordInput,
            reqLength: !!reqLength,
            reqDigit: !!reqDigit,
            reqUppercase: !!reqUppercase,
            reqSpecial: !!reqSpecial,
            toggleIcon: !!toggleIcon
        });
        return;
    }

    console.log('Todos los elementos encontrados correctamente:', {
        passwordInput: !!passwordInput,
        toggleIcon: !!toggleIcon,
        toggleIconText: toggleIcon ? toggleIcon.textContent : 'N/A'
    });

    // Validar código
    const validateCode = () => {
        const code = codeInput.value.trim();
        return code.startsWith('U') && code.length >= 2 && /^U[0-9]+$/.test(code);
    };

    // Validar nombre
    const validateName = () => {
        const name = nameInput.value.trim();
        return name.length >= 2;
    };

    // Validar apellido
    const validateLastName = () => {
        const lastName = lastNameInput.value.trim();
        return lastName.length >= 2;
    };

    // Validar email
    const validateEmail = () => {
        const email = emailInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    };

    const validatePassword = () => {
        const password = passwordInput.value;
        console.log('Validando contraseña:', password); // Debug
        let allValid = true;

        // Verificar que los elementos existan
        if (!reqLength || !reqDigit || !reqUppercase || !reqSpecial) {
            console.error('Elementos de validación no encontrados');
            return false;
        }

        const lengthValid = password.length >= 8;
        updateRequirement(reqLength, lengthValid, "8 o más caracteres");
        if (!lengthValid) allValid = false;

        const digitValid = /[0-9]/.test(password);
        updateRequirement(reqDigit, digitValid, "Mínimo un (1) dígito");
        if (!digitValid) allValid = false;

        const uppercaseValid = /[A-Z]/.test(password);
        updateRequirement(reqUppercase, uppercaseValid, "Mínimo una (1) mayúscula");
        if (!uppercaseValid) allValid = false;

        const specialValid = /[?@/!#$%&*]/.test(password);
        updateRequirement(reqSpecial, specialValid, "Mínimo un (1) carácter especial (? @ / ! # $ % & *)");
        if (!specialValid) allValid = false;

        console.log('Validación completa:', { lengthValid, digitValid, uppercaseValid, specialValid, allValid }); // Debug
        return allValid;
    };

    const validateForm = () => {
        const codeValid = validateCode();
        const nameValid = validateName();
        const lastNameValid = validateLastName();
        const emailValid = validateEmail();
        const passwordValid = validatePassword();

        if (codeValid && nameValid && lastNameValid && emailValid && passwordValid) {
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            messageElement.textContent = '✅ ¡Formulario válido! Puedes registrarte.';
            messageElement.style.color = '#27ae60';
        } else {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';

            if (!codeValid && codeInput.value.trim()) {
                messageElement.textContent = '❌ El código debe comenzar con "U" seguido de números (ej: U23201604).';
                messageElement.style.color = '#e74c3c';
            } else if (!nameValid && nameInput.value.trim()) {
                messageElement.textContent = '❌ El nombre debe tener al menos 2 caracteres.';
                messageElement.style.color = '#e74c3c';
            } else if (!lastNameValid && lastNameInput.value.trim()) {
                messageElement.textContent = '❌ El apellido debe tener al menos 2 caracteres.';
                messageElement.style.color = '#e74c3c';
            } else if (!emailValid && emailInput.value.trim()) {
                messageElement.textContent = '❌ Ingresa un correo electrónico válido.';
                messageElement.style.color = '#e74c3c';
            } else {
                messageElement.textContent = '';
            }
        }
    };

    const updateRequirement = (element, isValid, text) => {
        if (!element) {
            console.error('Elemento no encontrado para actualizar requisito');
            return;
        }

        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
            element.innerHTML = `✔️ ${text}`;
            element.style.color = '#27ae60';
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
            element.innerHTML = `❌ ${text}`;
            element.style.color = '#e74c3c';
        }
    };

    // Toggle para mostrar/ocultar contraseña - Versión ULTRA ROBUSTA
    function initPasswordToggle() {
        console.log('Inicializando toggle de contraseña...');
        
        if (!toggleIcon || !passwordInput) {
            console.error('Toggle icon or password input not found:', {
                toggleIcon: !!toggleIcon,
                passwordInput: !!passwordInput
            });
            return;
        }

        const passwordIcon = document.getElementById('passwordIcon');
        let isPasswordVisible = false; // Estado interno
        
        // Función principal de toggle
        function togglePasswordVisibility(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            console.log('🔄 Toggle ejecutado - Estado actual:', isPasswordVisible ? 'visible' : 'oculta');
            
            // Cambiar estado
            isPasswordVisible = !isPasswordVisible;
            
            // Aplicar cambios al input
            passwordInput.type = isPasswordVisible ? 'text' : 'password';
            
            // Actualizar icono
            updateToggleIcon();
            
            // Forzar que el botón permanezca activo
            forceButtonActive();
            
            console.log('✅ Toggle completado - Nuevo estado:', isPasswordVisible ? 'visible' : 'oculta');
        }
        
        // Función para actualizar el icono
        function updateToggleIcon() {
            if (passwordIcon) {
                if (isPasswordVisible) {
                    passwordIcon.className = 'bi bi-eye-slash';
                    toggleIcon.title = 'Ocultar contraseña';
                } else {
                    passwordIcon.className = 'bi bi-eye';
                    toggleIcon.title = 'Mostrar contraseña';
                }
            } else {
                // Fallback para emoji
                toggleIcon.innerHTML = isPasswordVisible ? '🙈' : '👁️';
                toggleIcon.title = isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
            }
        }
        
        // Función para forzar que el botón esté siempre activo
        function forceButtonActive() {
            toggleIcon.disabled = false;
            toggleIcon.style.pointerEvents = 'auto';
            toggleIcon.style.opacity = '1';
            toggleIcon.style.cursor = 'pointer';
            toggleIcon.setAttribute('tabindex', '-1');
            
            // Remover cualquier clase que pueda desactivarlo
            toggleIcon.classList.remove('disabled');
            toggleIcon.removeAttribute('disabled');
        }
        
        // Event listeners múltiples
        toggleIcon.addEventListener('click', togglePasswordVisibility, true);
        toggleIcon.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, true);
        
        // Interceptar todos los eventos que puedan desactivar el botón
        toggleIcon.addEventListener('blur', forceButtonActive, true);
        toggleIcon.addEventListener('focusout', forceButtonActive, true);
        
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
                        console.log('🔧 Detectado cambio en el botón, forzando activación...');
                        forceButtonActive();
                    }
                }
            });
        });
        
        observer.observe(toggleIcon, {
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
        window.testPasswordToggle = togglePasswordVisibility;
        window.forcePasswordToggleActive = forceButtonActive;
        
        console.log('✅ Password toggle inicializado con protección ultra robusta');
    }
    
    // Inicializar inmediatamente
    initPasswordToggle();
    
    // Re-inicializar múltiples veces para asegurar que funcione
    setTimeout(initPasswordToggle, 100);
    setTimeout(initPasswordToggle, 500);
    setTimeout(initPasswordToggle, 1000);
    
    // Inicializar cuando el DOM esté completamente listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPasswordToggle);
    }
    
    // Interceptar eventos globales que puedan afectar el botón
    document.addEventListener('click', function(e) {
        // Si se hace clic fuera, asegurar que el botón siga activo
        setTimeout(() => {
            if (toggleIcon) {
                toggleIcon.disabled = false;
                toggleIcon.style.pointerEvents = 'auto';
                toggleIcon.style.opacity = '1';
            }
        }, 10);
    });

    // Event listeners para validación en tiempo real
    codeInput.addEventListener('input', validateForm);
    nameInput.addEventListener('input', validateForm);
    lastNameInput.addEventListener('input', validateForm);
    emailInput.addEventListener('input', validateForm);

    // Event listener específico para contraseña con múltiples eventos
    passwordInput.addEventListener('input', () => {
        console.log('Input event en contraseña'); // Debug
        validatePassword();
        validateForm();
    });

    passwordInput.addEventListener('keyup', () => {
        console.log('Keyup event en contraseña'); // Debug
        validatePassword();
        validateForm();
    });

    passwordInput.addEventListener('paste', () => {
        setTimeout(() => {
            console.log('Paste event en contraseña'); // Debug
            validatePassword();
            validateForm();
        }, 10);
    });

    // Función global para validación externa
    window.validateRegistrationPassword = () => {
        return validatePassword();
    };

    // Manejo del envío del formulario
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = codeInput.value.trim();
        const name = nameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();
        const password = passwordInput.value;

        if (!validateCode()) {
            messageElement.textContent = '❌ El código debe comenzar con "U" seguido de números.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        if (!validateName()) {
            messageElement.textContent = '❌ El nombre debe tener al menos 2 caracteres.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        if (!validateLastName()) {
            messageElement.textContent = '❌ El apellido debe tener al menos 2 caracteres.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        if (!validateEmail()) {
            messageElement.textContent = '❌ Ingresa un correo electrónico válido.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        if (!validatePassword()) {
            messageElement.textContent = '❌ La contraseña no cumple todos los requisitos.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        // Deshabilitar botón durante el proceso
        submitButton.disabled = true;
        submitButton.textContent = '⏳ Registrando...';
        messageElement.textContent = '📡 Conectando con el servidor...';
        messageElement.style.color = '#3498db';

        try {
            // Crear objeto de datos del usuario
            const userData = {
                codigo: code,
                nombre: name,
                apellido: lastName,
                correo: email,
                contrasena: password,
                telefono: phone,
                direccion: address
            };

            // Debug: Mostrar datos que se van a enviar
            console.log('Enviando datos de registro:', userData);

            // Enviar datos al servidor
            const response = await fetch('/api/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            console.log('Respuesta del servidor:', response.status, response.statusText);

            // Verificar si la respuesta es JSON válida
            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const textResponse = await response.text();
                console.error('Respuesta no es JSON:', textResponse);
                throw new Error(`Servidor respondió con: ${textResponse}`);
            }

            console.log('Resultado parseado:', result);

            if (response.ok) {
                // Registro exitoso
                messageElement.textContent = '🎉 ¡Registro exitoso! Usuario guardado en la base de datos. Redirigiendo...';
                messageElement.style.color = '#27ae60';

                // Guardar también en localStorage como respaldo
                const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                users.push({
                    id: result.userId,
                    nombre: name,
                    email: email,
                    telefono: phone,
                    direccion: address,
                    registeredAt: new Date().toISOString()
                });
                localStorage.setItem('registeredUsers', JSON.stringify(users));

                // Redirigir después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                // Error del servidor
                if (result.error === 'El usuario ya existe') {
                    messageElement.textContent = '❌ Este código de usuario ya está registrado en la base de datos.';
                } else {
                    messageElement.textContent = `❌ Error: ${result.error}`;
                }
                messageElement.style.color = '#e74c3c';

                // Rehabilitar botón
                submitButton.disabled = false;
                submitButton.textContent = '🎉 Registrar Cuenta 🎉';
            }
        } catch (error) {
            console.error('Error de conexión:', error);

            // Fallback a localStorage si no hay conexión
            messageElement.textContent = '⚠️ Sin conexión al servidor. Guardando localmente...';
            messageElement.style.color = '#f39c12';

            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

            // Verificar si el usuario ya existe localmente
            if (users.find(user => user.email === email)) {
                messageElement.textContent = '❌ Este correo ya está registrado localmente.';
                messageElement.style.color = '#e74c3c';
                submitButton.disabled = false;
                submitButton.textContent = '🎉 Registrar Cuenta 🎉';
                return;
            }

            // Guardar localmente
            users.push({
                nombre: name,
                email: email,
                telefono: phone,
                direccion: address,
                password: password,
                registeredAt: new Date().toISOString(),
                syncPending: true // Marcar para sincronizar después
            });

            localStorage.setItem('registeredUsers', JSON.stringify(users));

            messageElement.textContent = '✅ Usuario guardado localmente. Se sincronizará cuando haya conexión.';
            messageElement.style.color = '#27ae60';

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    });

    // Validación inicial
    console.log('Ejecutando validación inicial');
    validatePassword(); // Validar contraseña inicialmente
    validateForm();

    // Forzar actualización visual inicial
    setTimeout(() => {
        validatePassword();
    }, 100);
});

async function syncPendingUsers() {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const pendingUsers = users.filter(user => user.syncPending);

    if (pendingUsers.length === 0) return;

    console.log(`Sincronizando ${pendingUsers.length} usuarios pendientes...`);

    for (const user of pendingUsers) {
        try {
            const userData = {
                nombre: user.nombre,
                email: user.email,
                password: user.password,
                telefono: user.telefono || '',
                direccion: user.direccion || ''
            };

            const response = await fetch('/api/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                // Marcar como sincronizado
                user.syncPending = false;
                user.syncedAt = new Date().toISOString();
                console.log(`Usuario ${user.email} sincronizado exitosamente`);
            }
        } catch (error) {
            console.log(`Error sincronizando usuario ${user.email}:`, error);
        }
    }

    // Actualizar localStorage
    localStorage.setItem('registeredUsers', JSON.stringify(users));
}

// Intentar sincronizar al cargar la página
window.addEventListener('load', () => {
    // Esperar un poco para que la página cargue completamente
    setTimeout(syncPendingUsers, 2000);
});

// Sincronizar cuando se recupere la conexión
window.addEventListener('online', syncPendingUsers);