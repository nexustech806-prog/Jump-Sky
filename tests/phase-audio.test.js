const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function audio(phase, muted = false) {
 const store = new Map([['musicTrack','lava'], ['soundEnabled', String(!muted)]]);
 const sounds=[];
 class Sound {
   constructor(src) { this.src=src; this.paused=true; this.plays=0; sounds.push(this); }
   addEventListener() {} pause() { this.paused=true; } load() {}
   play() { this.plays++; this.paused=false; return Promise.resolve(); }
 }
 const context=vm.createContext({ Audio:Sound, Map, Set, console,
 localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},
 document:{body:{dataset:{phase},hasAttribute:()=>true},hidden:false,querySelectorAll:()=>[],addEventListener(){}},
 window:{addEventListener(){}} });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../JS/audio.js'),'utf8'),context);
 return {context,sounds,store};
}
test('each phase starts its own track despite a previously saved selection',()=>{
 for(const [phase,track] of [['1','clouds'],['2','underground'],['3','beach'],['4','lava'],['bonus','space']]) {
   const {context,store}=audio(phase);
   assert.equal(vm.runInContext('selectedMusicTrack',context),track);
   vm.runInContext("setMusicTrack('underground')",context);
   assert.equal(vm.runInContext('selectedMusicTrack',context),'underground');
   assert.equal(store.get('musicTrack'),'lava');
 }
});
test('intro uses the effects channel and honors mute',async()=>{
 const enabled=audio('1');
 assert.equal(await vm.runInContext("playSound('intro')",enabled.context),true);
 assert.equal(enabled.sounds.find(s=>s.src==='/audio/intro.mp3').plays,1);
 const muted=audio('1',true);
 assert.equal(await vm.runInContext("playSound('intro')",muted.context),false);
 assert.equal(muted.sounds.find(s=>s.src==='/audio/intro.mp3').plays,0);
});

test('countdown and life-loss sounds honor effect mute', async()=>{
 const muted=audio('bonus',true);
 for(const name of ['tick','lifeLost']) assert.equal(await vm.runInContext('playSound("'+name+'")',muted.context),false);
 assert.equal(muted.sounds.find(s=>s.src==='/audio/tick.wav').plays,0);
 assert.equal(muted.sounds.find(s=>s.src==='/audio/life-lost.wav').plays,0);
});
