document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('menu-toggle'), menu = document.getElementById('mobile-menu'), form = document.getElementById('contact-form');
    toggle.onclick = () => menu.classList.toggle('hidden');
    menu.onclick = () => menu.classList.add('hidden');
    form.onsubmit = (e) => {
        e.preventDefault();
        let valid = true;
        ['name', 'email', 'message'].forEach(id => {
            const el = document.getElementById(id), err = document.getElementById(id + '-error'), val = el.value.trim();
            const isEmail = id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
            const isEmpty = val === "";
            if (isEmpty || isEmail) {
                el.classList.add('border-red-500'); err.classList.remove('hidden'); valid = false;
            } else {
                el.classList.remove('border-red-500'); err.classList.add('hidden');
            }
        });
        if (valid) {
            form.innerHTML = '<div class="text-green-600 font-bold p-4">Mensagem enviada com sucesso!</div>';
        }
    };
});
