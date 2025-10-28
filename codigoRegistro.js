document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('registerUsername');
    const passwordInput = document.getElementById('registerPassword');
    const toggleIcon = document.getElementById('registerTogglePassword');
    const submitButton = document.getElementById('registerButton');
    const messageElement = document.getElementById('registerMessage');
    
    const reqLength = document.getElementById('reqLength');
    const reqDigit = document.getElementById('reqDigit');
    const reqUppercase = document.getElementById('reqUppercase');
    const reqSpecial = document.getElementById('reqSpecial');

    // Validar formato de usuario
    const validateUsername = () => {
        const username = usernameInput.value.trim();
        const usernamePattern = /^[UT]\d+$/;
        return usernamePattern.test(username);
    };

    const validatePassword = () => {
        const password = passwordInput.value;
        let allValid = true;

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
        
        return allValid;
    };

    const validateForm = () => {
        const usernameValid = validateUsername();
        const passwordValid = validatePassword();
        
        if (usernameValid && passwordValid) {
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            messageElement.textContent = '✅ ¡Formulario válido! Puedes registrarte.';
            messageElement.style.color = '#27ae60';
        } else {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
            if (!usernameValid && usernameInput.value.trim()) {
                messageElement.textContent = '❌ El código de usuario debe empezar con U o T seguido de números.';
                messageElement.style.color = '#e74c3c';
            } else {
                messageElement.textContent = '';
            }
        }
    };
    
    const updateRequirement = (element, isValid, text) => {
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
            element.innerHTML = `✔️ ${text}`;
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
            element.innerHTML = `❌ ${text}`;
        }
    };
    
    // Toggle para mostrar/ocultar contraseña
    toggleIcon.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleIcon.textContent = type === 'password' ? '👁️' : '🔒'; 
    });
    
    // Event listeners para validación en tiempo real
    usernameInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', validateForm);
    
    // Función global para validación externa
    window.validateRegistrationPassword = () => {
        return validatePassword();
    };

    // Manejo del envío del formulario
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!validateUsername()) {
            messageElement.textContent = '❌ Formato de usuario inválido. Debe ser U o T seguido de números.';
            messageElement.style.color = '#e74c3c';
            return;
        }
        
        if (!validatePassword()) {
            messageElement.textContent = '❌ La contraseña no cumple todos los requisitos.';
            messageElement.style.color = '#e74c3c';
            return;
        }

        // Simular registro exitoso
        messageElement.textContent = '🎉 ¡Registro exitoso! Redirigiendo...';
        messageElement.style.color = '#27ae60';
        
        // Guardar usuario en localStorage (simulación)
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        
        // Verificar si el usuario ya existe
        if (users.find(user => user.username === username)) {
            messageElement.textContent = '❌ Este código de usuario ya está registrado.';
            messageElement.style.color = '#e74c3c';
            return;
        }
        
        // Agregar nuevo usuario
        users.push({
            username: username,
            password: password,
            registeredAt: new Date().toISOString()
        });
        
        localStorage.setItem('registeredUsers', JSON.stringify(users));
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    });

    // Validación inicial
    validateForm();
});