// ========================================
// SISTEMA GLOBAL DE ÁUDIO - JUMP SKY
// ========================================

const SOUND_STORAGE_KEY = "soundEnabled";
const VOLUME_STORAGE_KEY = "soundVolume";

const DEFAULT_VOLUME = 0.6;


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
// VOLUME
// ========================================

function getSoundVolume() {

    const savedVolume =
        localStorage.getItem(
            VOLUME_STORAGE_KEY
        );

    if (savedVolume === null) {
        return DEFAULT_VOLUME;
    }

    const volume =
        Number(savedVolume);

    if (
        Number.isNaN(volume) ||
        volume < 0 ||
        volume > 1
    ) {
        return DEFAULT_VOLUME;
    }

    return volume;
}


function setSoundVolume(volume) {

    const normalizedVolume =
        Math.max(
            0,
            Math.min(1, volume)
        );

    localStorage.setItem(
        VOLUME_STORAGE_KEY,
        String(normalizedVolume)
    );

    Object.values(gameSounds).forEach(
        sound => {

            sound.volume =
                normalizedVolume;

        }
    );

    updateVolumeControl();
}


// ========================================
// CONFIGURAÇÕES DOS SONS
// ========================================

Object.values(gameSounds).forEach(
    sound => {

        sound.preload = "auto";

        sound.volume =
            getSoundVolume();

    }
);


// ========================================
// VERIFICA SE O SOM ESTÁ ATIVADO
// ========================================

function isSoundEnabled() {

    const savedPreference =
        localStorage.getItem(
            SOUND_STORAGE_KEY
        );

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
    updateGameSoundButton();
    updateAccessibilityCheckbox();
}


// ========================================
// LIGA / DESLIGA
// ========================================

function toggleSound() {

    const newState =
        !isSoundEnabled();

    setSoundEnabled(newState);

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

    sound.volume =
        getSoundVolume();

    sound.currentTime = 0;

    sound.play().catch(
        error => {

            console.warn(
                "Não foi possível reproduzir o som:",
                error
            );

        }
    );
}


// ========================================
// PARA TODOS OS SONS
// ========================================

function stopAllSounds() {

    Object.values(gameSounds).forEach(
        sound => {

            sound.pause();

            sound.currentTime = 0;

        }
    );
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
// ATUALIZA BOTÃO DE SOM DAS FASES
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


// ========================================
// SINCRONIZA O CHECKBOX DA TELA DE ACESSIBILIDADE
// ========================================

function updateAccessibilityCheckbox() {

    const checkbox =
        document.getElementById(
            "feedbackSonoro"
        );

    if (!checkbox) {
        return;
    }

    checkbox.checked =
        isSoundEnabled();
}


// ========================================
// ATUALIZA CONTROLE DE VOLUME
// ========================================

function updateVolumeControl() {

    const volumeSlider =
        document.getElementById(
            "volumeSlider"
        );

    const volumeValue =
        document.getElementById(
            "volumeValue"
        );

    if (
        !volumeSlider ||
        !volumeValue
    ) {
        return;
    }

    const volume =
        getSoundVolume();

    const percentage =
        Math.round(
            volume * 100
        );

    volumeSlider.value =
        percentage;

    volumeValue.textContent =
        `${percentage}%`;
}


// ========================================
// INICIALIZA CONTROLES
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateSoundButton();
        updateAccessibilityCheckbox();

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


            document.addEventListener(
                "click",
                () => {

                    settingsPanel.classList.remove(
                        "show"
                    );

                }
            );

        }


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


        const volumeSlider =
            document.getElementById(
                "volumeSlider"
            );

        if (volumeSlider) {

            updateVolumeControl();

            volumeSlider.addEventListener(
                "input",
                () => {

                    const volume =
                        Number(
                            volumeSlider.value
                        ) / 100;

                    setSoundVolume(
                        volume
                    );

                }
            );

        }

    }
);