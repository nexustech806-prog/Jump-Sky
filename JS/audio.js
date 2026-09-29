// ========================================
// SISTEMA GLOBAL DE ÁUDIO - JUMP SKY
// ========================================

const SOUND_STORAGE_KEY = "soundEnabled";


// ========================================
// CAMINHOS DOS EFEITOS SONOROS
// ========================================

const gameSounds = {
    correct: new Audio("/audio/correct.mp3"),
    wrong: new Audio("/audio/wrong.mp3"),
    complete: new Audio("/audio/complete.mp3"),
    timeout: new Audio("/audio/timeout.mp3"),
    record: new Audio("/audio/record.mp3")
};


// ========================================
// CONFIGURAÇÕES DOS SONS
// ========================================

Object.values(gameSounds).forEach(sound => {
    sound.preload = "auto";
    sound.volume = 0.6;
});


// ========================================
// VERIFICA SE O SOM ESTÁ ATIVADO
// ========================================

function isSoundEnabled() {
    const savedPreference =
        localStorage.getItem(
            SOUND_STORAGE_KEY
        );

    // Se nunca foi configurado,
    // o som começa ativado.
    if (savedPreference === null) {
        return true;
    }

    return savedPreference === "true";
}


// ========================================
// SALVA A PREFERÊNCIA
// ========================================

function setSoundEnabled(enabled) {
    localStorage.setItem(
        SOUND_STORAGE_KEY,
        String(enabled)
    );

    updateSoundButton();
}


// ========================================
// LIGA / DESLIGA
// ========================================

function toggleSound() {
    const newState =
        !isSoundEnabled();

    setSoundEnabled(newState);

    /*
        Se acabou de desligar o som,
        interrompe qualquer efeito
        que possa estar tocando.
    */

    if (!newState) {
        stopAllSounds();
    }
}


// ========================================
// TOCA UM EFEITO
// ========================================

function playSound(soundName) {

    if (!isSoundEnabled()) {
        return;
    }

    const sound =
        gameSounds[soundName];

    if (!sound) {
        console.warn(
            `Som não encontrado: ${soundName}`
        );

        return;
    }

    /*
        Volta ao início para permitir
        tocar o mesmo efeito várias vezes.
    */

    sound.currentTime = 0;

    sound.play().catch(error => {

        /*
            Alguns navegadores bloqueiam áudio
            antes da primeira interação do usuário.

            Não interrompe o funcionamento do jogo.
        */

        console.warn(
            "Não foi possível reproduzir o som:",
            error
        );

    });
}


// ========================================
// PARA TODOS OS SONS
// ========================================

function stopAllSounds() {

    Object.values(
        gameSounds
    ).forEach(sound => {

        sound.pause();

        sound.currentTime = 0;

    });
}


// ========================================
// ATUALIZA BOTÃO DO MENU
// ========================================

function updateSoundButton() {

    const toggleSom =
        document.getElementById(
            "toggleSom"
        );

    if (!toggleSom) {
        return;
    }

    const enabled =
        isSoundEnabled();

    toggleSom.textContent =
        enabled
            ? "🔊"
            : "🔇";

    toggleSom.title =
        enabled
            ? "Desativar efeitos sonoros"
            : "Ativar efeitos sonoros";

    toggleSom.setAttribute(
        "aria-label",
        enabled
            ? "Desativar efeitos sonoros"
            : "Ativar efeitos sonoros"
    );
}


// ========================================
// BOTÃO DO MENU
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateSoundButton();

        const toggleSom =
            document.getElementById(
                "toggleSom"
            );

        if (toggleSom) {

            toggleSom.addEventListener(
                "click",
                toggleSound
            );

        }

    }
);
// ========================================
// CONFIGURAÇÕES DENTRO DAS FASES
// ========================================

function updateGameSoundButton() {

    const button =
        document.getElementById(
            "gameSoundToggle"
        );

    if (!button) {
        return;
    }

    const enabled =
        isSoundEnabled();

    button.textContent =
        enabled
            ? "🔊 Ligado"
            : "🔇 Desligado";

    button.setAttribute(
        "aria-pressed",
        String(enabled)
    );
}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const settingsBtn =
            document.getElementById(
                "settingsBtn"
            );

        const settingsPanel =
            document.getElementById(
                "settingsPanel"
            );

        const gameSoundToggle =
            document.getElementById(
                "gameSoundToggle"
            );

        // Abrir / fechar configurações
        if (
            settingsBtn &&
            settingsPanel
        ) {

            settingsBtn.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    settingsPanel.classList.toggle(
                        "show"
                    );

                }
            );

            settingsPanel.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );

            // Fecha ao clicar fora
            document.addEventListener(
                "click",
                () => {

                    settingsPanel.classList.remove(
                        "show"
                    );

                }
            );

        }

        // Botão de som dentro da fase
        if (gameSoundToggle) {

            updateGameSoundButton();

            gameSoundToggle.addEventListener(
                "click",
                () => {

                    toggleSound();

                    updateGameSoundButton();

                }
            );

        }

    }
);