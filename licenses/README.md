# Third-party assets

| Asset in this project | Source | Licence |
|---|---|---|
| `Assets/People/RB_Barista.glb` — the barista behind the sandwich counter | [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) avatar `Business_Male_06` (facial-rig version, textures `m025_*`) with the motion clips `m_idle_neutral_01`, `m_gestic_talk_neutral_01`, `m_gestic_talk_relaxed_01`, `m_gestic_listen_accept_01` | MIT — see `Microsoft-Rocketbox-LICENSE.md` |

How the GLB was made: `agent/staging/rb_build_glb.py` (Blender) imports the avatar FBX, keeps the face
shapes the Lens drives (visemes, blinks, jaw, smile, brows), rebuilds the two materials from the
textures at 1024 px, retargets the motion clips onto the avatar and exports one GLB with one
animation per clip. `agent/staging/rb_render.py` renders front / three-quarter checks of the result.
