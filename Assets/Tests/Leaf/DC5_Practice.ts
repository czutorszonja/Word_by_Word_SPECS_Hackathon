// DC5_Practice — Done criterion 5 (Practice).
// "After saving at least four words, I choose Practice at my table and see eight face-up cards on
//  an upright panel just above the table: four illustrated Hungarian cards and four shuffled
//  English cards. I click one card and then its translation. Correct pairs turn green with
//  checkmarks, play the word, become inactive and update 'x / 4 pairs'. Wrong pairs show
//  'Try again' and become clickable again. After all four I see a completion state and can start
//  another set or close the board, then return to another mode through the menu."
// Drives: real SIK triggers to save 4 words in Learn, head pose to walk to table 8, menu →
//         ModePracticeButton, PracticeHu_<id> / PracticeEn_<id> cards, PracticeNewSetButton,
//         PracticeCloseButton, then menu → ModeLearnButton.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {child, findEnabled, horiz, log, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"

const HU: {[id: string]: string} = {olivabogyo: "olívabogyó", sajt: "sajt", sonka: "sonka", uborka: "savanyú uborka"}
const EN: {[id: string]: string} = {olivabogyo: "olives", sajt: "cheese", sonka: "ham", uborka: "pickles"}

@component
export class DC5_Practice extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      await t.completeSetup()
      const m = t.main, p = t.practice, b = t.board, a = t.audio

      // ── save four words in Learn ──
      await t.setHead(t.eyeAt(0, 0), 0, -15)
      for (const id of ["olivabogyo", "sajt", "sonka", "uborka"]) await t.learnAndSave(id)
      expect(m.savedCount, "four words saved").toBe(4)

      // ── walk to table 8 and choose Practice ──
      const table = findEnabled("Table_8")!.getTransform().getWorldPosition()
      const seat = table.add(new vec3(0, 160, -80)) // standing 80 cm in front of table 8 (counter side), read at runtime
      await t.setHead(seat, t.yawToward(seat, table), -25)
      await t.switchModeViaMenu("ModePracticeButton", "practice")
      await waitFor(() => p.active && b.state === "board" && p.pairsTotal === 4, `practice board with a 4-pair set (state '${b.state}', pairs ${p.pairsTotal})`, 5000)
      expect(p.placedAt, "board placed at the table").toBe("table")
      expect(p.boardTable, "board above table 8").toBe(8)
      const boardRoot = findEnabled("PracticeBoard")!
      const bp = boardRoot.getTransform().getWorldPosition()
      const tableTopY = table.y + 76
      expect(bp.y > tableTopY && bp.y < tableTopY + 60, `board just above the table top (board y ${bp.y.toFixed(0)}, table top ${tableTopY.toFixed(0)})`).toBe(true)
      expect(horiz(bp, table) < 40, `board over the table (${horiz(bp, table).toFixed(0)} cm off-centre)`).toBe(true)
      const up = boardRoot.getTransform().up
      // faces the user (tilted toward the eyes), but must be closer to upright than lying flat
      log(`board up vector ${up} (tilt from vertical ${(Math.acos(Math.min(1, up.y)) * 180 / Math.PI).toFixed(0)} deg)`)
      expect(up.y > 0.6, `board is (near-)upright (up.y ${up.y.toFixed(2)})`).toBe(true)

      // eight face-up cards: 4 illustrated HU + 4 shuffled EN
      expect(p.leftIds.length, "4 Hungarian cards").toBe(4)
      expect(p.rightIds.length, "4 English cards").toBe(4)
      expect(p.leftIds.slice().sort().join(","), "set uses the saved words").toBe(m.savedWords.slice().sort().join(","))
      expect(p.rightIds.slice().sort().join(","), "same words on both sides").toBe(p.leftIds.slice().sort().join(","))
      expect(p.rightIds.join(",") !== p.leftIds.join(","), "English column is shuffled vs Hungarian").toBe(true)
      for (const id of p.leftIds) {
        const hu = findEnabled(`PracticeHu_${id}`)
        expect(hu !== undefined && t.hasEnabledInteractable(`PracticeHu_${id}`), `PracticeHu_${id} card clickable`).toBe(true)
        expect(textOf("Label", hu!), `PracticeHu_${id} text`).toBe(HU[id])
        expect(child(hu!, "Picture") !== undefined, `PracticeHu_${id} illustrated`).toBe(true)
        const en = findEnabled(`PracticeEn_${id}`)
        expect(en !== undefined && t.hasEnabledInteractable(`PracticeEn_${id}`), `PracticeEn_${id} card clickable`).toBe(true)
        expect(textOf("Label", en!), `PracticeEn_${id} text`).toBe(EN[id])
      }
      expect(b.progressText, "progress starts at 0 / 4").toBe("0 / 4 pairs")
      expect(textOf("PracticeProgress"), "progress text visible").toBe("0 / 4 pairs")

      // ── wrong pair → "Try again", cards clickable again ──
      const first = p.leftIds[0]
      const wrong = p.rightIds.filter((id) => id !== first)[0]
      const wrong0 = p.wrongAttempts
      await t.tap(`PracticeHu_${first}`)
      await waitFor(() => p.selected === `hu:${first}`, "first card selected")
      await t.tap(`PracticeEn_${wrong}`)
      await waitFor(() => p.wrongAttempts === wrong0 + 1, "wrong attempt counted")
      expect(b.feedbackText, "wrong pair feedback").toBe("Try again")
      expect(textOf("PracticeFeedback"), "feedback text visible").toBe("Try again")
      expect(p.selected, "selection cleared after wrong pair").toBe("")
      expect(p.pairsMatched, "nothing matched").toBe(0)
      expect(a.lastSfxKey, "wrong sound").toBe("MatchWrong")
      // clickable again
      await t.tap(`PracticeEn_${wrong}`)
      await waitFor(() => p.selected === `en:${wrong}`, "wrong card clickable again after 'Try again'")
      await t.tap(`PracticeHu_${first}`) // en:wrong + hu:first → another wrong pair, resets selection
      await waitFor(() => p.wrongAttempts === wrong0 + 2 && p.selected === "", "second wrong pair resets selection")

      // ── four correct pairs ──
      let matched = 0
      for (const id of p.leftIds.slice()) {
        const plays = a.voicePlayCount
        await t.tap(`PracticeHu_${id}`)
        await waitFor(() => p.selected === `hu:${id}`, `hu:${id} selected`)
        await t.tap(`PracticeEn_${id}`)
        matched++
        await waitFor(() => p.pairsMatched === matched, `pair ${id} matched`)
        expect(p.matchedIds.indexOf(id) >= 0, `${id} in matchedIds`).toBe(true)
        expect(a.voicePlayCount > plays && a.lastVoiceKey === `w_${id}`, `match plays the word w_${id} (got ${a.lastVoiceKey})`).toBe(true)
        if (matched < 4) {
          expect(b.progressText, `progress after ${matched}`).toBe(`${matched} / 4 pairs`)
          expect(textOf("PracticeProgress"), `progress text after ${matched}`).toBe(`${matched} / 4 pairs`)
          expect(b.feedbackText, `match feedback for ${id}`).toBe(`${HU[id]} = ${EN[id]}`)
          for (const side of ["Hu", "En"]) {
            const so = findEnabled(`Practice${side}_${id}`)!
            const fill = child(so, "MatchedFill"), check = child(so, "Check")
            expect(fill !== undefined && fill.enabled, `Practice${side}_${id} turns green (MatchedFill)`).toBe(true)
            expect(check !== undefined && check.enabled, `Practice${side}_${id} shows a checkmark`).toBe(true)
          }
          // inactive: tapping a matched card does nothing
          await t.tap(`PracticeHu_${id}`)
          await sleep(100)
          expect(p.selected, `matched card ${id} is inactive`).toBe("")
          expect(p.pairsMatched, "tap on matched card changes nothing").toBe(matched)
        }
      }

      // ── completion state ──
      await waitFor(() => p.complete && b.state === "complete", "completion state after 4 pairs", 8000)
      expect(b.progressText, "progress 4 / 4").toBe("4 / 4 pairs")
      expect(textOf("Bravo"), "completion message").toBe("Szuper! All pairs matched.")
      expect(t.hasEnabledInteractable("PracticeNewSetButton"), "New set button").toBe(true)
      expect(t.hasEnabledInteractable("PracticeDoneButton"), "Close (done) button").toBe(true)

      // ── another set ──
      await t.tap("PracticeNewSetButton")
      await waitFor(() => b.state === "board" && !p.complete && p.pairsMatched === 0 && p.pairsTotal === 4, "new set started")
      expect(b.progressText, "new set progress").toBe("0 / 4 pairs")

      // ── close the board ──
      await t.tap("PracticeCloseButton")
      await waitFor(() => !b.isVisible, "board closed")
      expect(m.currentMode, "closing the board leaves Practice").toBe("none")
      expect(p.active, "practice inactive").toBe(false)

      // ── return to another mode through the menu ──
      await t.switchModeViaMenu("ModeLearnButton", "learn")
      expect(t.learn.active, "Learn active again").toBe(true)
      expect(m.savedCount, "saved words kept").toBe(4)
      log("DC5 done")
    } finally {
      t.restoreHead()
    }
  }
}
