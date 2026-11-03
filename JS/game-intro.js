// Decode first: a slow download must not consume the entrance animation.
(() => {
 const intro = document.getElementById('intro') || document.getElementById('bonusIntro');
 if (!intro) return;
 const image = intro.querySelector('img');
 const main = document.querySelector('.game-container');
 const settings = document.querySelector('.game-settings');
 const previous = [main.inert, settings.inert];
 main.inert = settings.inert = true;
 const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
 let soundPlayed = false, soundPending = false, introVisible = false;
 const playIntro = async () => {
   if (!introVisible || soundPlayed || soundPending || typeof playSound !== 'function') return;
   soundPending = true;
   try { soundPlayed = await playSound('intro'); } finally { soundPending = false; }
 };
 document.addEventListener('click', playIntro);
 document.addEventListener('keydown', playIntro);
 const ready = (async () => {
   await window.JumpSkyAssets.load(image.getAttribute('src'));
   intro.classList.add('intro-visible');
   introVisible = true;
   void playIntro();
   await Promise.all([wait(2500), window.jumpSkyAvatarReady,
     intro.id === 'bonusIntro' ? window.JumpSkyAssets.load('/images/bonus1.jpeg') : Promise.resolve()]);
   introVisible = false;
   intro.classList.add('intro-leaving');
   await wait(500);
 })().finally(() => {
   introVisible = false;
   document.removeEventListener('click', playIntro);
   document.removeEventListener('keydown', playIntro);
   intro.remove(); main.inert = previous[0]; settings.inert = previous[1];
 });
 if (intro.id === 'bonusIntro') window.jumpSkyBonusIntroReady = ready;
})();
