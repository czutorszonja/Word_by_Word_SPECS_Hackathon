// DEMO_Video.ts — LEAF scenario "DEMO_Video". Not a test: plays the demo video's shot list hands-free, the
// way a person would live through it, at a pace to talk over, in under three minutes (as Small Wins'
// demo scenario). TOUR_Story stays the end-to-end check; this is the recording.
// 28 Nov story (after the learner watched the first cut: "I keep looking down… too much talking… it was
// not obvious the Specs recognised a café… it feels like a game"):
//   outside   choose the languages, Start; glance at the tram stop: a word saved on an earlier outing
//   arrive    walk up to the door: "Looks like you're at Kifli Kávézó. Want help ordering?" → Yes
//   prepare   at the counter, the sentence is built by pointing: the labels name the things; Use this
//             word (salami), + és (tomato); the card floats above the ingredients, not on the counter
//   order     look up at the barista: everything sits under his face. His greeting; after a pause ONE
//             suggestion appears and is said; the prepared sentence is the second reply; the table
//             number is read by a glance; "Jó étvágyat!" ends it
//   practice  walk to table 8, sit, Menu → Practice: the words just used are in the set
//   learn     Menu → Learn at the table: the menu board's coffee line is named and saved
//   words     Menu → Words saved → By category → Café, a word plays
//   languages Menu → Languages: I'm learning Hungarian, and German, Spanish… a pack away
//   end       stand up, the café
// Run it ALONE from the LEAF panel, Preview large, mouse off the Preview, Preview mic off. It hides the
// test tool's own overlay and prints "DEMO beat <name> at <s> s" for timing a voice-over.
// Test-only: camera moves are runtime-only and undone by the Lens reset LEAF performs before each scenario.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {log, tableCard, waitFor, WbwTester} from "./WbwLeafHelpers"
import {setTourPace, Tour} from "./StoryTour"
import {ORDER_DONE} from "../../Scripts/WbwVocab"

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

      // ════════ outside: the languages, Start, a street word ════════
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
      await sleep(800)
      await tour.glide({look: "Learnable_megallo", dPitch: 2}, 1.6, "inOut")
      await tour.point("Learnable_megallo", 2.0)
      await tour.tap("Learnable_megallo") // a pinch says the word, no card
      await waitFor(() => a.lastVoiceKey === "w_megallo", "the tram stop says 'megálló'", 4000)
      await t.waitAudioIdle()
      await sleep(500)
      await tour.unpoint()

      // ════════ arrive: at the door the glasses recognise the café ════════
      this.mark("arrive")
      await go(-760, 20, -90, -2, 1.6) // face the door
      await go(-712, 20, -90, -2, 1.4) // a step toward it
      await waitFor(() => m.suggestionVisible && t.hasEnabledInteractable("SuggestLiveButton"), "the offer at the door", 8000)
      await tour.glide({look: "SuggestionPanel", dPitch: 0}, 0.8)
      await sleep(2600) // "Looks like you're at Kifli Kávézó. Want help ordering?"
      await tour.point("SuggestLiveButton", 1.0)
      await tour.tap("SuggestLiveButton")
      await waitFor(() => m.currentMode === "live" && o.phraseHelperVisible, "Yes: help with ordering", 5000)
      await tour.unpoint()
      await go(-640, 20, -90, -2, 1.8)  // the door swings open
      await go(-420, 22, -90, -4, 2.4)
      await go(-150, 30, -40, -10, 2.6)

      // ════════ prepare the sentence by pointing ════════
      this.mark("prepare")
      await go(0, 0, 0, -26, 2.0)
      await sleep(900) // the card glides in above the ingredients: "Point at an ingredient…"
      await tour.point("Learnable_uborka_friss", 1.4) // the labels name the things (silent)
      await tour.point("Learnable_szalami", 1.0)
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
      await sleep(900)

      // ════════ the order: everything under his face ════════
      this.mark("order")
      // the learner looks at his face; the conversation sits just under it
      const face = o.server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, o.server.heightCm - 12, 0))
      const lookAtHim = async (secs: number) => { await tour.glide({look: face}, secs) }
      await lookAtHim(1.0)
      o.serverNotices = true // held back while the sentence was prepared at the counter
      await waitFor(() => o.orderStep === 1, "the barista notices and greets", 6000)
      o.serverNotices = false
      // nothing shows after his question; the learner hesitates and ONE suggestion appears
      await waitFor(() => o.hesitating, "a silent moment after his question", 10000)
      await t.waitForUserTurn(1)
      await sleep(2400) // the one suggestion, readable before it is said
      await tour.sayIt(1) // said straight away (Said it stands in for the voice)
      await t.waitForUserTurn(2)
      await sleep(1600) // his question gives way to the learner's own sentence
      await tour.sayIt(2)

      // ════════ the table number, read by a glance ════════
      this.mark("table")
      await waitFor(() => o.orderStep === 3 && o.waitingFor === "table", "'Hányas asztalnál ül?'", 15000)
      await sleep(1600) // "A … asztalnál ülök." waits with its blank
      const lookSec = o.tableLookSec
      o.tableLookSec = 60 // the turn sweeps past other tables; read only once the head rests on 8
      await go(0, 0, 180, -8, 2.0, "left")
      await tour.glide({look: "TableNumberButton_8"}, 1.0)
      o.tableLookSec = lookSec
      try {
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "a glance at table 8 reads it", 3500)
      } catch (e) {
        log("demo: the glance did not read table 8; tapping it instead")
        await tour.tap("TableNumberButton_8")
        await waitFor(() => tableCard(8).popupText === "8 = nyolc", "table 8 read", 3000)
      }
      await sleep(1300)
      await lookAtHim(2.2)
      await t.waitForUserTurn(3, 10000)
      await sleep(1200)
      // the reply is picked by pointing, head still on him (nobody looks down to order any more)
      await tour.point("PhraseCard_nyolcas_asztal", 0.6)
      await tour.tap("PhraseCard_nyolcas_asztal")
      await tour.unpoint()
      await waitFor(() => a.lastVoiceKey === "p_nyolcas_asztal", "the reply plays")
      await t.waitAudioIdle()
      await tour.sayIt(3)
      await waitFor(() => o.orderStep === ORDER_DONE, "'Jó étvágyat!' ends the order", 12000)
      await sleep(1600)

      // ════════ practice at table 8 ════════
      this.mark("practice")
      // café-local layout: row 1 tables at z 220 (table 2 x -315, chairs x -365/-265; table 4 x -105,
      // chairs -155/-55), row 2 at z 410 (table 8 x -200, its one chair x -250). Walk along the open floor
      // in front of the counter, up the aisle between tables 2 and 4 (x -210), then round to the chair.
      const t8 = cafeT.getInvertedWorldTransform().multiplyPoint(tour.posOf("Table_8"))
      const table = W(t8.x + 60, t8.z, t8.y + 105) // eyes on the table while walking to it
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
      log(`demo: practice set ${p.leftIds.join(",")} (kept from the order: ${o.keptFromOrder.join(",")})`)
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

      // ════════ learn: a word from where you sit ════════
      this.mark("learn")
      await tour.tap("MenuButton")
      await sleep(800)
      await tour.tap("ModeLearnButton")
      await waitFor(() => m.currentMode === "learn", "Learn from the menu")
      await tour.glide({look: "Learnable_tejeskave", dPitch: 0}, 1.8, "inOut") // the menu board over the counter
      await tour.point("Learnable_tejeskave", 1.6) // its name: tejeskávé / coffee with milk (silent)
      await tour.tap("Learnable_tejeskave")
      await waitFor(() => t.card.isVisible && t.card.currentWordId === "tejeskave", "the word card", 4000)
      await t.waitAudioIdle()
      await sleep(600)
      await tour.tap("WordCardSaveButton")
      await waitFor(() => t.card.savedShown, "saved")
      await sleep(900)
      await tour.unpoint()
      await tour.tap("WordCardCloseButton")
      await sleep(500)

      // ════════ the saved words ════════
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

      // ════════ languages: the pair is a setting ════════
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

      // ════════ stand up: the café ════════
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
