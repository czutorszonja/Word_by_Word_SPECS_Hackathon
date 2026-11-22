# Third-party assets

| Asset in this project | Source | Licence |
|---|---|---|
| `Assets/People/RB_Barista.glb` — the barista behind the sandwich counter | [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) avatar `Business_Male_06` (facial-rig version, textures `m025_*`) with the motion clips `m_idle_neutral_01`, `m_gestic_talk_neutral_01`, `m_gestic_talk_relaxed_01`, `m_gestic_listen_accept_01` | MIT — see `Microsoft-Rocketbox-LICENSE.md` |
| `Assets/People/Diner_*.glb` — the seated guests | Rocketbox `Female_Adult_02`, `Female_Adult_07`, `Female_Adult_08`, `Female_Adult_11`, `Female_Adult_14`, `Male_Adult_02`, `Male_Adult_09`, `Male_Adult_14` (facial rigs) with the seated clips `f_/m_sit_table_idle_neutral_01`, `f_/m_sit_table_gestic_thoughtful`, `f_/m_sit_table_idle_look_around` | MIT — see `Microsoft-Rocketbox-LICENSE.md` |
| `Assets/Fonts/Kalam.ttf` — chalkboard lettering | [Google Fonts: Kalam](https://fonts.google.com/specimen/Kalam) | SIL Open Font License 1.1 |

How the GLB was made: `agent/staging/rb_build_glb.py` (Blender) imports the avatar FBX, keeps the face
shapes the Lens drives (visemes, blinks, jaw, smile, brows), rebuilds the two materials from the
textures at 1024 px, retargets the motion clips onto the avatar and exports one GLB with one
animation per clip. `agent/staging/rb_render.py` renders front / three-quarter checks of the result.

The barista's apron is our own addition (`agent/staging/rb_apron.py`); the diners were seated and checked with `rb_seat_test.py` / `rb_pair_test.py`.
