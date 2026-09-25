/**
 * M0 research harness. Node built-ins only; no microphone, browser, or production changes.
 * Run from repo root:
 * node ktv-smart-scorer/tests/m0-audio-evidence.mjs --out docs/evidence/m0-audio-results.json
 * Filter simulation is calculated from W3C Web Audio 2021 bandpass coefficients,
 * independently implemented here (not a browser measurement or copied repository source).
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpus, platform, release, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sourcePaths = ['ktv-smart-scorer/src/audio/audioContext.js',
  'ktv-smart-scorer/src/audio/pitchDetector.js', 'ktv-smart-scorer/src/main.js'];
const sourceTexts = await Promise.all(sourcePaths.map(p => readFile(resolve(root, p), 'utf8')));
const importText = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
// Load the exact production text, without changing package/module configuration.
const pitch = await importText(sourceTexts[1]);
const audio = await importText(sourceTexts[0]);
// Expose existing private math ONLY in an in-memory diagnostic copy.
// All detection results below still call the unmodified public production export.
const internals = await importText(sourceTexts[1] +
  '\nexport { autocorrelate as diagnosticCorrelation, parabolicInterpolate as diagnosticInterpolation };');
const seed = 0x4b545630;
const frameCount = 24;
const rates = [44100, 48000];
const sizes = [2048, 4096]; // 4096 is comparison, not a proposed production change.
const sinePitches = [80, ...[40,45,48,52,57,60,64,69,72,76,81,84].map(pitch.midiToHz), 1200];
const fixtures = [
  { id:'silence', components:[], noisePeak:0, referenceHz:null },
  ...sinePitches.map(hz => ({ id:'sine-' + hz.toFixed(3), components:[[hz,0.2]],
    noisePeak:0, referenceHz:hz })),
  ...[0.005,0.014,0.02].map(a => ({ id:'low-A4-' + a, components:[[440,a]],
    noisePeak:0, referenceHz:440 })),
  ...[110,220,880].map(hz => ({id:'quiet-' + hz, components:[[hz,0.03]],
    noisePeak:0, referenceHz:hz})),
  ...[0.03,0.1,0.3].map(a => ({ id:'A4-noise-' + a, components:[[440,0.2]],
    noisePeak:a, referenceHz:440 })),
  {id:'white-noise',components:[],noisePeak:0.2,referenceHz:null},
  {id:'octave-equal',components:[[220,0.15],[440,0.15]],noisePeak:0,referenceHz:220},
  {id:'octave-weak-fundamental',components:[[220,0.03],[440,0.2]],noisePeak:0,referenceHz:220},
  {id:'dc-offset',components:[],noisePeak:0,dc:0.2,referenceHz:null},
  {id:'below-range-60',components:[[60,0.2]],noisePeak:0,referenceHz:60},
];
function generator(fixture, rate, length) {
  let state = seed;
  const samples = new Float32Array(length);
  for (let i=0;i<length;i++) {
    state = (Math.imul(state,1664525)+1013904223) >>> 0;
    let v = (fixture.dc || 0) + fixture.noisePeak * (state / 4294967296 * 2 - 1);
    for (const [hz,a] of fixture.components) v += a*Math.sin(2*Math.PI*hz*i/rate);
    samples[i]=v;
  }
  return samples;
}
function coefficients(rate) {
  const w=2*Math.PI*440/rate, alpha=Math.sin(w)/(2*3.5), a0=1+alpha;
  return { b0:alpha/a0,b1:0,b2:-alpha/a0,a1:-2*Math.cos(w)/a0,a2:(1-alpha)/a0 };
}
function filtered(input,c) {
  const result = new Float32Array(input.length);
  let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<input.length;i++){
    const y=c.b0*input[i]+c.b1*x1+c.b2*x2-c.a1*y1-c.a2*y2;
    result[i]=y; x2=x1;x1=input[i];y2=y1;y1=y;
  }
  return result;
}
function response(hz,rate,c) {
  const w=2*Math.PI*hz/rate;
  const nr=c.b0+c.b1*Math.cos(w)+c.b2*Math.cos(2*w);
  const ni=-c.b1*Math.sin(w)-c.b2*Math.sin(2*w);
  const dr=1+c.a1*Math.cos(w)+c.a2*Math.cos(2*w);
  const di=-c.a1*Math.sin(w)-c.a2*Math.sin(2*w);
  const gain=Math.hypot(nr,ni)/Math.hypot(dr,di);
  return {hz,gain,gainDb:20*Math.log10(gain)};
}
function crossing(lo,hi,rate,c,increasing){
  for(let k=0;k<60;k++){
    const mid=(lo+hi)/2;
    if((response(mid,rate,c).gain < Math.SQRT1_2) === increasing) lo=mid;
    else hi=mid;
  }
  return (lo+hi)/2;
}
function rms(a){let s=0;for(const v of a)s+=v*v;return Math.sqrt(s/a.length);}
function stats(a){
  if(!a.length)return null;
  const s=[...a].sort((a,b)=>a-b), q=p=>s[Math.ceil(p*s.length)-1];
  return {min:s[0],median:q(0.5),p95:q(0.95),max:s.at(-1)};
}
function diagnostic(buffer,rate) {
  const r0=internals.diagnosticCorrelation(buffer,0);
  if(r0===0)return {bestCorrelation:0,bestTau:null,refinedTau:null,quadraticPeakTau:null};
  let bestCorrelation=0,bestTau=-1;
  for(let tau=Math.floor(rate/1200);tau<=Math.floor(rate/80);tau++){
    const value=internals.diagnosticCorrelation(buffer,tau)/r0;
    if(value>bestCorrelation){bestCorrelation=value;bestTau=tau;}
  }
  const prev=internals.diagnosticCorrelation(buffer,bestTau-1);
  const curr=internals.diagnosticCorrelation(buffer,bestTau);
  const next=internals.diagnosticCorrelation(buffer,bestTau+1);
  // Vertex of the unique quadratic through (-1,prev),(0,curr),(1,next).
  const denom=prev-2*curr+next;
  const quadraticPeakTau=denom===0?bestTau:bestTau+0.5*(prev-next)/denom;
  return {bestCorrelation,bestTau,refinedTau:internals.diagnosticInterpolation(buffer,bestTau),quadraticPeakTau};
}
const checks=[];
function check(name,fn){fn();checks.push({name,status:'pass'});}
check('Hz/MIDI round trip 0..127 and A4',()=>{
  for(let n=0;n<128;n++)assert.equal(pitch.hzToMidi(pitch.midiToHz(n)),n);
  assert.equal(pitch.hzToMidi(440),69);
});
check('Production RMS gate: silence, below/at/above actual Float32 RMS; reused buffer',()=>{
  const a=new Float32Array(2048).fill(0.01), buffer=new Float32Array(2048);
  const analyser={getFloatTimeDomainData:b=>b.set(a)};
  const actual=rms(a);
  assert.equal(audio.getFilteredBuffer(analyser,buffer,actual),buffer);
  assert.equal(audio.getFilteredBuffer(analyser,buffer,actual+1e-9),null);
  assert.equal(audio.getFilteredBuffer(analyser,buffer,actual-1e-9),buffer);
  a.fill(0);assert.equal(audio.getFilteredBuffer(analyser,buffer),null);
});
check('Filter calculation center unity and sine steady-state gain cross-check',()=>{
  for(const rate of rates){
    const c=coefficients(rate);assert.ok(Math.abs(response(440,rate,c).gain-1)<1e-10);
    for(const hz of [110,440,880]){
      const raw=generator({components:[[hz,0.2]],noisePeak:0},rate,rate);
      const out=filtered(raw,c);
      const measuredRatio=rms(out.subarray(rate/2))/rms(raw.subarray(rate/2));
      assert.ok(Math.abs(measuredRatio-response(hz,rate,c).gain)<0.002);
    }
  }
});
check('Deterministic fixture generator (same seed)',()=>{
  assert.deepEqual(generator(fixtures[23],48000,2048),generator(fixtures[23],48000,2048));
});
const rows=[];
let immutabilityChecks=0, diagnosticChecks=0;
for(const rate of rates)for(const size of sizes)for(const fixture of fixtures){
  const preRoll=Math.round(rate*0.25), hop=Math.round(rate/60);
  const raw=generator(fixture,rate,preRoll+size+(frameCount-1)*hop);
  const processed=filtered(raw,coefficients(rate));
  for(const path of ['raw-detector','raw-gate-detector','calculated-filter-gate-detector']){
    const stream=path.startsWith('calculated')?processed:raw;
    const frames=[];
    for(let k=0;k<frameCount;k++){
      const start=preRoll+k*hop, frame=stream.slice(start,start+size);
      const snapshot=frame.slice(), buffer=new Float32Array(size);
      const accepted=path==='raw-detector'?frame:
        audio.getFilteredBuffer({getFloatTimeDomainData:b=>b.set(frame)},buffer);
      const result=accepted?pitch.detectPitch(accepted,rate):null;
      assert.deepEqual(frame,snapshot);
      if(accepted)assert.deepEqual(accepted,snapshot);
      immutabilityChecks++;
      const d=diagnostic(frame,rate);
      assert.equal(result!==null,!!accepted && d.bestCorrelation>=0.9);
      diagnosticChecks++;
      frames.push({
        index:k,startSample:start,rms:rms(frame),gatePassed:!!accepted,
        ...d, result,
        errorCents:result&&fixture.referenceHz!==null?
          1200*Math.log2(result.hz/fixture.referenceHz):null
      });
    }
    const detected=frames.filter(f=>f.result);
    rows.push({fixture:fixture.id,rate,size,path,framesTested:frames.length,
      detected:detected.length,coverage:detected.length/frames.length,
      gatePassed:frames.filter(f=>f.gatePassed).length,
      falseDetections:fixture.referenceHz===null?detected.length:null,
      frequencyHz:stats(detected.map(f=>f.result.hz)),
      midiValues:[...new Set(detected.map(f=>f.result.midi))],
      signedErrorCents:stats(detected.filter(f=>f.errorCents!==null).map(f=>f.errorCents)),
      absoluteErrorCents:stats(detected.filter(f=>f.errorCents!==null).map(f=>Math.abs(f.errorCents))),
      correlation:stats(frames.map(f=>f.bestCorrelation)),
      rms:stats(frames.map(f=>f.rms)),frames});
  }
}
checks.push({name:'Production input immutability across all observations',status:'pass',observations:immutabilityChecks});
checks.push({name:'Diagnostic correlation threshold agrees with production detect/null',status:'pass',observations:diagnosticChecks});
const cpu=[];
for(const rate of rates)for(const kind of ['A4','silence']){
  const b=generator({components:kind==='A4'?[[440,0.2]]:[],noisePeak:0},rate,2048);
  for(let i=0;i<200;i++)pitch.detectPitch(b,rate);
  const elapsed=[], cpuStart=process.cpuUsage(), wallStart=performance.now();
  for(let i=0;i<500;i++){
    const t=performance.now();pitch.detectPitch(b,rate);elapsed.push(performance.now()-t);
  }
  const used=process.cpuUsage(cpuStart);
  cpu.push({rate,size:2048,fixture:kind,warmupCalls:200,measuredCalls:500,
    callWallMs:stats(elapsed),batchWallMs:performance.now()-wallStart,
    batchProcessCpuMs:(used.user+used.system)/1000});
}
const filter=rates.map(rate=>{
  const c=coefficients(rate);
  return {rate,coefficients:c,lowerHalfPowerHz:crossing(1,440,rate,c,true),
    upperHalfPowerHz:crossing(440,rate/2-1,rate,c,false),
    responses:[80,82.406889,110,130.812783,220,261.625565,440,880,1046.502261,1200].map(hz=>response(hz,rate,c))};
});
const output={
  schemaVersion:'m0-audio-evidence-1',generatedAtUtc:new Date().toISOString(),
  scope:'Node synthetic measurements + calculated W3C bandpass; no browser/microphone/KTV measurement',
  environment:{node:process.version,v8:process.versions.v8,platform:platform(),release:release(),arch:arch(),
    cpuModel:cpus()[0]?.model,logicalCpus:cpus().length,gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()},
  sources:sourcePaths.map((path,i)=>({path,sha256:createHash('sha256').update(sourceTexts[i]).digest('hex')})),
  harnessSha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  protocol:{seed,prng:'LCG: state=(1664525*state+1013904223) mod 2^32; uniform [-1,1)',
    rates,sizes,frameCount,hop:'round(sampleRate/60); synthetic positions, not measured rAF',
    preRollMs:250,amplitudes:'peak, not RMS; no clipping or normalization',
    paths:['raw-detector','raw-gate-detector','calculated-filter-gate-detector'],
    defaultThresholds:{rms:0.01,correlation:0.9,minHz:80,maxHz:1200},
    coverage:'non-null detections / all fixture windows; not correctness or unique voiced duration',
    cents:'1200*log2(detectedHz/referenceHz); null excluded from error stats, not coverage denominator',
    cpu:'Unmodified detectPitch only; excludes diagnostics, generation, filter, browser, UI and capture'},
  fixtures,checks,filter,cpu,rows
};
const outIndex=process.argv.indexOf('--out');
const verifyIndex=process.argv.indexOf('--verify');
if(verifyIndex!==-1){
  assert.ok(process.argv[verifyIndex+1],'--verify requires a prior result file');
  const prior=JSON.parse(await readFile(resolve(process.argv[verifyIndex+1]),'utf8'));
  // Wall-clock/process CPU measurements deliberately excluded from determinism checks.
  for(const key of ['harnessSha256','sources','protocol','fixtures','checks','filter','rows']) {
    assert.deepEqual(output[key],prior[key], 'Replay mismatch: '+key);
  }
  console.log('Deterministic replay matched all 8,352 observations, filters, fixtures and source hashes.');
}
if(outIndex!==-1){
  assert.ok(process.argv[outIndex+1],'--out requires a file path');
  const target=resolve(process.argv[outIndex+1]);
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,JSON.stringify(output,null,2)+'\n');
  console.log('Wrote '+target);
}
console.log(JSON.stringify({checks,rows:rows.length,observations:immutabilityChecks,filter,cpu},null,2));
