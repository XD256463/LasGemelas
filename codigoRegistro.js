document.addEventListener('DOMContentLoaded', () => {
    // Verificar que todos los elementos existan
    const nameInput = document.getElementById('registerName');
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
            reqSpecial: !!reqSpecial
        });
        return;
    }

    console.log('Todos los elementos encontrados correctamente');

    // Validar nombre
    const validateName = () => {
        const name = nameInput.value.trim();
        return name.length >= 2;
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
        const nameValid = validateName();
        const emailValid = validateEmail();
        const passwordValid = validatePassword();

        if (nameValid && emailValid && passwordValid) {
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            messageElement.textContent = '✅ ¡Formulario válido! Puedes registrarte.';
            messageElement.style.color = '#27ae60';
        } else {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';

            if (!nameValid && nameInput.value.trim()) {
                messageElement.textContent = '❌ El nombre debe tener al menos 2 caracteres.';
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

    // Toggle para mostrar/ocultar contraseña
    toggleIcon.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleIcon.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // Event listeners para validación en tiempo real
    nameInput.addEventListener('input', validateForm);
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

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();
        const password = passwordInput.value;

        if (!validateName()) {
            messageElement.textContent = '❌ El nombre debe tener al menos 2 caracteres.';
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
                nombre: name,
                email: email,
                password: password,
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