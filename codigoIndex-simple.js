document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        return;
    }

    const accounts = {
        "U23201604": { password: "Usuario123", role: "user" },
        "T20137912": { password: "Tecnico456", role: "tech" }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const errorMessage = document.getElementById('errorMessage');
        
        if (!usernameInput || !passwordInput) {
            return;
        }

        const username = usernameInput.value.trim().toUpperCase();
        const password = passwordInput.value;
        const account = accounts[username];

        if (account && account.password === password) {
            let redirectPage = '';
            if (account.role === 'user') {
                redirectPage = 'catalogo.html';
            } else if (account.role === 'tech') {
                redirectPage = 'Interno.html';
            }
            
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            alert(`¡Bienvenido ${account.role}! Redirigiendo a ${redirectPage}`);
            window.location.href = redirectPage;
            
        } else {
            if (errorMessage) {
                errorMessage.textContent = 'Código o contraseña incorrectos.';
                errorMessage.style.display = 'block';
            }
        }
    });
});