// DC4_TableNumber — Done criterion 4 (Use it live, table).
// "After 'Hányas asztalnál ül?', I turn around, see occupied and empty tables, select the number
//  card on an empty table (4, 8 or 12) and see and hear it (e.g. '8 = nyolc'). Back at the
//  counter I can answer with the matching phrase ('A nyolcas asztalnál ülök.'), and the server
//  answers 'Jó étvágyat!'"
// Drives: real SIK triggers through the whole order (steps 1–4 shared with DC3), a real head
//         turn (camera yaw 180° → seating, back to 0° → counter), TableNumberButton_8,
//         PhraseCard_nyolcas_asztal and PhraseCard_koszonom.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findEnabled, log, tableCard, textOf, waitFor, WbwTester} from "./WbwLeafHelpers"
import {checkServerTurn, orderUpToTable} from "./DC3_OrderingAtCounter"

@component
export class DC4_TableNumber extends Scenario {
  async run(): Promise<void> {
    const t = new WbwTester()
    try {
      await t.completeSetup()
      const o = t.order, a = t.audio
      await t.setHead(t.eyeAt(0, 0), 0, -15)
      await t.switchModeViaMenu("ModeUseLiveButton", "live")
      await orderUpToTable(t)

      // facing the counter, the seating is behind: the edge arrow asks the user to turn
      await sleep(200)
      expect(t.hint.arrowVisible, "edge arrow visible while the seating is behind the user").toBe(true)

      // ── turn around to the seating ──
      await t.setHead(t.eyeAt(0, 0), 180, -5)
      await waitFor(() => !t.hint.arrowVisible, "edge arrow hides once the seating is in view", 3000)

      // occupied tables: plain number cards (not selectable); empty tables: selectable buttons
      // (UIKit's BackPlate always adds a passive Interactable, so "not selectable" is checked
      //  behaviourally: no Button, and actually tapping the card changes nothing)
      for (const n of [2, 5, 7, 10]) {
        const occ = findEnabled(`TableNumberCard_${n}`)
        expect(occ !== undefined, `occupied table ${n} shows a number card`).toBe(true)
        expect(occ!.getComponent(Button.getTypeName()) === null, `occupied table ${n} card is not a Button`).toBe(true)
        expect(findEnabled(`TableNumberButton_${n}`) === undefined, `occupied table ${n} has no button`).toBe(true)
        expect(textOf("Number", occ), `occupied table ${n} number text`).toBe(`${n}`)
      }
      const voice0 = a.voicePlayCount
      await t.tap("TableNumberCard_5")
      await sleep(300)
      expect(o.lastTableTapped, "tapping occupied table 5 does not select it").toBe(0)
      expect(o.chosenTable, "no table chosen by tapping an occupied one").toBe(0)
      expect(tableCard(5).popupText, "no translation popup on an occupied table").toBe("")
      expect(a.voicePlayCount, "no audio on an occupied table").toBe(voice0)
      expect(o.waitingFor, "still waiting for an empty table").toBe("table")
      for (const n of [4, 8, 12]) {
        expect(t.hasEnabledInteractable(`TableNumberButton_${n}`), `empty table ${n} has a selectable number card`).toBe(true)
        expect(textOf("Number", findEnabled(`TableNumberButton_${n}`)), `empty table ${n} number text`).toBe(`${n}`)
      }

      // ── select table 8: "8 = nyolc" + audio ──
      await t.tap("TableNumberButton_8")
      await waitFor(() => tableCard(8).popupText === "8 = nyolc", "table 8 popup '8 = nyolc'", 3000)
      expect(findEnabled("TableTranslation_8") !== undefined, "TableTranslation_8 popup visible").toBe(true)
      expect(textOf("Line", findEnabled("TableTranslation_8")), "popup text").toBe("8 = nyolc")
      expect(a.lastVoiceKey, "number audio n_8 played").toBe("n_8")
      expect(o.lastTableTapped, "lastTableTapped").toBe(8)
      expect(o.chosenTable, "chosenTable").toBe(8)

      // ── turn back to the counter: only the matching phrase is offered ──
      await t.setHead(t.eyeAt(0, 0), 0, -15)
      await t.waitForUserTurn(5, 10000)
      expect(o.offeredPhraseIds.join(","), "only the phrase for table 8 is offered").toBe("nyolcas_asztal")
      expect(findEnabled("PhraseCard_negyes_asztal") === undefined, "table 4 phrase not offered").toBe(true)
      expect(findEnabled("PhraseCard_tizenkettes_asztal") === undefined, "table 12 phrase not offered").toBe(true)
      const card = findEnabled("PhraseCard_nyolcas_asztal")!
      expect(textOf("Hu", card), "table 8 phrase HU").toBe("A nyolcas asztalnál ülök.")
      expect(textOf("En", card), "table 8 phrase EN").toBe("I'm at table eight.")
      await t.tap("PhraseCard_nyolcas_asztal")
      await waitFor(() => a.lastVoiceKey === "p_nyolcas_asztal", "table phrase plays its audio")

      // ── server: "Jó étvágyat!" → "Köszönöm!" ──
      await checkServerTurn(t, 6, "Jó étvágyat!", "Enjoy your meal!", "s_jo_etvagyat")
      expect(o.offeredPhraseIds.join(","), "step 6 offers Köszönöm").toBe("koszonom")
      await t.tap("PhraseCard_koszonom")
      await waitFor(() => o.orderStep === 7 && o.waitingFor === "done", "order complete (step 7)", 15000)
      expect(a.lastVoiceKey, "Köszönöm audio").toBe("p_koszonom")
      expect(t.hint.hintText.indexOf("Walk to table 8") >= 0, `final hint names table 8 (got '${t.hint.hintText}')`).toBe(true)
      expect(t.hint.hintText.indexOf("Practice") >= 0, "final hint suggests Practice").toBe(true)
      log("DC4 done")
    } finally {
      t.restoreHead()
    }
  }
}
