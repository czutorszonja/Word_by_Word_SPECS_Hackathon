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

SERVER_VOICE = "hu-HU-NoemiNeural"   # the barista
LEARNER_VOICE = "hu-HU-TamasNeural"  # words and the learner's phrases
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
    "p_uborka_nelkul": "Savanyú uborka nélkül, kérem.", "p_tejes_kave": "Egy kicsi tejes kávét kérek.",
    "p_itt_eszem": "Itt eszem.", "p_elvitelre": "Elvitelre, kérem.",
    "p_szabad_asztal": "Szabad ez az asztal?", "p_negyes_asztal": "A négyes asztalnál ülök.",
    "p_nyolcas_asztal": "A nyolcas asztalnál ülök.", "p_tizenkettes_asztal": "A tizenkettes asztalnál ülök.",
    "p_koszonom": "Köszönöm!",
    # server lines
    "s_mit_ker": "Jó napot! Mit kér?", "s_mit_ker_bele": "Mit kér bele?", "s_inni": "Inni valamit?",
    "s_itt_vagy_elvitel": "Itt fogyasztja vagy elvitelre?", "s_hanyas_asztal": "Hányas asztalnál ül?",
    "s_jo_etvagyat": "Jó étvágyat!",
}

PAD_SECONDS = 0.25  # short silence at start and end, like the recording guide asks


def mp3_to_wav(mp3_path: str, wav_path: str) -> float:
    decoded = miniaudio.decode_file(mp3_path, output_format=miniaudio.SampleFormat.SIGNED16,
                                    nchannels=1, sample_rate=44100)
    samples = decoded.samples
    # Trim the service's own leading/trailing silence, then add our short, even padding.
    threshold = 400  # about -38 dBFS
    loud = [i for i in range(len(samples)) if abs(samples[i]) > threshold]
    if loud:
        margin = int(44100 * 0.04)
        samples = samples[max(0, loud[0] - margin): min(len(samples), loud[-1] + margin)]
    pad = b"\x00\x00" * int(44100 * PAD_SECONDS)
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(pad + samples.tobytes() + pad)
    return len(samples) / 44100 + 2 * PAD_SECONDS


async def make(key: str, text: str, out_dir: str) -> str:
    voice = SERVER_VOICE if key.startswith("s_") else LEARNER_VOICE
    with tempfile.TemporaryDirectory() as tmp:
        mp3 = os.path.join(tmp, key + ".mp3")
        await edge_tts.Communicate(text, voice, rate=RATE).save(mp3)
        wav = os.path.join(out_dir, key + ".wav")
        secs = mp3_to_wav(mp3, wav)
    return f"{key}.wav  {secs:4.2f}s  {voice}  \"{text}\""


async def main() -> None:
    out_dir = sys.argv[1]
    keys = sys.argv[2:] or list(CLIPS)
    os.makedirs(out_dir, exist_ok=True)
    for key in keys:
        print(await make(key, CLIPS[key], out_dir))


if __name__ == "__main__":
    asyncio.run(main())
