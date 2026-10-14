// Som geral preserva a preferência antiga. Cada canal tem volume e mute próprios.
const audioChannels = ['music', 'effects'];
const channelLabels = { music: 'Música', effects: 'Efeitos sonoros' };
const audioMemory = new Map();
function readAudioSetting(key) {
    try { return localStorage.getItem(key); } catch { return audioMemory.get(key) ?? null; }
}
function saveAudioSetting(key, value) {
    audioMemory.set(key, String(value));
    try { localStorage.setItem(key, String(value)); } catch { /* Preferência vale nesta página. */ }
}
function safeVolume(value, fallback) {
    return value !== null && Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
}
function isSoundEnabled() { return readAudioSetting('soundEnabled') !== 'false'; }
function getChannelEnabled(channel) {
    if (channel === 'voice') return true; // Narração controlada pelo botão ouvir/parar.
    const saved = readAudioSetting(channel + 'Enabled');
    return saved === null ? (channel !== 'effects' || readAudioSetting('feedbackSonoro') !== 'false') : saved !== 'false';
}
function getChannelVolume(channel) {
    if (channel === 'voice') return 0.8; // Volume fixo; ignora ajustes antigos de narração.
    const legacy = safeVolume(readAudioSetting('soundVolume'), 0.6);
    return safeVolume(readAudioSetting(channel + 'Volume'), channel === 'music' ? legacy * 0.25 : legacy);
}
function canPlayChannel(channel) {
    return isSoundEnabled() && getChannelEnabled(channel) && getChannelVolume(channel) > 0 && !document.hidden;
}
function setSoundEnabled(enabled) { saveAudioSetting('soundEnabled', Boolean(enabled)); applyAudioSettings(); }
function toggleSound() { setSoundEnabled(!isSoundEnabled()); }
function setChannelEnabled(channel, enabled) { saveAudioSetting(channel + 'Enabled', Boolean(enabled)); applyAudioSettings(); }
function setChannelVolume(channel, volume) { saveAudioSetting(channel + 'Volume', safeVolume(volume, getChannelVolume(channel))); applyAudioSettings(); }
// Compatibilidade com chamadas existentes: volume de efeitos.
function getSoundVolume() { return getChannelVolume('effects'); }
function setSoundVolume(volume) { setChannelVolume('effects', volume); }

const gameSounds = Object.fromEntries(['correct', 'wrong', 'complete', 'timeout', 'record'].map(name => [name, new Audio('/audio/' + name + '.mp3')]));
const backgroundMusic = new Audio('/audio/background.wav');
backgroundMusic.loop = true;
backgroundMusic.preload = 'auto';
const activeEffects = new Set();
const narrationSounds = new Set();
let musicRequested = false;
let musicPlayPending = false;
function updateMusicVolume() {
    const speaking = [...narrationSounds].some(sound => !sound.paused);
    backgroundMusic.volume = getChannelVolume('music') * (activeEffects.size || speaking ? 0.28 : 1);
}
function syncBackgroundMusic() {
    updateMusicVolume();
    if (!musicRequested || !canPlayChannel('music')) { backgroundMusic.pause(); return; }
    if (!backgroundMusic.paused || musicPlayPending) return;
    musicPlayPending = true;
    backgroundMusic.play().then(() => {
        if (!musicRequested || !canPlayChannel('music')) backgroundMusic.pause();
    }).catch(() => { /* Tentar novamente no próximo clique ou tecla. */ })
        .finally(() => { musicPlayPending = false; });
}
function startBackgroundMusic() { musicRequested = true; syncBackgroundMusic(); }
function stopBackgroundMusic() { musicRequested = false; backgroundMusic.pause(); backgroundMusic.currentTime = 0; }
function playSound(name) {
    const sound = gameSounds[name];
    if (!sound || !canPlayChannel('effects')) return;
    sound.volume = getChannelVolume('effects');
    sound.currentTime = 0;
    activeEffects.add(sound);
    updateMusicVolume();
    sound.play().then(() => { if (!canPlayChannel('effects')) sound.pause(); }).catch(() => {
        activeEffects.delete(sound); updateMusicVolume();
    });
}
Object.values(gameSounds).forEach(sound => {
    sound.preload = 'auto';
    ['pause', 'ended', 'error'].forEach(event => sound.addEventListener(event, () => {
        activeEffects.delete(sound); updateMusicVolume();
    }));
});
function registerNarration(sound) {
    narrationSounds.add(sound);
    ['play', 'pause', 'ended', 'error'].forEach(event => sound.addEventListener(event, updateMusicVolume));
    sound.volume = getChannelVolume('voice');
}
function stopAllSounds() {
    backgroundMusic.pause();
    [...Object.values(gameSounds), ...narrationSounds].forEach(sound => { sound.pause(); sound.currentTime = 0; });
    activeEffects.clear();
    updateMusicVolume();
}
function applyAudioSettings() {
    Object.values(gameSounds).forEach(sound => {
        sound.volume = getChannelVolume('effects');
        if (!canPlayChannel('effects')) sound.pause();
    });
    narrationSounds.forEach(sound => {
        sound.volume = getChannelVolume('voice');
        if (!canPlayChannel('voice')) sound.pause();
    });
    syncBackgroundMusic();
    updateAudioControls();
}
function updateAudioControls() {
    document.querySelectorAll('[data-audio-master]').forEach(button => {
        button.textContent = isSoundEnabled() ? 'Silenciar tudo' : 'Ativar som geral';
        button.setAttribute('aria-pressed', String(!isSoundEnabled()));
    });
    for (const channel of audioChannels) {
        document.querySelectorAll('[data-audio-toggle="' + channel + '"]').forEach(button => {
            button.textContent = getChannelEnabled(channel) ? 'Ligado' : 'Desligado';
            button.setAttribute('aria-pressed', String(getChannelEnabled(channel)));
        });
        document.querySelectorAll('[data-audio-volume="' + channel + '"]').forEach(input => { input.value = Math.round(getChannelVolume(channel) * 100); });
        document.querySelectorAll('[data-audio-value="' + channel + '"]').forEach(output => { output.textContent = Math.round(getChannelVolume(channel) * 100) + '%'; });
    }
    document.querySelectorAll('[data-audio-status]').forEach(el => {
        el.textContent = isSoundEnabled() ? '' : 'Som geral desligado. Ative-o para ouvir os canais ligados.';
    });
}
function updateAccessibilityCheckbox() { updateAudioControls(); }
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-audio-settings]').forEach((host, index) => {
        host.innerHTML = '<h3>Som</h3><button type="button" data-audio-master></button><p data-audio-status role="status"></p>' + audioChannels.map(channel => {
            const id = 'audio-' + index + '-' + channel;
            return '<div class="audio-channel"><label for="' + id + '">' + channelLabels[channel] + '</label>' +
                '<button type="button" data-audio-toggle="' + channel + '" aria-label="Ligar ou desligar ' + channelLabels[channel] + '"></button>' +
                '<input id="' + id + '" type="range" min="0" max="100" step="1" data-audio-volume="' + channel + '">' +
                '<output for="' + id + '" data-audio-value="' + channel + '"></output></div>';
        }).join('');
        host.querySelector('[data-audio-master]').addEventListener('click', toggleSound);
        host.querySelectorAll('[data-audio-toggle]').forEach(button => button.addEventListener('click', () => {
            const channel = button.dataset.audioToggle; setChannelEnabled(channel, !getChannelEnabled(channel));
        }));
        host.querySelectorAll('[data-audio-volume]').forEach(input => input.addEventListener('input', () => setChannelVolume(input.dataset.audioVolume, Number(input.value) / 100)));
    });
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn && settingsPanel) {
        settingsBtn.setAttribute('aria-expanded', 'false');
        settingsBtn.addEventListener('click', event => {
            event.stopPropagation();
            settingsPanel.classList.toggle('show');
            settingsBtn.setAttribute('aria-expanded', String(settingsPanel.classList.contains('show')));
        });
        settingsPanel.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('click', () => { settingsPanel.classList.remove('show'); settingsBtn.setAttribute('aria-expanded', 'false'); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') { settingsPanel.classList.remove('show'); settingsBtn.setAttribute('aria-expanded', 'false'); }
        });
    }
    applyAudioSettings();
    if (document.body.hasAttribute('data-game-phase')) startBackgroundMusic();
});
document.addEventListener('click', syncBackgroundMusic);
document.addEventListener('keydown', syncBackgroundMusic);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAllSounds(); else applyAudioSettings(); });
window.addEventListener('pagehide', stopAllSounds);
window.addEventListener('pageshow', applyAudioSettings);
window.addEventListener('storage', applyAudioSettings);
