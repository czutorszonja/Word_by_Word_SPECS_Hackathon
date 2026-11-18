// LeafIndex.ts — registers the Word by Word LEAF scenarios (one per done criterion in
// devpost/design-brief.md). Attached to the root SceneObject "LeafIndex".
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {DC1_ModeMenu} from "./DC1_ModeMenu"
import {DC2_Learn} from "./DC2_Learn"
import {DC3_OrderingAtCounter} from "./DC3_OrderingAtCounter"
import {DC4_TableNumber} from "./DC4_TableNumber"
import {DC5_Practice} from "./DC5_Practice"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "DC1_ModeMenu", typename: DC1_ModeMenu.getTypeName()},
    {id: "DC2_Learn", typename: DC2_Learn.getTypeName()},
    {id: "DC3_OrderingAtCounter", typename: DC3_OrderingAtCounter.getTypeName()},
    {id: "DC4_TableNumber", typename: DC4_TableNumber.getTypeName()},
    {id: "DC5_Practice", typename: DC5_Practice.getTypeName()},
  ]
}
