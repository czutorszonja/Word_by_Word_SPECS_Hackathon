// DEMO_Video.ts — LEAF scenario "DEMO_Video". Not a test: plays the demo video's shot list hands-free, the
// way a person would live through it, at a pace to talk over, in under three minutes (as Small Wins'
// demo scenario). TOUR_Story stays the end-to-end check; this is the recording.
// Shot list (times from the 27 Nov run without screen capture: done at 2:52):
//   0:00 outside   the pavement, the door ahead; choose the languages (I speak English, I'm learning
//                  Hungarian), Start; "Café detected (demo)"
//   0:09 street    glance at the tram stop: a word saved on an earlier outing answers (the fountain is
//                  hidden behind the café wall from the pavement, so the video leaves it out)
//   0:15 arrive    the app suggests what to do here → Learn; walk in through the door
//   0:27 learn     at the counter: point at the cucumber (label, silent), pinch (card, it speaks), Save;
//                  salami and tomato; "Use it live →"
//   0:45 prepare   the sentence for the counter: Use this word (salami), + és (tomato)
//   0:57 order     look up: the barista notices and greets; every reply is a suggestion, heard, then said;
//                  the prepared sentence answers "Mit kér bele?"
//   1:31 table     "Hányas asztalnál ül?": a glance at table 8's number fills the reply
//   1:58 practice  walk to table 8, sit, Menu → Practice, match the four pairs, close the board
//   2:28 words     Menu → Words saved → By category → Café, a word plays
//   2:38 languages Menu → Languages: I'm learning Hungarian, and German, Spanish… a pack away
//   2:48 end       stand up, the café
// Run it ALONE from the LEAF panel, Preview large, mouse off the Preview, Preview mic off. It hides the
// test tool's own overlay and prints "DEMO beat <name> at <s> s" for timing a voice-over.
// Test-only: camera moves are runtime-only and undone by the Lens reset LEAF performs before each scenario.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, tableCard, waitFor, WbwTester} from "./WbwLeafHelpers"
import {setTourPace, Tour} from "./StoryTour"

const D2R = Math.PI / 180
/** Seconds of the whole video, as a guard: the beats print their times, the end says if it ran long. */
const TARGET_SEC = 180

@component
export class DEMO_Video extends Scenario {
  private t0 = 0

  async run(): Promise<void> {
    const t = new WbwTester()
    const tour = new Tour(t)
    const m = t.main, o = t.order, a = t.audio
    setTourPace(0.85) // the tour's glides and reading pauses a little quicker than TOUR_Story, to land under 3:00
    this.t0 = getTime()
    try {
      await waitFor(() => m.setupPanel.isVisible && t.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)
      t.quietMouse()
      t.quietMic()
      this.hideTestOverlay()
      const cafeT = m.cafe.getSceneObject().getTransform()
      /** Café-local point (x, z, height above the café floor) in world space: the café is turned
       *  around the user for the outside start, so every pose goes through its transform. */
      const W = (x: number, z: number, h: number = 160): vec3 => cafeT.getWorldTransform().multiplyPoint(new vec3(x, h, z))
      /** Café-local direction (yaw 0 = toward the counter, +90 = to the left) from a café-local eye. */
      const ahead = (x: number, z: number, h: number, yaw: number, pitch: number): vec3 => {
        const r = 300
        return W(x - Math.sin(yaw * D2R) * r, z - Math.cos(yaw * D2R) * r, h + Math.tan(pitch * D2R) * r)
      }
      /** Walk / turn to a café-local eye, looking along a café-local yaw and pitch. */
      const go = async (x: number, z: number, yaw: number, pitch: number, secs: number, turn?: "left" | "right", h: number = 160) => {
        await tour.glide({at: W(x, z, h), look: ahead(x, z, h, yaw, pitch)}, secs, "inOut", turn)
      }

      // ════════ 0:00 outside: the languages, Start ════════
      this.mark("outside")
      const eye0 = t.camPos()
      await tour.start(eye0, 0, -4) // the café starts turned so the door is ahead (DC6)
      await sleep(2400) // room to introduce the app; the café finishes aligning under the user
      await tour.point("SetupSpeakEnglish", 0.9)
      await tour.point("SetupLearnHungarian", 1.4)
      await tour.unpoint()
      await sleep(600)
      await tour.tap("SetupConfirmButton")
      await waitFor(() => m.setupComplete && !m.setupPanel.isVisible, "setup complete")
      await waitFor(() => t.toast.lastMessage === "Café detected (demo)", "'Café detected (demo)'", 5000)
      await sleep(1200)

      // ════════ 0:12 street words from earlier outings ════════
      this.mark("street")
      await tour.glide({look: "Learnable_megallo", dPitch: 2}, 1.6, "inOut")
      await tour.point("Learnable_megallo", 2.2)
      await tour.tap("Learnable_megallo") // a pinch says the word, no card
      await waitFor(() => a.lastVoiceKey === "w_megallo", "the tram stop says 'megálló'", 4000)
      await t.waitAudioIdle()
      await sleep(600)
      await tour.unpoint()

      // ════════ 0:25 the app suggests what to do here → Learn; walk in ════════
      this.mark("arrive")
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLearnButton"), "the suggestion panel", 12000)
      await tour.glide({look: "SuggestLearnButton", dPitch: 4}, 1.4, "inOut")
      await sleep(1000)
      await tour.point("SuggestLearnButton", 1.2)
      await tour.tap("SuggestLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn picked")
      await sleep(600)
      await go(-760, 20, -90, -4, 1.4) // face the door again
      await go(-640, 20, -90, -2, 2.2)  // the door swings open
      await go(-420, 22, -90, -4, 2.6)
      await go(-150, 30, -40, -10, 2.8)

      // ════════ 0:40 learn at the counter ════════
      this.mark("learn")
      await go(0, 0, 0, -22, 2.0)
      await sleep(900)
      await tour.glide({look: "Learnable_uborka_friss", dPitch: 6}, 0.9)
      await tour.point("Learnable_uborka_friss", 2.2) // the label: silent
      await tour.tap("Learnable_uborka_friss")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "uborka_friss", "the cucumber's card")
      await t.waitAudioIdle()
      await sleep(700)
      await tour.tap("WordCardSaveButton")
      await waitFor(() => t.card.savedShown, "cucumber saved")
      await sleep(600)
      for (const id of ["szalami", "paradicsom"]) {
        await tour.point(`Learnable_${id}`, 1.0)
        await tour.tap(`Learnable_${id}`)
        await waitFor(() => t.card.isVisible && t.card.currentWordId === id, `${id} card`)
        await t.waitAudioIdle()
        await tour.tap("WordCardSaveButton")
        await waitFor(() => m.savedWords.indexOf(id) >= 0, `${id} saved`)
        await sleep(400)
      }
      await tour.unpoint()
      await tour.tap("WordCardUseLiveButton")
      await waitFor(() => m.currentMode === "live" && o.phraseHelperVisible, "Use it live with the phrase helper", 5000)

      // ════════ 1:05 prepare the sentence ════════
      this.mark("prepare")
      await tour.glide({look: "PhraseHelper", dPitch: -1}, 0.8)
      await sleep(1100)
      await tour.point("Learnable_szalami", 0.9)
      await waitFor(() => t.hasEnabledInteractable("UseThisWordButton"), "Use this word", 2000)
      await tour.tap("UseThisWordButton")
      await tour.unpoint()
      await t.waitAudioIdle()
      await sleep(500)
      await tour.point("Learnable_paradicsom", 0.9)
      await waitFor(() => t.hasEnabledInteractable("AddWordButton"), "+ és", 2000)
      await tour.tap("AddWordButton")
      await tour.unpoint()
      await waitFor(() => o.phraseSlotIds.join(",") === "szalami,paradicsom", "salami and tomato in the sentence")
      await t.waitAudioIdle(14000)
      await sleep(500)

      // ════════ 1:15 the order ════════
      this.mark("order")
      await tour.lookUpAtServer(1.0)
      o.serverNotices = true // held back while the sentence was prepared at the counter
      await waitFor(() => o.orderStep === 1, "the barista notices and greets", 6000)
      o.serverNotices = false
      await tour.answerTurn(1, "szendvicset", "p_szendvicset_kerek")
      await tour.lookUpAtServer(0.6)
      await t.waitForUserTurn(2)
      await tour.lookAt("PhraseHelper", 0.6, 0, -2)
      await sleep(1000)
      await tour.sayIt(2) // the prepared sentence is the answer
      await tour.lookUpAtServer(0.6)
      await tour.answerTurn(3, "tejes_kave", "p_tejes_kave")
      await tour.lookUpAtServer(0.6)
      await tour.answerTurn(4, "itt_eszem", "p_itt_eszem")
      await tour.lookUpAtServer(0.6)

      // ════════ 1:45 the table number, read by a glance ════════
      this.mark("table")
      await waitFor(() => o.orderStep === 5 && o.waitingFor === "table", "'Hányas asztalnál ül?'", 15000)
      await tour.lookAt("PhraseChoices", 0.7, 0, -2)
      await sleep(1100) // "A … asztalnál ülök." waits with its blank
      const lookSec = o.tableLookSec
      o.tableLookSec = 60 // the turn sweeps past other tables; read only once the head rests on 8
      await go(0, 0, 180, -8, 2.0, "left")
      await go(-140, 90, 141, -10, 2.0)
      await tour.glide({look: "TableNumberButton_8"}, 0.8)
      o.tableLookSec = lookSec
      try {
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "a glance at table 8 reads it", 3500)
      } catch (e) {
        log("demo: the glance did not read table 8; tapping it instead")
        await tour.tap("TableNumberButton_8")
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "table 8 read", 3000)
      }
      await sleep(1300)
      await go(0, 0, 0, -4, 2.6, "right")
      await t.waitForUserTurn(5, 10000)
      await tour.answerTurn(5, "nyolcas_asztal", "p_nyolcas_asztal")
      await tour.lookUpAtServer(0.6)
      await tour.answerTurn(6, "koszonom", "p_koszonom")
      await waitFor(() => o.orderStep === 7, "the order is done", 8000)
      await tour.lookUpAtServer(0.6)
      await sleep(700)

      // ════════ 2:10 practice at table 8 ════════
      this.mark("practice")
      // café-local layout: row 1 tables at z 220 (table 2 x -315, chairs x -365/-265; table 4 x -105,
      // chairs -155/-55), row 2 at z 410 (table 8 x -200, its one chair x -250). Walk along the open floor
      // in front of the counter, up the aisle between tables 2 and 4 (x -210), then round to the chair.
      const t8 = cafeT.getInvertedWorldTransform().multiplyPoint(tour.posOf("Table_8"))
      const table = W(t8.x + 60, t8.z, t8.y + 105) // eyes on the table while walking to it (not the back wall); above its top, so the last step does not stare down at the wood
      await go(-60, 60, 120, -8, 1.0, "left")
      await tour.glide({at: W(-210, 120), look: table}, 1.8, "inOut", "left")
      await tour.glide({at: W(-210, 320), look: table}, 1.9)
      await tour.glide({at: W(-305, 355), look: table}, 1.3) // round the chair
      // the free chair on table 8's counter side: sit (eye about 120 cm above the table's base)
      await tour.glide({at: W(t8.x - 57, t8.z, t8.y + 120), look: W(t8.x + 300, t8.z, t8.y + 56)}, 1.6, "inOut", "left")
      await sleep(800)
      await tour.tap("MenuButton")
      await sleep(900)
      await tour.tap("ModePracticeButton")
      const p = t.practice
      await waitFor(() => p.active && t.board.state === "board" && p.pairsTotal === 4, "the practice board", 5000)
      await sleep(1500)
      let matched = 0
      for (const id of p.leftIds.slice()) {
        await tour.tap(`PracticeHu_${id}`)
        await sleep(450)
        await tour.tap(`PracticeEn_${id}`)
        matched++
        await waitFor(() => p.pairsMatched === matched, `pair ${id}`)
        await t.waitAudioIdle()
        await sleep(300)
      }
      await waitFor(() => p.complete, "all pairs matched", 8000)
      await sleep(1500)
      await tour.tap("PracticeDoneButton") // done: the board closes (else it would stay over the table)
      await sleep(500)

      // ════════ 2:35 the saved words ════════
      this.mark("words")
      await tour.tap("MenuButton")
      await sleep(900)
      await tour.tap("WordsSavedButton")
      await waitFor(() => m.wordListOpen, "saved words")
      await sleep(1000)
      await tour.tap("WordsViewCategory")
      await sleep(1000)
      await tour.tap("WordsCategory_Café")
      await sleep(700)
      await tour.tap("WordTile_szalami")
      await t.waitAudioIdle()
      await sleep(900)
      await tour.tap("WordsCloseButton")
      await sleep(500)

      // ════════ 2:45 languages: the pair is a setting ════════
      this.mark("languages")
      await tour.tap("MenuButton")
      await sleep(800)
      await tour.tap("LanguagesButton")
      await waitFor(() => m.languagesOpen, "Languages")
      await sleep(1200)
      await tour.tap("LanguagesLearn")
      await sleep(1200)
      await tour.point("Language_de", 0.6)
      await tour.tap("Language_de") // "Deutsch is not in this demo yet…"
      await sleep(2000)
      await tour.unpoint()
      await tour.tap("LanguagesCloseButton")
      await sleep(400)

      // ════════ 2:55 stand up: the café ════════
      this.mark("end")
      // stand and turn the short way (left) back toward the counter; a forced right turn spun 270°
      await tour.glide({at: W(t8.x - 45, t8.z, t8.y + 160), look: ahead(t8.x - 45, t8.z, t8.y + 160, 0, -3)}, 1.8, "inOut")
      await sleep(2500) // hold the last shot; after "DEMO done" the camera jumps back to the start pose
      const total = getTime() - this.t0
      log(`DEMO done in ${total.toFixed(1)} s${total > TARGET_SEC ? ` (over ${TARGET_SEC} s: shorten the sleeps)` : ""}`)
    } finally {
      await tour.unpoint()
      t.restoreHead()
    }
  }

  /** Prints how far into the video each beat starts, for timing the voice-over. */
  private mark(beat: string): void {
    log(`DEMO beat ${beat} at ${(getTime() - this.t0).toFixed(1)} s`)
    this.hideTestOverlay() // LEAF makes its overlay on its first log line, which can come after the start
  }

  /** LEAF's own status overlay (Leaf.lspkg Utils/common/Logger.ts makes "LeafDebugUICamera") would show in the recording. */
  private hideTestOverlay(): void {
    for (const name of ["LeafDebugUICamera"]) {
      const so = findSceneObjectByName(name)
      if (so) so.enabled = false
    }
  }
}
