// ===== EFECTOS Y ANIMACIONES PARA LAS GEMELAS =====

// Animación de carga de página
document.addEventListener('DOMContentLoaded', function() {
    // Agregar clase de animación a elementos
    const elementos = document.querySelectorAll('.fade-in-up');
    elementos.forEach((elemento, index) => {
        elemento.style.animationDelay = `${index * 0.2}s`;
    });

    // Efecto de partículas en hover para las tarjetas
    const tarjetas = document.querySelectorAll('.card');
    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        tarjeta.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Efecto de brillo en botones
    const botones = document.querySelectorAll('.btn-primary-custom');
    botones.forEach(boton => {
        boton.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 20px rgba(255, 107, 157, 0.5)';
        });
        
        boton.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
        });
    });

    // Animación del logo
    const logo = document.querySelector('.logo-principal');
    if (logo) {
        setInterval(() => {
            logo.style.transform = 'scale(1.05)';
            setTimeout(() => {
                logo.style.transform = 'scale(1)';
            }, 200);
        }, 3000);
    }

    // Efecto de confeti virtual (solo visual)
    function crearConfeti() {
        const confeti = document.createElement('div');
        confeti.innerHTML = ['🎭', '✨', '🎪', '🎨', '🌟'][Math.floor(Math.random() * 5)];
        confeti.style.position = 'fixed';
        confeti.style.left = Math.random() * 100 + 'vw';
        confeti.style.top = '-50px';
        confeti.style.fontSize = '20px';
        confeti.style.pointerEvents = 'none';
        confeti.style.zIndex = '1000';
        confeti.style.animation = 'caerConfeti 3s linear forwards';
        
        document.body.appendChild(confeti);
        
        setTimeout(() => {
            confeti.remove();
        }, 3000);
    }

    // Agregar animación CSS para el confeti
    const style = document.createElement('style');
    style.textContent = `
        @keyframes caerConfeti {
            to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Crear confeti ocasionalmente
    setInterval(crearConfeti, 5000);
});

// Mejorar el toggle de contraseña
document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Cambiar el icono
            this.textContent = type === 'password' ? '👁️' : '🙈';
            
            // Efecto de animación
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
});

// Efecto de hover mejorado para navegación
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Animación suave para el scroll
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll para enlaces internos
    const enlaces = document.querySelectorAll('a[href^="#"]');
    
    enlaces.forEach(enlace => {
        enlace.addEventListener('click', function(e) {
            e.preventDefault();
            const destino = document.querySelector(this.getAttribute('href'));
            if (destino) {
                destino.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Efecto de typing para el slogan (opcional)
function efectoTyping(elemento, texto, velocidad = 100) {
    let i = 0;
    elemento.innerHTML = '';
    
    function escribir() {
        if (i < texto.length) {
            elemento.innerHTML += texto.charAt(i);
            i++;
            setTimeout(escribir, velocidad);
        }
    }
    
    escribir();
}

// Validación visual mejorada para formularios
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.borderColor = 'var(--color-primario)';
            this.style.boxShadow = '0 0 0 0.2rem rgba(255, 107, 157, 0.25)';
        });
        
        input.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                this.style.borderColor = '#dee2e6';
                this.style.boxShadow = 'none';
            } else {
                this.style.borderColor = 'var(--color-secundario)';
                this.style.boxShadow = '0 0 0 0.2rem rgba(78, 205, 196, 0.25)';
            }
        });
    });
});
// ===== CARRUSEL DE IMÁGENES =====
document.addEventListener('DOMContentLoaded', function() {
    const carouselTrack = document.querySelector('.carousel-track');
    const slides = document.querySelectorAll('.slide');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    const carouselContainer = document.querySelector('.carousel-container');
    
    if (!carouselTrack || !slides.length) {
        console.log('Carrusel no encontrado o sin imágenes');
        return;
    }
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoPlayInterval;
    
    console.log(`Carrusel inicializado con ${totalSlides} imágenes`);
    
    // Crear indicadores
    const indicatorsContainer = document.createElement('div');
    indicatorsContainer.className = 'carousel-indicators';
    indicatorsContainer.style.cssText = `
        position: absolute;
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 10;
    `;
    
    for (let i = 0; i < totalSlides; i++) {
        const indicator = document.createElement('div');
        indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
        indicator.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${i === 0 ? 'white' : 'rgba(255, 255, 255, 0.5)'};
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        indicator.addEventListener('click', () => goToSlide(i));
        indicatorsContainer.appendChild(indicator);
    }
    
    if (carouselContainer) {
        carouselContainer.appendChild(indicatorsContainer);
    }
    
    function updateCarousel() {
        const translateX = -currentSlide * 100;
        carouselTrack.style.transform = `translateX(${translateX}%)`;
        
        // Actualizar indicadores
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            if (index === currentSlide) {
                indicator.style.background = 'white';
                indicator.style.transform = 'scale(1.2)';
            } else {
                indicator.style.background = 'rgba(255, 255, 255, 0.5)';
                indicator.style.transform = 'scale(1)';
            }
        });
        
        console.log(`Mostrando slide ${currentSlide + 1} de ${totalSlides}`);
    }
    
    function goToSlide(slideIndex) {
        currentSlide = slideIndex;
        updateCarousel();
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }
    
    // Event listeners para botones
    if (nextButton) {
        nextButton.addEventListener('click', nextSlide);
        console.log('Botón siguiente configurado');
    }
    if (prevButton) {
        prevButton.addEventListener('click', prevSlide);
        console.log('Botón anterior configurado');
    }
    
    // Funciones de auto-play
    function startAutoPlay() {
        stopAutoPlay(); // Limpiar cualquier intervalo existente
        autoPlayInterval = setInterval(nextSlide, 4000);
        console.log('Auto-play iniciado');
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            console.log('Auto-play detenido');
        }
    }
    
    // Pausar auto-play al hacer hover
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoPlay);
        carouselContainer.addEventListener('mouseleave', startAutoPlay);
    }
    
    // Inicializar carrusel
    updateCarousel();
    startAutoPlay();
    
    console.log('Carrusel completamente inicializado');
});