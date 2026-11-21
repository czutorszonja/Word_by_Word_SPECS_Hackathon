# Recording list: Word by Word café

Updated 2026-11-21 (complete list: every clip the app can play, including the pre-saved words).

Every clip below already exists as a generated placeholder voice (Microsoft neural voices: Noémi for your words and phrases, Tamás for the barista). When you record your own versions, they replace the placeholders one by one. No code change is needed.

## How to record

- **Same file name, same folder.** Save each clip as `Word_by_Word_SPECS_Hackhaton/Assets/Audio/hu/<file name>`, overwriting the placeholder. Keep the name exactly as written: no accents, no spaces, lower case.
- **WAV, one clip per file.** Mono, 44.1 kHz or 48 kHz. One word or one sentence per file.
- **Silence.** About a quarter of a second before and after words and sentences. For object forms (`a_*`) and connectors (`c_*`) leave almost none, because they are joined to other clips.
- **Voice.** "learner" = your voice (the person ordering). "server" = the barista's voice (the six `s_*` lines). Use a second person or a different voice for the server if you can.
- Say it the way you would to a learner: natural, a touch slow.

## How the app joins clips ("+")

Some sentences are not recorded as one file. The app plays several clips straight after each other. For example, "Kérek szalámit és paradicsomot a szendvicsembe." is played as

`c_kerek + a_szalami + c_es + a_paradicsom + c_a_szendvicsembe`

and "Hagyma és mustár nélkül, kérem." as `w_hagyma + c_es + w_mustar + c_nelkul + c_kerem`. That is why the connectors (`c_kerek`, `c_es`, `c_a_szendvicsembe`, `c_nelkul`, `c_kerem`) and the object forms must each be recorded **on their own**, and why every piece should have the same loudness and a neutral, mid-sentence tone. Commas have no clip.

## Marks

- **new**: added since 2026-11-19 (the 13 words nyitva, zárva, répatorta, perec, kakaós csiga, pogácsa, tejeskávé, presszó, forró csoki, zabtej, mandulatej, kávédaráló, csésze and their example sentences). No clips were missing on 2026-11-21, so nothing else is new.
- **pre-saved**: words that are already in your saved-words list when the demo starts.

## 1. Words: sandwich counter

Pointing at an ingredient shows the word; pinching plays it. These single words are also joined into "without" sentences (for example `w_hagyma + c_es + w_mustar + c_nelkul + c_kerem` = "Hagyma és mustár nélkül, kérem."), so say them in a plain, even tone.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_sonka.wav` | sonka | ham | learner |  |  |
| `w_szalami.wav` | szalámi | salami | learner |  |  |
| `w_sult_csirke.wav` | sült csirke | roast chicken | learner |  |  |
| `w_sajt.wav` | sajt | cheese | learner |  |  |
| `w_husgomboc.wav` | húsgombóc | meatball | learner |  |  |
| `w_salata.wav` | saláta | lettuce | learner |  |  |
| `w_spenot.wav` | spenót | spinach | learner |  |  |
| `w_paradicsom.wav` | paradicsom | tomato | learner |  |  |
| `w_paprika.wav` | paprika | peppers | learner |  |  |
| `w_uborka_friss.wav` | uborka | cucumber | learner |  |  |
| `w_uborka.wav` | savanyú uborka | pickles | learner |  |  |
| `w_hagyma.wav` | hagyma | onion | learner |  |  |
| `w_olivabogyo.wav` | olívabogyó | olives | learner |  |  |
| `w_majonez.wav` | majonéz | mayonnaise | learner |  |  |
| `w_mustar.wav` | mustár | mustard | learner |  |  |

## 2. Words: pastry case

The four pastries are also written on the wall menu board (cake column).

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_szendvics.wav` | szendvics | sandwich | learner |  |  |
| `w_kenyer.wav` | kenyér | bread | learner |  |  |
| `w_repatorta.wav` | répatorta | carrot cake | learner | new |  |
| `w_perec.wav` | perec | pretzel | learner | new |  |
| `w_kakaos_csiga.wav` | kakaós csiga | cocoa roll | learner | new |  |
| `w_pogacsa.wav` | pogácsa | savoury scone | learner | new |  |

## 3. Words: coffee area, coffee station and tables

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_kave.wav` | kávé | coffee | learner |  |  |
| `w_tej.wav` | tej | milk | learner |  |  |
| `w_viz.wav` | víz | water | learner |  |  |
| `w_kicsi.wav` | kicsi | small | learner |  |  |
| `w_nagy.wav` | nagy | large | learner |  |  |
| `w_zabtej.wav` | zabtej | oat milk | learner | new |  |
| `w_mandulatej.wav` | mandulatej | almond milk | learner | new |  |
| `w_kavedaralo.wav` | kávédaráló | coffee grinder | learner | new |  |
| `w_csesze.wav` | csésze | cup | learner | new |  |
| `w_asztal.wav` | asztal | table | learner |  |  |

## 4. Menu board and door words

The drink lines on the wall menu board and the two faces of the door sign (NYITVA outside, ZÁRVA inside). The board's headings (MENÜ, ITALOK, SÜTEMÉNY), the KÁVÉZÓ sign and the COFFEE neon are decoration only and have no clip.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_tejeskave.wav` | tejeskávé | latte | learner | new |  |
| `w_presszo.wav` | presszó | espresso | learner | new |  |
| `w_forro_csoki.wav` | forró csoki | hot chocolate | learner | new |  |
| `w_nyitva.wav` | nyitva | open | learner | new |  |
| `w_zarva.wav` | zárva | closed | learner | new |  |

## 5. Pre-saved words: Street

These words start out already saved (from "earlier outings"), so the saved-words viewer has categories to sort by. You can play each one from the viewer.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_utca.wav` | utca | street | learner |  | pre-saved |
| `w_jarda.wav` | járda | pavement | learner |  | pre-saved |
| `w_bolt.wav` | bolt | shop | learner |  | pre-saved |
| `w_busz.wav` | busz | bus | learner |  | pre-saved |
| `w_villamos.wav` | villamos | tram | learner |  | pre-saved |
| `w_megallo.wav` | megálló | stop | learner |  | pre-saved |
| `w_lampa.wav` | lámpa | traffic light | learner |  | pre-saved |
| `w_auto.wav` | autó | car | learner |  | pre-saved |
| `w_bicikli.wav` | bicikli | bicycle | learner |  | pre-saved |
| `w_taxi.wav` | taxi | taxi | learner |  | pre-saved |
| `w_posta.wav` | posta | post office | learner |  | pre-saved |
| `w_gyogyszertar.wav` | gyógyszertár | pharmacy | learner |  | pre-saved |

## 6. Pre-saved words: Park

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `w_fa.wav` | fa | tree | learner |  | pre-saved |
| `w_virag.wav` | virág | flower | learner |  | pre-saved |
| `w_fu.wav` | fű | grass | learner |  | pre-saved |
| `w_pad.wav` | pad | bench | learner |  | pre-saved |
| `w_szokokut.wav` | szökőkút | fountain | learner |  | pre-saved |
| `w_kutya.wav` | kutya | dog | learner |  | pre-saved |
| `w_madar.wav` | madár | bird | learner |  | pre-saved |
| `w_to.wav` | tó | lake | learner |  | pre-saved |
| `w_jatszoter.wav` | játszótér | playground | learner |  | pre-saved |
| `w_hinta.wav` | hinta | swing | learner |  | pre-saved |
| `w_labda.wav` | labda | ball | learner |  | pre-saved |
| `w_osveny.wav` | ösvény | path | learner |  | pre-saved |

## 7. Object forms used in sentences

The "-t" (object) form of each counter ingredient. The app joins these between other clips, so record each one on its own with almost no silence before and after, in a mid-sentence tone (no falling "full stop" at the end).

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `a_sonka.wav` | sonkát | ham (object form) | learner |  |  |
| `a_szalami.wav` | szalámit | salami (object form) | learner |  |  |
| `a_sult_csirke.wav` | sült csirkét | roast chicken (object form) | learner |  |  |
| `a_sajt.wav` | sajtot | cheese (object form) | learner |  |  |
| `a_husgomboc.wav` | húsgombócot | meatballs (object form) | learner |  |  |
| `a_salata.wav` | salátát | lettuce (object form) | learner |  |  |
| `a_spenot.wav` | spenótot | spinach (object form) | learner |  |  |
| `a_paradicsom.wav` | paradicsomot | tomato (object form) | learner |  |  |
| `a_paprika.wav` | paprikát | peppers (object form) | learner |  |  |
| `a_uborka_friss.wav` | uborkát | cucumber (object form) | learner |  |  |
| `a_savanyu_uborka.wav` | savanyú uborkát | pickles (object form) | learner |  |  |
| `a_hagyma.wav` | hagymát | onion (object form) | learner |  |  |
| `a_olivabogyo.wav` | olívabogyót | olives (object form) | learner |  |  |
| `a_majonez.wav` | majonézt | mayonnaise (object form) | learner |  |  |
| `a_mustar.wav` | mustárt | mustard (object form) | learner |  |  |

## 8. Connectors

Short joining words. Record each completely on its own, one word per file, mid-sentence tone, almost no silence around it. The app never plays them alone, only between other clips.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `c_kerek.wav` | kérek | I'd like ("I ask for") | learner |  |  |
| `c_es.wav` | és | and | learner |  |  |
| `c_a_szendvicsembe.wav` | a szendvicsembe | in my sandwich | learner |  |  |
| `c_nelkul.wav` | nélkül | without | learner |  |  |
| `c_kerem.wav` | kérem | please | learner |  |  |

## 9. Your phrases: answers in the order

The phrase cards you choose while ordering at the counter (and the table phrases after you pick a table).

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `p_jonapot.wav` | Jó napot! | Hello! | learner |  |  |
| `p_szendvicset_kerek.wav` | Egy szendvicset kérek. | I'd like a sandwich, please. | learner |  |  |
| `p_tejes_kave.wav` | Egy kicsi tejeskávét kérek. | A small coffee with milk, please. | learner |  |  |
| `p_itt_eszem.wav` | Itt eszem. | I'll eat here. | learner |  |  |
| `p_elvitelre.wav` | Elvitelre, kérem. | Takeaway, please. | learner |  |  |
| `p_szabad_asztal.wav` | Szabad ez az asztal? | Is this table free? | learner |  |  |
| `p_negyes_asztal.wav` | A négyes asztalnál ülök. | I'm at table four. | learner |  |  |
| `p_nyolcas_asztal.wav` | A nyolcas asztalnál ülök. | I'm at table eight. | learner |  |  |
| `p_tizenkettes_asztal.wav` | A tizenkettes asztalnál ülök. | I'm at table twelve. | learner |  |  |
| `p_koszonom.wav` | Köszönöm! | Thank you! | learner |  |  |

## 10. Your phrases: "Kérek … a szendvicsembe." (one ingredient)

With one ingredient in the phrase helper the app plays this whole recorded sentence. With two or more it joins the pieces from sections 7 and 8 instead.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `p_kerek_sonka.wav` | Kérek sonkát a szendvicsembe. | I'd like ham in my sandwich. | learner |  |  |
| `p_kerek_szalami.wav` | Kérek szalámit a szendvicsembe. | I'd like salami in my sandwich. | learner |  |  |
| `p_kerek_csirke.wav` | Kérek sült csirkét a szendvicsembe. | I'd like roast chicken in my sandwich. | learner |  |  |
| `p_kerek_sajt.wav` | Kérek sajtot a szendvicsembe. | I'd like cheese in my sandwich. | learner |  |  |
| `p_kerek_husgomboc.wav` | Kérek húsgombócot a szendvicsembe. | I'd like meatballs in my sandwich. | learner |  |  |
| `p_kerek_salata.wav` | Kérek salátát a szendvicsembe. | I'd like lettuce in my sandwich. | learner |  |  |
| `p_kerek_spenot.wav` | Kérek spenótot a szendvicsembe. | I'd like spinach in my sandwich. | learner |  |  |
| `p_kerek_paradicsom.wav` | Kérek paradicsomot a szendvicsembe. | I'd like tomato in my sandwich. | learner |  |  |
| `p_kerek_paprika.wav` | Kérek paprikát a szendvicsembe. | I'd like peppers in my sandwich. | learner |  |  |
| `p_kerek_uborka_friss.wav` | Kérek uborkát a szendvicsembe. | I'd like cucumber in my sandwich. | learner |  |  |
| `p_kerek_uborka.wav` | Kérek savanyú uborkát a szendvicsembe. | I'd like pickles in my sandwich. | learner |  |  |
| `p_kerek_hagyma.wav` | Kérek hagymát a szendvicsembe. | I'd like onion in my sandwich. | learner |  |  |
| `p_kerek_olivabogyo.wav` | Kérek olívabogyót a szendvicsembe. | I'd like olives in my sandwich. | learner |  |  |
| `p_kerek_majonez.wav` | Kérek majonézt a szendvicsembe. | I'd like mayonnaise in my sandwich. | learner |  |  |
| `p_kerek_mustar.wav` | Kérek mustárt a szendvicsembe. | I'd like mustard in my sandwich. | learner |  |  |

## 11. Your phrases: "… nélkül, kérem." (one ingredient)

The "without" pattern for one ingredient. With two or more the app joins the single words from section 1 with `c_es`, `c_nelkul` and `c_kerem`.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `p_nelkul_sonka.wav` | Sonka nélkül, kérem. | Without ham, please. | learner |  |  |
| `p_nelkul_szalami.wav` | Szalámi nélkül, kérem. | Without salami, please. | learner |  |  |
| `p_nelkul_csirke.wav` | Sült csirke nélkül, kérem. | Without roast chicken, please. | learner |  |  |
| `p_nelkul_sajt.wav` | Sajt nélkül, kérem. | Without cheese, please. | learner |  |  |
| `p_nelkul_husgomboc.wav` | Húsgombóc nélkül, kérem. | Without meatballs, please. | learner |  |  |
| `p_nelkul_salata.wav` | Saláta nélkül, kérem. | Without lettuce, please. | learner |  |  |
| `p_nelkul_spenot.wav` | Spenót nélkül, kérem. | Without spinach, please. | learner |  |  |
| `p_nelkul_paradicsom.wav` | Paradicsom nélkül, kérem. | Without tomato, please. | learner |  |  |
| `p_nelkul_paprika.wav` | Paprika nélkül, kérem. | Without peppers, please. | learner |  |  |
| `p_nelkul_uborka_friss.wav` | Uborka nélkül, kérem. | Without cucumber, please. | learner |  |  |
| `p_nelkul_uborka.wav` | Savanyú uborka nélkül, kérem. | Without pickles, please. | learner |  |  |
| `p_nelkul_hagyma.wav` | Hagyma nélkül, kérem. | Without onion, please. | learner |  |  |
| `p_nelkul_olivabogyo.wav` | Olívabogyó nélkül, kérem. | Without olives, please. | learner |  |  |
| `p_nelkul_majonez.wav` | Majonéz nélkül, kérem. | Without mayonnaise, please. | learner |  |  |
| `p_nelkul_mustar.wav` | Mustár nélkül, kérem. | Without mustard, please. | learner |  |  |

## 12. Your phrases: example sentences for word cards

One example sentence per word, kept in the word data. The current word card does not play them yet, but they are named and ready. (`p_uborka_nelkul` says the same sentence as `p_nelkul_uborka`; record both or copy the same take under both names.)

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `p_sonka_sajt.wav` | Sonkát és sajtot kérek. | Ham and cheese, please. | learner |  |  |
| `p_kerhetek_oliva.wav` | Kérhetek olívabogyót? | Could I have some olives? | learner |  |  |
| `p_uborka_nelkul.wav` | Savanyú uborka nélkül, kérem. | Without pickles, please. | learner |  |  |
| `p_nyitva_van.wav` | A kávézó nyitva van. | The café is open. | learner | new |  |
| `p_zarva_van.wav` | A kávézó zárva van. | The café is closed. | learner | new |  |
| `p_repatorta.wav` | Egy szelet répatortát kérek. | A slice of carrot cake, please. | learner | new |  |
| `p_perec.wav` | Egy perecet kérek. | A pretzel, please. | learner | new |  |
| `p_kakaos_csiga.wav` | Egy kakaós csigát kérek. | A cocoa roll, please. | learner | new |  |
| `p_pogacsa.wav` | Két pogácsát kérek. | Two savoury scones, please. | learner | new |  |
| `p_tejeskave.wav` | Egy tejeskávét kérek. | A latte, please. | learner | new |  |
| `p_presszo.wav` | Egy presszót kérek. | An espresso, please. | learner | new |  |
| `p_forro_csoki.wav` | Egy forró csokit kérek. | A hot chocolate, please. | learner | new |  |
| `p_zabtej.wav` | Zabtejjel kérem. | With oat milk, please. | learner | new |  |
| `p_mandulatej.wav` | Mandulatejjel kérem. | With almond milk, please. | learner | new |  |
| `p_kavedaralo.wav` | A kávédaráló hangos. | The coffee grinder is loud. | learner | new |  |
| `p_csesze.wav` | Egy csésze kávét kérek. | A cup of coffee, please. | learner | new |  |

## 13. The server's lines

Said by the barista (the man behind the counter), so use a different voice from yours if you can.

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `s_mit_ker.wav` | Jó napot! Mit kér? | Hello, what would you like? | server |  |  |
| `s_mit_ker_bele.wav` | Mit kér bele? | What would you like in it? | server |  |  |
| `s_inni.wav` | Inni valamit? | Anything to drink? | server |  |  |
| `s_itt_vagy_elvitel.wav` | Itt fogyasztja vagy elvitelre? | For here or to take away? | server |  |  |
| `s_hanyas_asztal.wav` | Hányas asztalnál ül? | What's your table number? | server |  |  |
| `s_jo_etvagyat.wav` | Jó étvágyat! | Enjoy your meal! | server |  |  |

## 14. Numbers

Played when you tap the number on an empty table (4, 8 and 12 are the free ones; the other tables are taken and have no clip).

| File | Hungarian (as spoken) | English | Voice | New | Pre-saved |
|---|---|---|---|---|---|
| `n_4.wav` | négy | four | learner |  |  |
| `n_8.wav` | nyolc | eight | learner |  |  |
| `n_12.wav` | tizenkettő | twelve | learner |  |  |

## Total

**145 clips to record**: 139 in your voice and 6 in the barista's voice. 26 are marked new and 24 are pre-saved.

Not needed: `a_csirke.wav`, `w_csirke.wav` are old clips (plain "csirke" / "csirkét") that the app no longer plays, because the chicken on the counter is roast chicken (`w_sult_csirke`, `a_sult_csirke`). The folder holds 147 WAV files in all.
