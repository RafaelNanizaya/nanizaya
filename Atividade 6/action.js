function validaCampos() {

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const cpf = document.getElementById("cpf").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    const sexoSelecionado =
        document.querySelector('input[name="sexo"]:checked');

    if (nome.length <= 2 || nome.length > 100) {
        alert("Nome deve ter entre 3 e 100 caracteres.");
        document.getElementById("nome").focus();
        return false;
    }

    if (email.length <= 10 || email.length > 100) {
        alert("E-mail deve ter entre 11 e 100 caracteres.");
        document.getElementById("email").focus();
        return false;
    }

    if (!validarCPF(cpf)) {
        alert("CPF inválido.");
        document.getElementById("cpf").focus();
        return false;
    }

    if (!sexoSelecionado) {
        alert("Selecione um sexo.");
        return false;
    }

    if (telefone.length !== 11 || isNaN(telefone)) {
        alert("Telefone deve conter exatamente 11 números.");
        document.getElementById("telefone").focus();
        return false;
    }

    alert("✅ Formulário enviado com sucesso!");
    return true;
}

function validarCPF(cpf) {

    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf))
        return false;

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11)
        resto = 0;

    if (resto !== parseInt(cpf.substring(9, 10)))
        return false;

    soma = 0;

    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11)
        resto = 0;

    return resto === parseInt(cpf.substring(10, 11));
}