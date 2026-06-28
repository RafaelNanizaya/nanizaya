document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 800,
        once: true
    });

    window.addEventListener('scroll', () => {
        document.querySelector('.navbar-section').classList.toggle('scrolled', window.scrollY > 50);
    });

    document.getElementById('contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const res = document.getElementById('form-res');
        res.textContent = '✓ Mensagem enviada!';
        res.className = 'mt-3 alert alert-success';
        res.classList.remove('d-none');
        e.target.reset();
    });
});
