// ============================================
// INICIALIZAÇÃO E CONFIGURAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar AOS
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100
    });

    // Inicializar Swiper para depoimentos
    initTestimonialsSwiper();

    // Configurar eventos
    setupNavbarScroll();
    setupFormValidation();
    setupSmoothScroll();
});

// ============================================
// NAVBAR COM SCROLL EFFECT
// ============================================

function setupNavbarScroll() {
    const navbarSection = document.querySelector('.navbar-section');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 50) {
            navbarSection.classList.add('scrolled');
        } else {
            navbarSection.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // Atualizar link ativo ao rolar
    updateActiveNavLink();
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// ============================================
// SMOOTH SCROLL
// ============================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Fechar menu mobile se aberto
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                    const navbarToggler = document.querySelector('.navbar-toggler');
                    navbarToggler.click();
                }
            }
        });
    });
}

// ============================================
// SWIPER - DEPOIMENTOS
// ============================================

function initTestimonialsSwiper() {
    const swiper = new Swiper('.testimonials-swiper', {
        slidesPerView: 1,
        spaceBetween: 30,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true
        },
        autoplay: {
            delay: 5000,
            disableOnInteraction: false
        },
        breakpoints: {
            768: {
                slidesPerView: 2,
                spaceBetween: 30
            },
            1024: {
                slidesPerView: 1,
                spaceBetween: 30
            }
        }
    });
}

// ============================================
// VALIDAÇÃO E ENVIO DE FORMULÁRIO
// ============================================

function setupFormValidation() {
    const form = document.getElementById('contact-form');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Limpar mensagens de erro anteriores
            clearErrorMessages();

            // Validar campos
            const isValid = validateForm();

            if (isValid) {
                submitForm(form);
            }
        });

        // Validação em tempo real
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });

            input.addEventListener('focus', () => {
                clearFieldError(input);
            });
        });
    }
}

function validateForm() {
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const subject = document.getElementById('subject');
    const message = document.getElementById('message');

    let isValid = true;

    // Validar Nome
    if (!name.value.trim()) {
        showFieldError(name, 'Por favor, preencha seu nome.');
        isValid = false;
    } else if (name.value.trim().length < 3) {
        showFieldError(name, 'O nome deve ter pelo menos 3 caracteres.');
        isValid = false;
    }

    // Validar Email
    if (!email.value.trim()) {
        showFieldError(email, 'Por favor, preencha seu email.');
        isValid = false;
    } else if (!validateEmail(email.value.trim())) {
        showFieldError(email, 'Por favor, insira um email válido.');
        isValid = false;
    }

    // Validar Assunto
    if (!subject.value.trim()) {
        showFieldError(subject, 'Por favor, preencha o assunto.');
        isValid = false;
    }

    // Validar Mensagem
    if (!message.value.trim()) {
        showFieldError(message, 'Por favor, preencha sua mensagem.');
        isValid = false;
    } else if (message.value.trim().length < 10) {
        showFieldError(message, 'A mensagem deve ter pelo menos 10 caracteres.');
        isValid = false;
    }

    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldId = field.id;

    if (fieldId === 'name') {
        if (!value) {
            showFieldError(field, 'Por favor, preencha seu nome.');
        } else if (value.length < 3) {
            showFieldError(field, 'O nome deve ter pelo menos 3 caracteres.');
        }
    } else if (fieldId === 'email') {
        if (!value) {
            showFieldError(field, 'Por favor, preencha seu email.');
        } else if (!validateEmail(value)) {
            showFieldError(field, 'Por favor, insira um email válido.');
        }
    } else if (fieldId === 'subject') {
        if (!value) {
            showFieldError(field, 'Por favor, preencha o assunto.');
        }
    } else if (fieldId === 'message') {
        if (!value) {
            showFieldError(field, 'Por favor, preencha sua mensagem.');
        } else if (value.length < 10) {
            showFieldError(field, 'A mensagem deve ter pelo menos 10 caracteres.');
        }
    }
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
    }
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) {
        errorElement.classList.add('d-none');
    }
}

function clearErrorMessages() {
    const errorElements = document.querySelectorAll('[id$="-error"]');
    errorElements.forEach(el => {
        el.classList.add('d-none');
    });

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });
}

function submitForm(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const formMessage = document.getElementById('form-message');

    // Desabilitar botão durante envio
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    // Simular envio (em produção, fazer requisição AJAX)
    setTimeout(() => {
        // Mostrar mensagem de sucesso
        formMessage.textContent = '✓ Mensagem enviada com sucesso! Entraremos em contato em breve.';
        formMessage.classList.remove('d-none', 'error');
        formMessage.classList.add('success');

        // Limpar formulário
        form.reset();

        // Reabilitar botão
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Mensagem';

        // Limpar mensagem após 5 segundos
        setTimeout(() => {
            formMessage.classList.add('d-none');
        }, 5000);

        // Scroll para mensagem
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1500);
}

// ============================================
// UTILITÁRIOS
// ============================================

// Adicionar estilos CSS para validação
function addValidationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .form-control.is-invalid {
            border-color: #EF4444;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='12 12 24 24'%3e%3ccircle cx='24' cy='24' r='11' fill='none' stroke='%23EF4444' stroke-width='2'/%3e%3cpath fill='%23EF4444' d='M24 16v8m0 4v.01'/%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right calc(0.375em + 0.1875rem) center;
            background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            padding-right: calc(1.5em + 0.75rem);
        }

        .form-control.is-valid {
            border-color: #10B981;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2310B981' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right calc(0.375em + 0.1875rem) center;
            background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            padding-right: calc(1.5em + 0.75rem);
        }
    `;
    document.head.appendChild(style);
}

// Chamar função para adicionar estilos
addValidationStyles();

// ============================================
// ANIMAÇÕES ADICIONAIS
// ============================================

// Animar números de estatísticas
function animateNumbers() {
    const stats = document.querySelectorAll('.stat-number');

    stats.forEach(stat => {
        const target = parseInt(stat.textContent);
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                stat.textContent = target + '+';
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current) + '+';
            }
        }, 16);
    });
}

// Chamar animação quando seção estiver visível
const observerOptions = {
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.classList.contains('about-section')) {
            animateNumbers();
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

const aboutSection = document.querySelector('.about-section');
if (aboutSection) {
    observer.observe(aboutSection);
}

// ============================================
// PERFORMANCE E OTIMIZAÇÕES
// ============================================

// Lazy loading de imagens (se suportado)
if ('IntersectionObserver' in window) {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ============================================
// ACESSIBILIDADE
// ============================================

// Melhorar navegação por teclado
document.addEventListener('keydown', (e) => {
    // Tecla Escape para fechar menu mobile
    if (e.key === 'Escape') {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const navbarToggler = document.querySelector('.navbar-toggler');
            navbarToggler.click();
        }
    }
});

// ============================================
// CONSOLE LOG PARA DEBUG
// ============================================

console.log('Lumina Digital - Site redesignado com sucesso!');
console.log('Versão: 2.0');
console.log('Tecnologias: Bootstrap 5, AOS, Swiper, Font Awesome');
