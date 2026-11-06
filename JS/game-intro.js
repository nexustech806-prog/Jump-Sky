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
   // Web Animations avoids OS/CSS overrides silently swallowing the entire reveal.
   if (image.animate) {
     const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     image.style.animation = 'none';
     image.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [
       { opacity: 0, transform: 'scale(.35) translateY(24px)' },
       { opacity: 1, transform: 'scale(1.04) translateY(-3px)', offset: .75 },
       { opacity: 1, transform: 'scale(1) translateY(0)' }
     ], { duration: reduced ? 300 : 1300, easing: 'cubic-bezier(.2,.75,.25,1)' });
   }
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
