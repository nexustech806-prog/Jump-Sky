const avatares = document.querySelectorAll(".avatar");
const continuarBtn = document.getElementById("continuar");
const mensagem = document.getElementById("mensagem");

let avatarSelecionado = null;

avatares.forEach((avatar) => {
    avatar.addEventListener("click", () => {

        // Remove a seleção de todos
        avatares.forEach((item) => {
            item.classList.remove("selecionado");
        });

        // Seleciona apenas o clicado
        avatar.classList.add("selecionado");

        avatarSelecionado = avatar.dataset.avatar;

        continuarBtn.disabled = false;
        mensagem.textContent = "Avatar selecionado!";
    });
});

continuarBtn.addEventListener("click", () => {
    if (!avatarSelecionado) return;

    localStorage.setItem("avatarSelecionado", avatarSelecionado);

    console.log("Avatar salvo:", avatarSelecionado);

    window.location.href = "/registrar"; 
});