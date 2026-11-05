// Replace only displayed text; keep the original text for existing game logic.
(() => {
 const icons = {"⚙":"gear","🚀":"rocket","🔊":"sound","⭐":"star","🏆":"trophy","🧠":"brain","⏱":"clock","⏰":"clock","🌍":"earth","🔄":"retry","🔁":"retry","➡":"arrow","🏁":"flag","💡":"bulb","☁":"cloud","🎮":"controller","🧑‍🚀":"person","✨":"sparkle","🧮":"calculator","👆":"hand","🏃":"person","🎯":"target","📚":"books","🗺":"map","⛏":"pickaxe","🌊":"wave","🌋":"volcano","❤":"heart","✅":"check","🔒":"lock","🎉":"party","🌙":"moon","🔴":"mars","🪐":"saturn","🔵":"neptune","🌌":"galaxy","⏹":"stop","✔":"check","✓":"check","✖":"cross","✕":"cross","⏭":"skip"};
 const pattern = /🧑\uFE0F?‍🚀|[⚙🚀🔊⭐🏆🧠⏱⏰🌍🔄🔁➡🏁💡☁🎮✨🧮👆🏃🎯📚🗺⛏🌊🌋❤✅🔒🎉🌙🔴🪐🔵🌌⏹✔✓✖✕⏭]\uFE0F?/gu;
 function replace(node) {
   if (!node.parentElement || node.parentElement.closest('script,style,textarea,select,option,.pixel-emoji')) return;
   const value = node.nodeValue;
   const matches = [...value.matchAll(pattern)];
   if (!matches.length) return;
   const fragment = document.createDocumentFragment(); let offset = 0;
   for (const match of matches) {
     const name = icons[match[0].replace(/\uFE0F/g,'')];
     if (!name) continue;
     fragment.append(document.createTextNode(value.slice(offset,match.index)));
     const icon = document.createElement('span'); icon.className = 'pixel-emoji pixel-emoji--' + name;
     const text = document.createElement('span'); text.className = 'pixel-emoji__text'; text.textContent = match[0];
     icon.append(text); fragment.append(icon); offset = match.index + match[0].length;
   }
   fragment.append(document.createTextNode(value.slice(offset))); node.replaceWith(fragment);
 }
 function scan(root) {
   if (root.nodeType === 3) return replace(root);
   const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes=[];
   while(walker.nextNode()) nodes.push(walker.currentNode);
   nodes.forEach(replace);
 }
 scan(document.body);
 new MutationObserver(records => {
   for(const record of records) {
     if(record.type === 'characterData') scan(record.target);
     else record.addedNodes.forEach(scan);
   }
 }).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
