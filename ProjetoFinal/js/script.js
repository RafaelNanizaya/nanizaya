// Form validation
document.getElementById('formContato').addEventListener('submit', function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const servico = document.getElementById('servico').value;
    const mensagem = document.getElementById('mensagem').value.trim();

    // Reset error messages
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    let valid = true;

    if (nome === '') {
        document.getElementById('nomeError').textContent = 'Nome é obrigatório';
        valid = false;
    }

    if (email === '') {
        document.getElementById('emailError').textContent = 'Email é obrigatório';
        valid = false;
    } else if (!email.includes('@')) {
        document.getElementById('emailError').textContent = 'Email inválido';
        valid = false;
    }

    if (servico === '') {
        document.getElementById('servicoError').textContent = 'Selecione um serviço';
        valid = false;
    }

    if (mensagem === '') {
        document.getElementById('mensagemError').textContent = 'Mensagem é obrigatória';
        valid = false;
    }

    if (valid) {
        // Show success message
        alert('Mensagem enviada com sucesso!');
        this.reset();
    }
});

// Mobile menu toggle (if needed in future)
// For now, simple smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});