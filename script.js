document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-list li a');
    const contactForm = document.getElementById('contact-form');

    // Toggle mobile menu
    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
        });
    });

    // Form validation and submission
    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            let isValid = true;

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');

            // Simple validation for name
            if (nameInput && nameInput.value.trim() === '') {
                alert('Por favor, preencha seu nome.');
                isValid = false;
            }

            // Simple validation for email
            if (emailInput && (emailInput.value.trim() === '' || !validateEmail(emailInput.value.trim()))) {
                alert('Por favor, insira um e-mail válido.');
                isValid = false;
            }

            // Simple validation for message
            if (messageInput && messageInput.value.trim() === '') {
                alert('Por favor, preencha sua mensagem.');
                isValid = false;
            }

            if (isValid) {
                alert('Mensagem enviada com sucesso!');
                contactForm.reset();
            }
        });
    }

    function validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
});
