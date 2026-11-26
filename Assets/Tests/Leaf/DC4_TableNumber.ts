// DC4_TableNumber — Done criterion 4 (Use it live, table).
// "After 'Hányas asztalnál ül?', the reply 'A … asztalnál ülök.' waits with its blank. I look round
//  at the tables (nothing tells me to); occupied tables stay as they are, and when I look at the
//  number on an empty table (4, 8 or 12) I see and hear it (e.g. '8 = nyolc'). Back at the counter I
//  can answer with the matching phrase ('A nyolcas asztalnál ülök.'), and the server answers
//  'Jó étvágyat!'. Nothing tells me where to go afterwards." (26 Nov: no coach hint, arrow or chime)
// Drives: real SIK triggers through the whole order (prep and steps 1–4 shared with DC3), a real
//         head turn (camera yaw 180° → seating, a look at table 8's number, back to 0° → counter),
//         PhraseCard_nyolcas_asztal and PhraseCard_koszonom, each answered with SaidItButton
//         (choosing a card plays it; only saying it moves the order on).
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

      // no arrow or hint asks the user to turn
      await sleep(200)
      expect(t.hint.arrowVisible, "no edge arrow at the table question").toBe(false)
      expect(t.hint.hintText, "no coach hint at the table question").toBe("")

      // ── turn around to the seating (reading by looking is paused for the occupied-table checks) ──
      const lookSec = o.tableLookSec
      o.tableLookSec = 60
      await t.setHead(t.eyeAt(0, 0), 180, -5)

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

      // ── look at table 8's number: "8 = nyolc" + audio ──
      o.tableLookSec = lookSec
      await t.lookAt(t.eyeAt(0, 0), tableCard(8).getSceneObject().getTransform().getWorldPosition())
      await waitFor(() => tableCard(8).popupText === "8 = nyolc", "looking at table 8 reads it: '8 = nyolc'", 4000)
      expect(o.tableReadBy, "read by looking, not tapping").toBe("look")
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
      await t.sayIt()

      // ── server: "Jó étvágyat!" → "Köszönöm!" ──
      await checkServerTurn(t, 6, "Jó étvágyat!", "Enjoy your meal!", "s_jo_etvagyat")
      expect(o.offeredPhraseIds.join(","), "step 6 offers Köszönöm").toBe("koszonom")
      await t.tap("PhraseCard_koszonom")
      await t.sayIt()
      await waitFor(() => o.orderStep === 7 && o.waitingFor === "done", "order complete (step 7)", 15000)
      expect(a.lastVoiceKey, "Köszönöm audio").toBe("p_koszonom")
      expect(t.hint.hintText, "no instruction after the order: it is the learner's visit").toBe("")
      expect(t.hint.arrowVisible, "no arrow after the order").toBe(false)
      log("DC4 done")
    } finally {
      t.restoreHead()
    }
  }
}
