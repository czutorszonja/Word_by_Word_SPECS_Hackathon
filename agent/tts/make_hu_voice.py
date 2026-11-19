"""Generate Hungarian voice clips with Microsoft neural voices (edge-tts) and save them as WAV.

Usage:
  python make_hu_voice.py <out_dir> [file_key ...]
With no keys, generates every clip in CLIPS. Server lines (s_*) use one voice, the learner's
words and phrases (w_*, n_*, p_*) use the other, as the design brief asks.
"""
import asyncio
import os
import sys
import tempfile
import wave

import edge_tts
import miniaudio

SERVER_VOICE = "hu-HU-TamasNeural"   # the barista (a man since 2026-11-19)
LEARNER_VOICE = "hu-HU-NoemiNeural"  # words and the learner's phrases (the other voice, so the two never blur)
RATE = "-8%"                          # a touch slower than default, for learners

CLIPS = {
    # words: sandwich counter
    "w_szendvics": "szendvics", "w_kenyer": "kenyér", "w_sonka": "sonka", "w_sajt": "sajt",
    "w_csirke": "csirke", "w_husgomboc": "húsgombóc", "w_salata": "saláta", "w_spenot": "spenót",
    "w_paradicsom": "paradicsom", "w_olivabogyo": "olívabogyó", "w_uborka": "savanyú uborka",
    "w_hagyma": "hagyma", "w_majonez": "majonéz",
    # words: coffee and tables
    "w_kave": "kávé", "w_tej": "tej", "w_viz": "víz", "w_kicsi": "kicsi", "w_nagy": "nagy",
    "w_asztal": "asztal", "n_4": "négy", "n_8": "nyolc", "n_12": "tizenkettő",
    # learner's phrases
    "p_jonapot": "Jó napot!", "p_szendvicset_kerek": "Egy szendvicset kérek.",
    "p_sonka_sajt": "Sonkát és sajtot kérek.", "p_kerhetek_oliva": "Kérhetek olívabogyót?",
    "p_uborka_nelkul": "Savanyú uborka nélkül, kérem.", "p_tejes_kave": "Egy kicsi tejeskávét kérek.",
    "p_itt_eszem": "Itt eszem.", "p_elvitelre": "Elvitelre, kérem.",
    "p_szabad_asztal": "Szabad ez az asztal?", "p_negyes_asztal": "A négyes asztalnál ülök.",
    "p_nyolcas_asztal": "A nyolcas asztalnál ülök.", "p_tizenkettes_asztal": "A tizenkettes asztalnál ülök.",
    "p_koszonom": "Köszönöm!",
    # new ingredients (added after the learner's feedback on variety)
    "w_szalami": "szalámi", "w_sult_csirke": "sült csirke", "w_paprika": "paprika",
    "w_uborka_friss": "uborka", "w_mustar": "mustár",
    # object forms for building "…-t kérek" sentences (accusative)
    "a_sonka": "sonkát", "a_szalami": "szalámit", "a_sult_csirke": "sült csirkét", "a_csirke": "csirkét",
    "a_sajt": "sajtot", "a_salata": "salátát", "a_spenot": "spenótot", "a_paradicsom": "paradicsomot",
    "a_paprika": "paprikát", "a_uborka_friss": "uborkát", "a_hagyma": "hagymát",
    "a_savanyu_uborka": "savanyú uborkát", "a_olivabogyo": "olívabogyót", "a_majonez": "majonézt",
    "a_mustar": "mustárt", "a_husgomboc": "húsgombócot",
    # connectors for building sentences
    "c_kerek": "kérek", "c_es": "és", "c_nelkul": "nélkül", "c_kerem": "kérem",
    # reusable sentence pattern "Kérek <object form> a szendvicsembe." (one whole clip per ingredient)
    "c_a_szendvicsembe": "a szendvicsembe",
    "p_kerek_sonka": "Kérek sonkát a szendvicsembe.", "p_kerek_szalami": "Kérek szalámit a szendvicsembe.",
    "p_kerek_csirke": "Kérek sült csirkét a szendvicsembe.", "p_kerek_sajt": "Kérek sajtot a szendvicsembe.",
    "p_kerek_husgomboc": "Kérek húsgombócot a szendvicsembe.", "p_kerek_salata": "Kérek salátát a szendvicsembe.",
    "p_kerek_spenot": "Kérek spenótot a szendvicsembe.", "p_kerek_paradicsom": "Kérek paradicsomot a szendvicsembe.",
    "p_kerek_paprika": "Kérek paprikát a szendvicsembe.", "p_kerek_uborka_friss": "Kérek uborkát a szendvicsembe.",
    "p_kerek_uborka": "Kérek savanyú uborkát a szendvicsembe.", "p_kerek_hagyma": "Kérek hagymát a szendvicsembe.",
    "p_kerek_olivabogyo": "Kérek olívabogyót a szendvicsembe.", "p_kerek_majonez": "Kérek majonézt a szendvicsembe.",
    "p_kerek_mustar": "Kérek mustárt a szendvicsembe.",
    # "without" pattern "<dictionary form> nélkül, kérem."
    "p_nelkul_sonka": "Sonka nélkül, kérem.", "p_nelkul_szalami": "Szalámi nélkül, kérem.",
    "p_nelkul_csirke": "Sült csirke nélkül, kérem.", "p_nelkul_sajt": "Sajt nélkül, kérem.",
    "p_nelkul_husgomboc": "Húsgombóc nélkül, kérem.", "p_nelkul_salata": "Saláta nélkül, kérem.",
    "p_nelkul_spenot": "Spenót nélkül, kérem.", "p_nelkul_paradicsom": "Paradicsom nélkül, kérem.",
    "p_nelkul_paprika": "Paprika nélkül, kérem.", "p_nelkul_uborka_friss": "Uborka nélkül, kérem.",
    "p_nelkul_uborka": "Savanyú uborka nélkül, kérem.", "p_nelkul_hagyma": "Hagyma nélkül, kérem.",
    "p_nelkul_olivabogyo": "Olívabogyó nélkül, kérem.", "p_nelkul_majonez": "Majonéz nélkül, kérem.",
    "p_nelkul_mustar": "Mustár nélkül, kérem.",
    # pre-saved words from earlier outings (saved-words viewer categories)
    "w_utca": "utca", "w_jarda": "járda", "w_bolt": "bolt", "w_busz": "busz", "w_villamos": "villamos",
    "w_megallo": "megálló", "w_lampa": "lámpa", "w_auto": "autó", "w_bicikli": "bicikli", "w_taxi": "taxi",
    "w_posta": "posta", "w_gyogyszertar": "gyógyszertár",
    "w_fa": "fa", "w_virag": "virág", "w_fu": "fű", "w_pad": "pad", "w_szokokut": "szökőkút",
    "w_kutya": "kutya", "w_madar": "madár", "w_to": "tó", "w_jatszoter": "játszótér", "w_hinta": "hinta",
    "w_labda": "labda", "w_osveny": "ösvény",
    # entrance sign, wall menu board, pastry case and coffee station (added 2026-11-19)
    "w_nyitva": "nyitva", "w_zarva": "zárva", "p_nyitva_van": "A kávézó nyitva van.", "p_zarva_van": "A kávézó zárva van.",
    "w_tejeskave": "tejeskávé", "w_presszo": "presszó", "w_forro_csoki": "forró csoki",
    "p_tejeskave": "Egy tejeskávét kérek.", "p_presszo": "Egy presszót kérek.", "p_forro_csoki": "Egy forró csokit kérek.",
    "w_repatorta": "répatorta", "w_perec": "perec", "w_kakaos_csiga": "kakaós csiga", "w_pogacsa": "pogácsa",
    "p_repatorta": "Egy szelet répatortát kérek.", "p_perec": "Egy perecet kérek.",
    "p_kakaos_csiga": "Egy kakaós csigát kérek.", "p_pogacsa": "Két pogácsát kérek.",
    "w_zabtej": "zabtej", "w_mandulatej": "mandulatej", "w_kavedaralo": "kávédaráló", "w_csesze": "csésze",
    "p_zabtej": "Zabtejjel kérem.", "p_mandulatej": "Mandulatejjel kérem.",
    "p_kavedaralo": "A kávédaráló hangos.", "p_csesze": "Egy csésze kávét kérek.",
    # server lines
    "s_mit_ker": "Jó napot! Mit kér?", "s_mit_ker_bele": "Mit kér bele?", "s_inni": "Inni valamit?",
    "s_itt_vagy_elvitel": "Itt fogyasztja vagy elvitelre?", "s_hanyas_asztal": "Hányas asztalnál ül?",
    "s_jo_etvagyat": "Jó étvágyat!",
}

PAD_SECONDS = 0.25  # short silence at start and end, like the recording guide asks


STITCH_PAD_SECONDS = 0.05  # a_* and c_* clips are joined into sentences, so they get almost no padding


def mp3_to_wav(mp3_path: str, wav_path: str, pad_seconds: float = PAD_SECONDS) -> float:
    decoded = miniaudio.decode_file(mp3_path, output_format=miniaudio.SampleFormat.SIGNED16,
                                    nchannels=1, sample_rate=44100)
    samples = decoded.samples
    # Trim the service's own leading/trailing silence, then add our short, even padding.
    threshold = 400  # about -38 dBFS
    loud = [i for i in range(len(samples)) if abs(samples[i]) > threshold]
    if loud:
        margin = int(44100 * 0.04)
        samples = samples[max(0, loud[0] - margin): min(len(samples), loud[-1] + margin)]
    pad = b"\x00\x00" * int(44100 * pad_seconds)
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(pad + samples.tobytes() + pad)
    return len(samples) / 44100 + 2 * pad_seconds


async def make(key: str, text: str, out_dir: str) -> str:
    voice = SERVER_VOICE if key.startswith("s_") else LEARNER_VOICE
    with tempfile.TemporaryDirectory() as tmp:
        mp3 = os.path.join(tmp, key + ".mp3")
        await edge_tts.Communicate(text, voice, rate=RATE).save(mp3)
        wav = os.path.join(out_dir, key + ".wav")
        stitched = key.startswith("a_") or key.startswith("c_")
        secs = mp3_to_wav(mp3, wav, STITCH_PAD_SECONDS if stitched else PAD_SECONDS)
    return f"{key}.wav  {secs:4.2f}s  {voice}  \"{text}\""


async def main() -> None:
    out_dir = sys.argv[1]
    keys = sys.argv[2:] or list(CLIPS)
    os.makedirs(out_dir, exist_ok=True)
    for key in keys:
        print(await make(key, CLIPS[key], out_dir))


if __name__ == "__main__":
    asyncio.run(main())
