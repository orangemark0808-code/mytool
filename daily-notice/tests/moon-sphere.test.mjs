import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMoonSphere, moonLightDirection, applyMoonDuotone, drawMoonSphere } from '../lib/moon-sphere.mjs';

const n = 144;
const rgb = (data,x,y) => [...data.slice((y*n+x)*4,(y*n+x)*4+3)];
const value = (data,x,y) => rgb(data,x,y).reduce((sum,c)=>sum+c,0)/3;

test('duotone follows the requested anchors continuously, retaining bright detail', () => {
 const ramp = new Uint8ClampedArray(256 * 4);
 for(let gray=0;gray<256;gray++) ramp.set([gray,gray,gray,255],gray*4);
 applyMoonDuotone(ramp);
 assert.deepEqual([...ramp.slice(0,3)],[31,42,61]);
 assert.deepEqual([...ramp.slice(255*4,255*4+3)],[238,243,250]);
 for(const gray of [127,128]) for(let c=0;c<3;c++)
  assert(Math.abs(ramp[gray*4+c]-[111,132,163][c])<=1,'midpoint matches within 8-bit quantization');
 for(let gray=1;gray<256;gray++) for(let c=0;c<3;c++) {
  const step=ramp[gray*4+c]-ramp[(gray-1)*4+c];
  assert(step>=0&&step<=2,'smooth monotonic interpolation retains surface detail');
 }
 const bright=0.2126*ramp[240*4]+0.7152*ramp[240*4+1]+0.0722*ramp[240*4+2];
 assert(bright>=225,'highlights stay bright');
});

test('production canvas applies color after shading and preserves every alpha value', () => {
 for(const phase of [0,.07,.25,.4167,.5,.75,.9]) {
  const gray=renderMoonSphere(n,phase,null,2);
  const expected=applyMoonDuotone(gray.slice());
  let frame;
  const context={createImageData:()=>({data:new Uint8ClampedArray(n*n*4)}),putImageData:image=>{frame=image.data;}};
  const canvas={getBoundingClientRect:()=>({width:n/2}),getContext:()=>context};
  drawMoonSphere(canvas,phase,null,2);
  assert.deepEqual(frame,expected,'actual canvas receives the colorized spherical render');
  for(let i=0;i<gray.length;i+=4) {
   assert.equal(frame[i+3],gray[i+3],'edge coverage is identical');
   if(!gray[i+3]) assert.deepEqual(frame.slice(i,i+4),gray.slice(i,i+4),'transparent pixels stay untouched');
  }
 }
});

test('new moon retains 18% earthshine and a softly antialiased circular silhouette', () => {
 const moon = renderMoonSphere(n,0,null,2);
 const ratio = value(moon,72,72)/190;
 assert(ratio >= .17 && ratio <= .19, `earthshine ${ratio}`);
 assert.equal(moon[3],0,'outside circle is transparent');
 assert.equal(moon[(72*n+72)*4+3],255,'centre is opaque');
 const alpha = Array.from({length:n},(_,x)=>moon[(72*n+x)*4+3]);
 assert(alpha.some(a=>a>0&&a<255),'edge has partial coverage');
 const partial=alpha.filter(a=>a>0&&a<255).length;
 assert(partial>=4&&partial<=6,'1–1.5 CSS pixel edge at DPR 2 on each side');
});

test('daylight is bright and detailed, with neutral grayscale before duotone', () => {
 const data=new Uint8ClampedArray(216*216*4);
 for(let y=0;y<216;y++)for(let x=0;x<216;x++) {
  const gray=x<108?120:190;
  data.set([gray,gray,gray,255],(y*216+x)*4);
 }
 const texture={width:216,height:216,data};
 const full=renderMoonSphere(n,.5,texture,2);
 const night=renderMoonSphere(n,0,texture,2);
 assert(value(full,80,60)>190,'bright surface is at least as bright as the photo');
 assert(value(full,60,60)>120,'midtones are lifted');
 assert(value(full,80,60)-value(full,60,60)>25,'surface markings retain contrast');
 const [r,g,b]=rgb(full,80,60);
 assert(r===g&&g===b,'no warm tint before duotone');
 const [nr,ng,nb]=rgb(night,80,60);
 assert(nr===ng&&ng===nb&&nr>=30&&nr<=35,'neutral 18% earthshine with gentle limb darkening');
 for(let i=0;i<full.length;i+=4) assert(full[i]<254&&full[i+1]<254&&full[i+2]<254,'no clipped highlights');
});

test('a soft offset highlight sits above the centre, while the geometric phase remains unchanged', () => {
 for(let phase=0;phase<1;phase+=.01) {
  const light=moonLightDirection(phase);
  assert(Math.abs(Math.hypot(light.x,light.y,light.z)-1)<1e-12);
  const original=(1-Math.cos(phase*Math.PI*2))/2;
  assert(Math.abs((1+light.z)/2-original)<1e-12,'the underlying phase is unchanged');
 }
 for(const phase of [.41673354884324,.5,.58326645115676]) {
  const moon=renderMoonSphere(n,phase,null,2);
  assert(value(moon,72,25)>=value(moon,72,118),'upper surface is gently highlighted');
  assert(moonLightDirection(phase).y<0,'light comes from above');
 }
 assert(Math.abs(moonLightDirection(0).y)===0,'new moon has no artificial lit sliver');
});

test('flat albedo has a smooth surface with no generated high-frequency relief', () => {
 const moon=renderMoonSphere(n,.5,null,2);
 let maxStep=0;
 for(let y=20;y<124;y++)for(let x=20;x<124;x++) {
  if(Math.hypot(x-72,y-72)>50)continue;
  maxStep=Math.max(maxStep,Math.abs(value(moon,x,y)-value(moon,x+1,y)),Math.abs(value(moon,x,y)-value(moon,x,y+1)));
 }
 assert(maxStep<8,'no spiky shading or synthetic crater noise');
});

test('waxing and waning crescent / quarter lighting are mirrored on the correct sides', () => {
 for (const phase of [.08,.25,.40]) {
  const waxing = renderMoonSphere(n,phase,null,2);
  const waning = renderMoonSphere(n,1-phase,null,2);
  let left = 0,right = 0;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
   const a=(y*n+x)*4,b=(y*n+n-1-x)*4;
   for(let c=0;c<4;c++) assert(Math.abs(waxing[a+c]-waning[b+c])<=1, `${phase}: mirrored channel`);
   if(waxing[a+3]===255) {if(x<n/2)left+=waxing[a];else right+=waxing[a];}
  }
  assert(right>left*1.02, `waxing ${phase}: right is brighter`);
 }
});

test('full moon is a lit sphere with continuous centre-to-limb falloff', () => {
 const full=renderMoonSphere(n,.5,null,2);
 let previous=value(full,72,72);
 for(let x=74;x<=140;x++) {
  const next=value(full,x,72);
  assert(next<=previous+1,'brightness falls toward the limb');
  assert(Math.abs(next-previous)<16,'no sudden flat-mask boundary');
  previous=next;
 }
 const edgeRatio=value(full,143,72)/value(full,72,72);
 assert(edgeRatio>=.45&&edgeRatio<=.60,`edge brightness ${edgeRatio}`);
});

test('quarter-moon terminator has gradual lighting instead of a black mask edge', () => {
 const quarter=renderMoonSphere(n,.25,null,2);
 const values=[65,68,70,72,74,77,80].map(x=>value(quarter,x,72));
 assert(values[0]>0,'night side is visible');
 assert(new Set(values).size>=6,'multiple brightness levels across the terminator');
 for(let i=1;i<values.length;i++)assert(values[i]>=values[i-1]);
 for(let x=66;x<81;x++) assert(Math.abs(value(quarter,x+1,72)-value(quarter,x,72))<20,'broad feather across the terminator');
});

test('near-full phase has a faint wrapping shadow instead of a black stripe', () => {
 const waxing=renderMoonSphere(n,.409,null,2);
 const waning=renderMoonSphere(n,.591,null,2);
 assert(value(waxing,6,72)>value(waxing,72,72)*.45);
 assert(value(waxing,125,72)<value(waxing,6,72)*1.8);
 assert(value(waning,137,72)>value(waning,72,72)*.45);
});

test('photograph markings remain sharp and new moon has neutral visible earthshine', () => {
 const data=new Uint8ClampedArray(216*216*4);
 for(let i=0;i<data.length;i+=4){const gray=(i/4)%216<108?140:210;data.set([gray,gray,gray,255],i);}
 const texture={width:216,height:216,data};
 const moon=renderMoonSphere(n,0,texture,2);
 const full=renderMoonSphere(n,.5,texture,2);
 for(const x of [50,95]) {
  const [r,g,b]=rgb(moon,x,72);
  assert(r>=g&&g>=b&&r-b<=2,'subtle sepia, not an orange tint');
  assert(value(moon,x,72)>20&&value(moon,x,72)<40,'albedo remains at earthshine brightness');
 }
 assert(value(full,95,72)>value(full,50,72),'surface markings remain visible');
});

test('device pixel ratios produce the same spherical lighting at corresponding CSS positions', () => {
 const one=renderMoonSphere(72,.25,null,1);
 const three=renderMoonSphere(216,.25,null,3);
 for(const [x,y] of [[36,36],[44,36],[55,36],[44,20]]) {
  for(let channel=0;channel<3;channel++) assert(Math.abs(one[(y*72+x)*4+channel]-three[((y*3+1)*216+x*3+1)*4+channel])<=1);
 }
 assert(renderMoonSphere(72,NaN).every(c=>c===0),'invalid phase cannot produce corrupt pixels');
});
