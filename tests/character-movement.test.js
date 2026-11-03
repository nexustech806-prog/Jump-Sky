const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
for (const reduced of [false, true]) {
 test('travel interpolates from rendered position, reduced motion=' + reduced, () => {
  const calls=[];
  const character={style:{left:'0px',bottom:'0px'},animate(frames,options){ const animation={cancel(){this.cancelled=true;}};calls.push({frames,options,animation});return animation; }};
  let rendered={left:'0px',bottom:'0px'};
  const context=vm.createContext({window:{matchMedia:()=>({matches:reduced})}, document:{body:{dataset:{phase:'1'}}},getComputedStyle:()=>rendered});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../JS/game-assets.js'),'utf8'),context);
  const move=context.window.moveGameCharacter;
  move(character,20,30);
  assert.equal(calls.length,0);
  rendered={left:'20px',bottom:'30px'};
  move(character,220,140);
  assert.equal(calls[0].frames[0].left,'20px');
  assert.equal(calls[0].frames[1].left,'220px');
  assert.equal(calls[0].options.duration,reduced?250:700);
  move(character,220,140);
  assert.equal(calls.length,1);
  rendered={left:'100px',bottom:'70px'};
  move(character,240,160);
  assert.equal(calls[0].animation.cancelled,true);
  assert.equal(calls[1].frames[0].left,'100px');
 });
}
