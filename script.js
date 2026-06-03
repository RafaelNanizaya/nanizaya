```javascript
document
.getElementById("formContato")
.addEventListener("submit", function(event){

    event.preventDefault();

    const nome =
    document.getElementById("nome").value.trim();

    const email =
    document.getElementById("email").value.trim();

    const servico =
    document.getElementById("servico").value;

    const mensagem =
    document.getElementById("mensagem").value.trim();

    if(nome.length < 3){
        alert("Digite um nome válido.");
        return;
    }

    if(!email.includes("@")){
        alert("Digite um email válido.");
        return;
    }

    if(servico === ""){
        alert("Selecione um serviço.");
        return;
    }

    if(mensagem.length < 10){
        alert("Descreva melhor sua necessidade.");
        return;
    }

    alert("Mensagem enviada com sucesso!");
});
```
