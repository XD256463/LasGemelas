// JavaScript simplificado y funcional para el registro
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== REGISTRO FIX CARGADO ===');
    
    // Obtener elementos del formulario
    const form = document.getElementById('registerForm');
    const submitButton = document.getElementById('registerButton');
    const messageElement = document.getElementById('registerMessage');
    
    // Elementos de entrada
    const codeInput = document.getElementById('registerCode');
    const nameInput = document.getElementById('registerName');
    const lastNameInput = document.getElementById('registerLastName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const phoneInput = document.getElementById('registerPhone');
    const addressInput = document.getElementById('registerAddress');
    
    // Elementos de validación de contraseña
    const reqLength = document.getElementById('reqLength');
    const reqDigit = document.getElementById('reqDigit');
    const reqUppercase = document.getElementById('reqUppercase');
    const reqSpecial = document.getElementById('reqSpecial');
    
    // Toggle de contraseña
    const toggleButton = document.getElementById('registerTogglePassword');
    const passwordIcon = document.getElementById('passwordIcon');
    
    console.log('Elementos encontrados:', {
        form: !!form,
        codeInput: !!codeInput,
        nameInput: !!nameInput,
        lastNameInput: !!lastNameInput,
        emailInput: !!emailInput,
        passwordInput: !!passwordInput,
        submitButton: !!submitButton,
        messageElement: !!messageElement
    });
    
    // Función para mostrar/ocultar contraseña
    if (toggleButton && passwordInput && passwordIcon) {
        toggleButton.addEventListener('click', function() {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    }
    
    // Función para actualizar requisitos de contraseña
    function updateRequirement(element, isValid, text) {
        if (!element) return;
        
        if (isValid) {
            element.style.color = '#28a745';
            element.innerHTML = `✅ ${text}`;
        } else {
            element.style.color = '#dc3545';
            element.innerHTML = `❌ ${text}`;
        }
    }
    
    // Validar contraseña
    function validatePassword() {
        if (!passwordInput) return false;
        
        const password = passwordInput.value;
        let allValid = true;
        
        // 8 o más caracteres
        const lengthValid = password.length >= 8;
        updateRequirement(reqLength, lengthValid, "8 o más caracteres");
        if (!lengthValid) allValid = false;
        
        // Mínimo un dígito
        const digitValid = /[0-9]/.test(password);
        updateRequirement(reqDigit, digitValid, "Mínimo un (1) dígito");
        if (!digitValid) allValid = false;
        
        // Mínimo una mayúscula
        const uppercaseValid = /[A-Z]/.test(password);
        updateRequirement(reqUppercase, uppercaseValid, "Mínimo una (1) mayúscula");
        if (!uppercaseValid) allValid = false;
        
        // Mínimo un carácter especial
        const specialValid = /[?@/!#$%&*]/.test(password);
        updateRequirement(reqSpecial, specialValid, "Mínimo un (1) carácter especial (? @ / ! # $ % & *)");
        if (!specialValid) allValid = false;
        
        return allValid;
    }
    
    // Validar formulario completo
    function validateForm() {
        if (!codeInput || !nameInput || !lastNameInput || !emailInput || !passwordInput) {
            console.error('Elementos del formulario no encontrados');
            return false;
        }
        
        const code = codeInput.value.trim();
        const name = nameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validaciones
        const codeValid = code.startsWith('U') && code.length >= 2;
        const nameValid = name.length >= 2;
        const lastNameValid = lastName.length >= 2;
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const passwordValid = validatePassword();
        
        const isValid = codeValid && nameValid && lastNameValid && emailValid && passwordValid;
        
        // Actualizar botón y mensaje
        if (submitButton) {
            submitButton.disabled = !isValid;
        }
        
        if (messageElement) {
            if (isValid) {
                messageElement.textContent = '✅ ¡Formulario válido! Puedes registrarte.';
                messageElement.style.color = '#28a745';
            } else {
                messageElement.style.color = '#dc3545';
                
                if (!codeValid && code) {
                    messageElement.textContent = '❌ El código debe comenzar con "U" seguido de números.';
                } else if (!nameValid && name) {
                    messageElement.textContent = '❌ El nombre debe tener al menos 2 caracteres.';
                } else if (!lastNameValid && lastName) {
                    messageElement.textContent = '❌ El apellido debe tener al menos 2 caracteres.';
                } else if (!emailValid && email) {
                    messageElement.textContent = '❌ Ingresa un correo electrónico válido.';
                } else {
                    messageElement.textContent = '';
                }
            }
        }
        
        return isValid;
    }
    
    // Event listeners para validación en tiempo real
    if (codeInput) codeInput.addEventListener('input', validateForm);
    if (nameInput) nameInput.addEventListener('input', validateForm);
    if (lastNameInput) lastNameInput.addEventListener('input', validateForm);
    if (emailInput) emailInput.addEventListener('input', validateForm);
    if (passwordInput) passwordInput.addEventListener('input', validateForm);
    
    // Manejar envío del formulario
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('=== ENVIANDO FORMULARIO ===');
            
            if (!validateForm()) {
                console.log('Formulario no válido');
                return;
            }
            
            // Obtener valores
            const code = codeInput.value.trim();
            const name = nameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const address = addressInput ? addressInput.value.trim() : '';
            
            console.log('Valores del formulario:', {
                code, name, lastName, email, 
                password: password ? '[PRESENTE]' : '[VACÍO]',
                phone, address
            });
            
            // Crear objeto de datos
            const userData = {
                codigo: code,
                nombre: name,
                apellido: lastName,
                correo: email,
                contrasena: password,
                telefono: phone,
                direccion: address
            };
            
            console.log('Datos a enviar:', userData);
            
            // Deshabilitar botón
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = '⏳ Registrando...';
            }
            
            if (messageElement) {
                messageElement.textContent = '📡 Conectando con el servidor...';
                messageElement.style.color = '#007bff';
            }
            
            try {
                const response = await fetch('/api/registro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData)
                });
                
                console.log('Respuesta del servidor:', response.status);
                
                const result = await response.json();
                console.log('Resultado:', result);
                
                if (response.ok) {
                    if (messageElement) {
                        messageElement.textContent = '🎉 ¡Registro exitoso! Redirigiendo...';
                        messageElement.style.color = '#28a745';
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    if (messageElement) {
                        messageElement.textContent = `❌ Error: ${result.error}`;
                        messageElement.style.color = '#dc3545';
                    }
                    
                    // Rehabilitar botón
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = '🎉 Registrar Cuenta 🎉';
                    }
                }
            } catch (error) {
                console.error('Error de conexión:', error);
                
                if (messageElement) {
                    messageElement.textContent = '❌ Error de conexión. Intenta nuevamente.';
                    messageElement.style.color = '#dc3545';
                }
                
                // Rehabilitar botón
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = '🎉 Registrar Cuenta 🎉';
                }
            }
        });
    }
    
    // Validación inicial
    setTimeout(validateForm, 100);
    
    console.log('=== REGISTRO FIX INICIALIZADO ===');
});