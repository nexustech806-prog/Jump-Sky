// Som geral preserva a preferência antiga. Cada canal tem volume e mute próprios.
const audioChannels = ['music', 'effects'];
const channelLabels = { music: 'Música', effects: 'Efeitos sonoros' };
const audioMemory = new Map();
const musicTracks = [
    { id: 'clouds', name: 'Fase 1 · Brisa nas Nuvens', src: '/audio/music-clouds.mp3' },
    { id: 'underground', name: 'Fase 2 · Ecos da Caverna', src: '/audio/music-underground.mp3' },
    { id: 'beach', name: 'Fase 3 · Maré de Verão', src: '/audio/music-beach.mp3' },
    { id: 'lava', name: 'Fase 4 · Coração do Vulcão', src: '/audio/music-lava.mp3' },
    { id: 'space', name: 'Bônus · Além das Estrelas', src: '/audio/music-space.mp3' }
];
const phaseMusicTracks = { '1': 'clouds', '2': 'underground', '3': 'beach', '4': 'lava', bonus: 'space' };
function validMusicTrack(id) { return musicTracks.some(track => track.id === id); }
function defaultMusicTrack() { return phaseMusicTracks[document.body.dataset.phase] || 'clouds'; }
const savedMusicTrack = readAudioSetting('musicTrack');
let selectedMusicTrack = validMusicTrack(savedMusicTrack) ? savedMusicTrack : defaultMusicTrack();
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
const backgroundMusic = new Audio(musicTracks.find(track => track.id === selectedMusicTrack).src);
backgroundMusic.loop = true;
backgroundMusic.preload = 'auto';
let musicTrackVersion = 0;
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
    const playVersion = musicTrackVersion;
    backgroundMusic.play().then(() => {
        if (!musicRequested || !canPlayChannel('music')) backgroundMusic.pause();
    }).catch(() => { /* Tentar novamente no próximo clique ou tecla. */ })
        .finally(() => {
            musicPlayPending = false;
            if (playVersion !== musicTrackVersion) syncBackgroundMusic();
        });
}
function startBackgroundMusic() { musicRequested = true; syncBackgroundMusic(); }
function stopBackgroundMusic() { musicRequested = false; backgroundMusic.pause(); backgroundMusic.currentTime = 0; }
function setMusicTrack(trackId, persist = true) {
    const track = musicTracks.find(option => option.id === trackId);
    if (!track) return;
    if (persist) saveAudioSetting('musicTrack', track.id);
    if (selectedMusicTrack !== track.id) {
        selectedMusicTrack = track.id;
        musicTrackVersion++;
        backgroundMusic.pause();
        backgroundMusic.src = track.src;
        backgroundMusic.load();
    }
    syncBackgroundMusic();
    updateAudioControls();
}
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
    document.dispatchEvent(new Event('instructionaudio:stop'));
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
    if (!canPlayChannel('voice')) document.dispatchEvent(new Event('instructionaudio:stop'));
    syncBackgroundMusic();
    updateAudioControls();
}
function updateAudioControls() {
    document.querySelectorAll('[data-audio-master]').forEach(button => {
        button.textContent = isSoundEnabled() ? 'Silenciar tudo' : 'Ativar som geral';
        button.setAttribute('aria-pressed', String(!isSoundEnabled()));
    });
    document.querySelectorAll('[data-audio-track]').forEach(select => { select.value = selectedMusicTrack; });
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
        const trackId = 'audio-' + index + '-track';
        const trackOptions = musicTracks.map(track => '<option value="' + track.id + '">' + track.name + '</option>').join('');
        host.innerHTML = '<h3>Som</h3><button type="button" data-audio-master></button><p data-audio-status role="status"></p>' +
            '<div class="audio-track"><label for="' + trackId + '">Música da partida</label><select id="' + trackId + '" data-audio-track aria-label="Escolher música da partida">' + trackOptions + '</select></div>' +
            audioChannels.map(channel => {
            const id = 'audio-' + index + '-' + channel;
            return '<div class="audio-channel"><label for="' + id + '">' + channelLabels[channel] + '</label>' +
                '<button type="button" data-audio-toggle="' + channel + '" aria-label="Ligar ou desligar ' + channelLabels[channel] + '"></button>' +
                '<input id="' + id + '" type="range" min="0" max="100" step="1" data-audio-volume="' + channel + '">' +
                '<output for="' + id + '" data-audio-value="' + channel + '"></output></div>';
        }).join('');
        host.querySelector('[data-audio-master]').addEventListener('click', toggleSound);
        host.querySelector('[data-audio-track]').addEventListener('change', event => setMusicTrack(event.target.value));
        host.querySelectorAll('[data-audio-toggle]').forEach(button => button.addEventListener('click', () => {
            const channel = button.dataset.audioToggle; setChannelEnabled(channel, !getChannelEnabled(channel));
        }));
        host.querySelectorAll('[data-audio-volume]').forEach(input => input.addEventListener('input', () => setChannelVolume(input.dataset.audioVolume, Number(input.value) / 100)));
    });
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn && settingsPanel) {
        settingsBtn.setAttribute('aria-expanded', 'false');
        settingsBtn.setAttribute('aria-controls', settingsPanel.id);
        settingsBtn.addEventListener('click', event => {
            event.stopPropagation();
            settingsPanel.classList.toggle('show');
            settingsBtn.setAttribute('aria-expanded', String(settingsPanel.classList.contains('show')));
        });
        settingsPanel.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('click', () => { settingsPanel.classList.remove('show'); settingsBtn.setAttribute('aria-expanded', 'false'); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && settingsPanel.classList.contains('show')) {
                settingsPanel.classList.remove('show');
                settingsBtn.setAttribute('aria-expanded', 'false');
                settingsBtn.focus();
            }
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
window.addEventListener('storage', event => {
    if (event.key === 'musicTrack') setMusicTrack(event.newValue, false);
    applyAudioSettings();
});
