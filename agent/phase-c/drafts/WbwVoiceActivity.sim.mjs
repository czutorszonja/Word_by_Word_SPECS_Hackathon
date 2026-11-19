// WbwVoiceActivity.sim.mjs — Node 24 check of drafts/WbwVoiceActivity.ts (not a Lens script; do not copy).
// Strips the decorators + types in memory (node:module stripTypeScriptTypes), stubs the Lens globals, and
// drives the real detector with synthetic blocks and a fake Microphone provider.  Run:
//   node agent/phase-c/drafts/WbwVoiceActivity.sim.mjs
import {readFileSync} from "node:fs"
import {stripTypeScriptTypes} from "node:module"
import {fileURLToPath} from "node:url"
import {dirname, join} from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
let src = readFileSync(join(here, "WbwVoiceActivity.ts"), "utf8")
src = src.replace(/^import Event.*$/m, "")
src = src.split("\n").filter((l) => !/^\s*@\w/.test(l)).join("\n")
const js = stripTypeScriptTypes(src, {mode: "strip"})
const prelude = `
const G = globalThis
class Event { constructor() { this.h = [] } publicApi() { return {add: (f) => this.h.push(f)} } invoke(a) { for (const f of this.h) f(a) } }
class BaseScriptComponent { constructor() { this.__ev = {} } createEvent(n) { const ev = this.__ev; return {bind(f) { ev[n] = f }} } }
const getTime = () => G.__t
const print = (m) => G.__prints.push(String(m))
const isNull = (r) => r === null || r === undefined
class MicrophoneAudioProvider { static getTypeName() { return "MicrophoneAudioProvider" } }
`
const mod = await import("data:text/javascript," + encodeURIComponent(prelude + js))
const {WbwVoiceActivity} = mod

let fails = 0
function check(cond, msg) { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) fails++ }
function fresh() {
  globalThis.__t = 0
  globalThis.__prints = []
  const v = new WbwVoiceActivity()
  v.onAwake()
  return v
}
function tick(v, dt) { globalThis.__t += dt; v.__ev.UpdateEvent() }
let seed = 12345
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
function gauss() { let u = 0, w = 0; while (u === 0) u = rnd(); w = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w) }

// ── A. LEAF recipe (synthetic), arm() style, controller-owned flag ──
{
  const v = fresh()
  v.ignoreMicForTests = true
  v.init(() => false)
  const ctl = {turn: null, said: [], insideFlag: null}
  const armVoice = (sec) => v.arm((src) => { ctl.insideFlag = v.waitingForSpeech; if (ctl.turn) { ctl.turn = null; ctl.said.push(src) } }, sec)
  ctl.turn = {id: "fillings"}
  armVoice(2.5)
  check(v.vadState === "guard", `A arm → guard (got ${v.vadState})`)
  check(v.minSpeechBlocks === 38, `A minSpeechBlocks for 2.5 s = 38 (got ${v.minSpeechBlocks})`)
  v.injectBlocksForTest(-60, v.settleBlocks)
  check(v.vadState === "listening", `A settle → listening (got ${v.vadState})`)
  v.injectBlocksForTest(-38, 10); v.injectBlocksForTest(-60, 20)
  check(v.vadState === "listening" && !v.speechDetected && ctl.said.length === 0, `A cough dropped (state ${v.vadState})`)
  v.injectBlocksForTest(-38, 15, true)
  check(v.vadState === "guard", `A own playback → guard (got ${v.vadState})`)
  v.injectBlocksForTest(-60, v.settleBlocks)
  check(v.vadState === "listening", `A settle again → listening (got ${v.vadState})`)
  v.injectBlocksForTest(-38, v.minSpeechBlocks + 2)
  check(v.vadState === "speech" && v.speechDetected, `A minSpeechBlocks + 2 → speech (got ${v.vadState})`)
  v.injectBlocksForTest(-60, v.endSilenceBlocksMax + 2)
  check(v.vadState === "done" && ctl.said.join() === "mic" && v.speechSource === "mic", `A end → done, onEnd("mic") once (said=${ctl.said})`)
  check(ctl.insideFlag === false, "A detector flag is already false inside onEnd (controller must own its flag)")
  check(v.lastResult && v.lastResult.source === "synthetic", "A result.source synthetic")
  // old recipe (-38, 30) would not reach speech for a 2.5 s clip
  armVoice(2.5); v.injectBlocksForTest(-60, v.settleBlocks); v.injectBlocksForTest(-38, 30)
  check(v.vadState === "candidate", `A old recipe (-38, 30) stays candidate for a 2.5 s clip (got ${v.vadState})`)
  v.stop()
  for (const [sec, want] of [[1.13, 25], [2.19, 33], [2.77, 40], [6.5, 40]]) { v.start(-1, sec); check(v.minSpeechBlocks === want, `A minSpeechBlocks(${sec}) = ${want} (got ${v.minSpeechBlocks})`) }
  v.stop()
}

// ── B. maxUtterSec = noise ──
{
  const v = fresh(); v.ignoreMicForTests = true; v.init(() => false)
  let fired = 0; v.onSpeechDetected.add(() => fired++)
  v.start(-1, 2.5); v.injectBlocksForTest(-60, v.settleBlocks)
  v.injectBlocksForTest(-38, Math.ceil(v.maxUtterSec / 0.02) + 2)
  check(fired === 0 && v.vadState === "listening" && !v.speechDetected && v.noiseRejectCount === 1, `B continuous 8 s rejected (state ${v.vadState}, fired ${fired})`)
  check(Math.abs(v.noiseFloor - -38) < 0.5, `B floor raised to the run (${v.noiseFloor.toFixed(1)})`)
  v.injectBlocksForTest(-38, 60)
  check(v.vadState === "listening", "B the same sound no longer triggers")
}

// ── C. hesitation window vs fluent window ──
{
  const v = fresh(); v.ignoreMicForTests = true; v.init(() => false)
  let fired = 0; v.onSpeechDetected.add(() => fired++)
  v.start(-1, 2.5); v.injectBlocksForTest(-60, v.settleBlocks)
  v.injectBlocksForTest(-38, 45)            // "Kérek uborkát" ~0.9 s voiced (< 50 % of 2.5 s)
  v.injectBlocksForTest(-60, 45)            // 0.9 s hesitation
  check(v.vadState === "speech" && fired === 0, `C a 0.9 s pause after half a phrase does not end the turn (state ${v.vadState})`)
  v.injectBlocksForTest(-38, 40)            // "… a szendvicsembe"
  v.injectBlocksForTest(-60, 36)            // fluent window 0.7 s (85 % = 30 blocks of 35)
  check(v.vadState === "done" && fired === 1 && v.lastResult.endWindowSec === 0.7, `C fluent end after ~0.7 s (state ${v.vadState}, window ${v.lastResult && v.lastResult.endWindowSec})`)
  v.start(-1)                               // unknown length → always the hesitation window
  v.injectBlocksForTest(-60, v.settleBlocks); v.injectBlocksForTest(-38, 30); v.injectBlocksForTest(-60, 45)
  check(v.vadState === "speech", "C unknown phrase length: 0.9 s pause keeps the turn")
  v.injectBlocksForTest(-60, 20)
  check(v.vadState === "done", "C … and 1.2 s ends it")
}

// ── D. babble σ = 3 dB: false triggers, and the end of real speech ──
{
  const v = fresh(); v.ignoreMicForTests = true; v.init(() => false)
  let fired = 0, started = 0; v.onSpeechDetected.add(() => fired++); v.onSpeechStarted.add(() => started++)
  v.start(0, 2.5)                           // no timeout
  for (let i = 0; i < 3000; i++) v.injectBlocksForTest(-50 + 3 * gauss(), 1)   // 60 s of babble
  check(fired === 0 && started === 0, `D 60 s of σ=3 dB babble: no speech (started ${started}, fired ${fired}; floor ${v.noiseFloor.toFixed(1)}, spread ${v.noiseSpread.toFixed(2)})`)
  for (let i = 0; i < 125; i++) v.injectBlocksForTest(-32 + 4 * gauss() - (i % 12 === 11 ? 14 : 0), 1)  // 2.5 s speech with dips
  let endBlocks = -1
  for (let i = 0; i < 400 && endBlocks < 0; i++) { v.injectBlocksForTest(-50 + 3 * gauss(), 1); if (v.vadState === "done") endBlocks = i + 1 }
  check(fired === 1 && endBlocks > 0 && endBlocks <= 62, `D speech in babble ends after ${endBlocks} blocks (${(endBlocks * 0.02).toFixed(2)} s)`)
}

// ── Fake microphone for E–J ──
function fakeMic(opts) {
  const m = {sampleRate: 16000, maxFrameSize: opts.maxFrameSize ?? 1024, started: false, src: opts.src,
    isOfType: (t) => t === "MicrophoneAudioProvider", getTypeName: () => "MicrophoneAudioProvider",
    start() { this.started = true }, stop() { this.started = false },
    getAudioFrame(buf) { const n = this.src(buf); return {x: n, y: 1, z: 1} }}
  return {control: m}
}
const tone = (db) => Math.pow(10, db / 20) * Math.SQRT2
let phase = 0
function fill(buf, n, db, zeros = false) {
  const a = tone(db)
  for (let i = 0; i < n; i++) { phase += 2 * Math.PI * 200 / 16000; buf[i] = zeros ? 0 : a * Math.sin(phase) + 1e-4 * gauss() }
  return n
}

// ── E. exact zeros inside an utterance end the turn by silence (not by the no-signal watchdog) ──
{
  let mode = "noise"
  const asset = fakeMic({src: (buf) => fill(buf, 533, mode === "speech" ? -30 : -60, mode === "zeros")})
  const v = fresh(); v.micAudio = asset; v.onAwake(); v.init(() => false); v.setMicActive(true)
  let fired = 0; v.onSpeechDetected.add(() => fired++)
  for (let i = 0; i < 60; i++) tick(v, 1 / 30)
  v.start(-1, 2.5)
  for (let i = 0; i < 30; i++) tick(v, 1 / 30)
  mode = "speech"; for (let i = 0; i < 45; i++) tick(v, 1 / 30)
  check(v.vadState === "speech", `E speech confirmed on the fake mic (state ${v.vadState}, mic ${v.micStatus})`)
  mode = "zeros"; let doneAt = -1
  for (let i = 0; i < 60 && doneAt < 0; i++) { tick(v, 1 / 30); if (v.vadState === "done") doneAt = i + 1 }
  check(fired === 1 && doneAt > 0 && doneAt / 30 < 1.5, `E zeros after speech end the turn in ${(doneAt / 30).toFixed(2)} s (< noSignalSec)`)
}

// ── F. gate first: echo-cancelled zeros while our clip plays still re-arm the guard ──
{
  let busy = false, mode = "noise"
  const asset = fakeMic({src: (buf) => fill(buf, 533, mode === "loud" ? -30 : -60, mode === "zeros")})
  const v = fresh(); v.micAudio = asset; v.onAwake(); v.init({isBusy: () => busy}); v.setMicActive(true)
  for (let i = 0; i < 60; i++) tick(v, 1 / 30)
  v.start(-1, 1.13); for (let i = 0; i < 30; i++) tick(v, 1 / 30)
  check(v.vadState === "listening", `F listening (got ${v.vadState})`)
  busy = true; mode = "zeros"; for (let i = 0; i < 20; i++) tick(v, 1 / 30)
  check(v.vadState === "guard", `F zeros while busy → guard (got ${v.vadState})`)
  busy = false; mode = "loud"; tick(v, 1 / 30); tick(v, 1 / 30)   // ring-down right after the clip
  check(v.vadState === "guard", `F ring-down inside the tail guard is ignored (got ${v.vadState})`)
  check(v.pulse === 0 && v.micLevelDb === -120, "F indicator silent during the tail guard")
}

// ── G. maxFrameSize 0 → nosignal ──
{
  const asset = fakeMic({maxFrameSize: 0, src: () => 0})
  const v = fresh(); v.micAudio = asset; v.onAwake(); v.init(() => false)
  v.start(-1, 1.2)
  for (let i = 0; i < 60; i++) tick(v, 1 / 30)
  check(v.micStatus === "nosignal" && v.vadState === "nosignal" && !v.micAvailable, `G maxFrameSize 0 → nosignal (mic ${v.micStatus}, state ${v.vadState})`)
}

// ── H. zero-filled frames (Preview toggle off) do not set the rate; real audio later measures 16 kHz ──
{
  let on = false
  const asset = fakeMic({src: (buf) => on ? fill(buf, 533, -60) : fill(buf, 1024, 0, true)})
  const v = fresh(); v.micAudio = asset; v.onAwake(); v.init(() => false); v.setMicActive(true)
  for (let i = 0; i < 150; i++) tick(v, 1 / 30)
  check(v.micStatus === "nosignal" && v.sampleRateActual === 16000 && v.measuredRate === 0, `H zero frames: no rate adopted (rate ${v.sampleRateActual}, measured ${v.measuredRate})`)
  on = true
  for (let i = 0; i < 120; i++) tick(v, 1 / 30)
  check(v.micStatus === "ok" && v.sampleRateActual === 16000 && Math.abs(v.measuredRate - 15990) < 300, `H real audio: measured ${v.measuredRate}, rate stays ${v.sampleRateActual}`)
  check(v.calibrated, "H recalibrated after the signal returned")
}

// ── I. stuck gate still lets the timeout nudge fire; disable/enable does not fire a stale timeout ──
{
  const v = fresh(); v.ignoreMicForTests = true; v.init(() => true)    // gate stuck on
  let to = 0; v.onTimeout.add(() => to++)
  v.start(-1, 2.5)
  for (let i = 0; i < 30 * 20; i++) tick(v, 1 / 30)
  check(to === 1, `I stuck gate: timeout fired (${to}) after cap + 8 s; warning printed: ${globalThis.__prints.some((p) => p.includes("playback gate has been on"))}`)
  const w = fresh(); w.ignoreMicForTests = true; w.init(() => false)
  let to2 = 0; w.onTimeout.add(() => to2++)
  w.start(-1, 2.5); tick(w, 1 / 30)
  w.__ev.OnDisableEvent(); globalThis.__t += 30; w.__ev.OnEnableEvent(); tick(w, 1 / 30)
  check(to2 === 0 && w.vadState === "guard", `I re-enable: no stale timeout (fired ${to2}, state ${w.vadState})`)
}

// ── J. SFX during confirmed speech is tolerated with an isVoiceBusy gate; a voice clip still cuts ──
{
  let sfx = false, voice = false
  const v = fresh(); v.ignoreMicForTests = true
  v.init({isBusy: () => sfx || voice, isVoiceBusy: () => voice})
  v.start(-1, 2.5); v.injectBlocksForTest(-60, v.settleBlocks); v.injectBlocksForTest(-38, v.minSpeechBlocks + 2)
  sfx = true; v.injectBlocksForTest(-38, 10)
  check(v.vadState === "speech" && v.speechDetected, `J SFX in speech: still speech (got ${v.vadState})`)
  sfx = false; voice = true; v.injectBlocksForTest(-38, 1)
  check(v.vadState === "guard" && !v.speechDetected, `J voice clip in speech → guard (got ${v.vadState})`)
  voice = false
  const u = fresh(); u.ignoreMicForTests = true; u.init(() => false)
  u.start(-1, 2.5)
  check(u.saidIt() === true && u.speechSource === "button" && !u.speechDetected && u.saidIt() === false, "J saidIt(): ends once, source button, speechDetected stays false")
}

console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`)
process.exitCode = fails === 0 ? 0 : 1
