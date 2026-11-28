// LeafIndex.ts — registers the Word by Word LEAF scenarios (one per done criterion in
// devpost/design-brief.md, plus the watchable story tour, the hands-free demo video and the screenshot helpers). Attached to the root SceneObject
// "LeafIndex". Run scenarios one at a time.
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {DC1_ModeMenu} from "./DC1_ModeMenu"
import {DC2_Learn} from "./DC2_Learn"
import {DC3_OrderingAtCounter} from "./DC3_OrderingAtCounter"
import {DC4_TableNumber} from "./DC4_TableNumber"
import {DC5_Practice} from "./DC5_Practice"
import {DC6_Entrance} from "./DC6_Entrance"
import {DC7_OutsideWords} from "./DC7_OutsideWords"
import {StoryTour} from "./StoryTour"
import {SHOTS_MenuWords} from "./SHOTS_MenuWords"
import {SHOTS_Barista} from "./SHOTS_Barista"
import {SHOTS_Walkaround} from "./SHOTS_Walkaround"
import {SHOTS_OutsideWords} from "./SHOTS_OutsideWords"
import {SHOTS_Stage23} from "./SHOTS_Stage23"
import {SHOTS_Stage24} from "./SHOTS_Stage24"
import {SHOTS_Stage25} from "./SHOTS_Stage25"
import {DEMO_Video} from "./DEMO_Video"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "DC1_ModeMenu", typename: DC1_ModeMenu.getTypeName()},
    {id: "DC2_Learn", typename: DC2_Learn.getTypeName()},
    {id: "DC3_OrderingAtCounter", typename: DC3_OrderingAtCounter.getTypeName()},
    {id: "DC4_TableNumber", typename: DC4_TableNumber.getTypeName()},
    {id: "DC5_Practice", typename: DC5_Practice.getTypeName()},
    {id: "DC6_Entrance", typename: DC6_Entrance.getTypeName()},
    {id: "DC7_OutsideWords", typename: DC7_OutsideWords.getTypeName()},
    {id: "TOUR_Story", typename: StoryTour.getTypeName()},
    {id: "DEMO_Video", typename: DEMO_Video.getTypeName()},
    {id: "SHOTS_MenuWords", typename: SHOTS_MenuWords.getTypeName()},
    {id: "SHOTS_Barista", typename: SHOTS_Barista.getTypeName()},
    {id: "SHOTS_Walkaround", typename: SHOTS_Walkaround.getTypeName()},
    {id: "SHOTS_OutsideWords", typename: SHOTS_OutsideWords.getTypeName()},
    {id: "SHOTS_Stage23", typename: SHOTS_Stage23.getTypeName()},
    {id: "SHOTS_Stage24", typename: SHOTS_Stage24.getTypeName()},
    {id: "SHOTS_Stage25", typename: SHOTS_Stage25.getTypeName()},
  ]
}
