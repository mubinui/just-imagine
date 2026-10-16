# Sound provenance

Every file under `apps/web/public/sound` and `apps/web/public/music` is synthesised by
`apps/web/scripts/make-sounds.mjs` from oscillators, seeded noise, filters and envelopes.
Nothing is downloaded or sampled: **synthesised, no third-party material**. The script is
deterministic, so re-running it reproduces the same audio sample for sample.

Regenerate with `node scripts/make-sounds.mjs --all` from `apps/web`. Audio renders at
44.1 kHz 16-bit mono (cues) or stereo (music), then ffmpeg transcodes it to Opus in Ogg
(`.ogg`, 64 kbit/s cues, 96 kbit/s music) and AAC in M4A (`.m4a`, 96 and 128 kbit/s).
Without ffmpeg on PATH the WAV ships instead. Every cue is peak-normalised to the level in
the table and given a 2 ms fade in and a 12 ms fade out so it never clicks; the mixer
balances cues at play time through the manifest gains.

## Cues

| Cue              | Length | Peak | Synthesis                                                                                                                                                           |
| ---------------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boing`          | 0.45 s | 0.90 | triangle 320 to 90 Hz exponential glide over 0.35 s with a 14 Hz vibrato that fades; lowpass 2.5 kHz; exponential decay over 0.45 s                                 |
| `splat`          | 0.25 s | 0.90 | white noise burst lowpassed at 700 Hz decaying over 0.12 s, plus a sine thump 140 to 50 Hz over 0.15 s; tanh soft clip                                              |
| `splash`         | 0.55 s | 0.90 | band-passed noise sweeping 1.8 kHz to 600 Hz (Q 0.8) with a 20 ms attack and 0.45 s decay, three rising sine bubble chirps 500 to 1300 Hz, and a 150 to 60 Hz thump |
| `whoosh`         | 0.45 s | 0.90 | band-passed noise (Q 1.2) whose centre rises 400 Hz to 2.4 kHz over 0.2 s then falls to 700 Hz; sine-squared swell envelope                                         |
| `ding`           | 0.65 s | 0.90 | bell at 1320 Hz with partials at 2x (0.35) and 3.43x (0.12) decaying over 0.65, 0.4 and 0.25 s; 5 ms high-passed noise strike                                       |
| `pop`            | 0.11 s | 0.90 | sine 520 to 140 Hz over 50 ms decaying over 70 ms, plus a 3 ms noise click                                                                                          |
| `pop_soft`       | 0.14 s | 0.60 | sine 380 to 160 Hz over 70 ms decaying over 0.1 s, lowpassed at 1.2 kHz                                                                                             |
| `thud`           | 0.28 s | 0.90 | sine 120 to 45 Hz over 0.12 s decaying over 0.28 s, plus lowpassed (400 Hz) noise decaying over 40 ms; light soft clip                                              |
| `thud_big`       | 0.50 s | 0.90 | sine 85 to 30 Hz over 0.25 s decaying over 0.5 s, 40 Hz sub decaying over 0.4 s, lowpassed (250 Hz) noise over 80 ms; heavier soft clip                             |
| `chime`          | 1.00 s | 0.90 | bells C6, E6, G6 struck 70 ms apart, each with 2x and 3.43x partials, decaying over 0.8 s                                                                           |
| `chime_magic`    | 1.30 s | 0.90 | bell arpeggio C6 E6 G6 B6 D7 at 55 ms spacing, a high-passed (5 kHz) noise shimmer decaying over 0.5 s, through a 110 ms feedback delay (0.35, wet 0.3)             |
| `sparkle`        | 0.60 s | 0.90 | eight sine blips at random pitches 4 to 8 kHz across 0.5 s, each decaying over 80 ms                                                                                |
| `confetti`       | 0.70 s | 0.90 | seven band-passed noise pops (random centres 1.5 to 4 kHz, Q 2, 40 ms decay) scattered over 0.5 s with a rising sine 1760 to 2640 Hz over 0.3 s                     |
| `tick`           | 0.05 s | 0.90 | sine 1.9 kHz decaying over 25 ms plus high-passed (2.5 kHz) noise over 10 ms                                                                                        |
| `tock`           | 0.07 s | 0.90 | sine 900 Hz decaying over 40 ms plus lowpassed (1.5 kHz) noise over 15 ms                                                                                           |
| `swoosh_up`      | 0.40 s | 0.90 | band-passed noise (Q 1.5) centre gliding 300 Hz to 4 kHz over 0.35 s with a swell envelope                                                                          |
| `swoosh_down`    | 0.40 s | 0.90 | band-passed noise (Q 1.5) centre gliding 4 kHz to 300 Hz over 0.35 s with a swell envelope                                                                          |
| `bubble`         | 0.14 s | 0.90 | sine gliding 600 Hz to 1.5 kHz over 90 ms, 5 ms attack, decaying over 0.1 s                                                                                         |
| `drip`           | 0.22 s | 0.90 | sine chirp 1.9 kHz to 1 kHz over 30 ms, then a 420 to 560 Hz bloom over 0.15 s                                                                                      |
| `rustle`         | 0.40 s | 0.90 | high-passed (1.8 kHz) noise with a random crackle envelope of twelve short bursts, decaying over 0.4 s                                                              |
| `click`          | 0.03 s | 0.90 | sine 3.2 kHz decaying over 12 ms plus high-passed (4 kHz) noise over 4 ms                                                                                           |
| `tap`            | 0.07 s | 0.90 | sine 1.25 kHz decaying over 45 ms plus band-passed (2 kHz) noise over 10 ms                                                                                         |
| `tap_soft`       | 0.08 s | 0.60 | sine 900 Hz decaying over 60 ms, lowpassed at 2 kHz                                                                                                                 |
| `select`         | 0.22 s | 0.90 | sines E5 then A5 70 ms apart with an octave partial, each decaying over 0.12 s                                                                                      |
| `deselect`       | 0.22 s | 0.90 | sines A5 then E5 70 ms apart with an octave partial, each decaying over 0.12 s                                                                                      |
| `open`           | 0.24 s | 0.90 | sine gliding 420 to 840 Hz over 0.18 s (ADSR 10/50 ms, 0.7, 80 ms) with band-passed noise rising 800 Hz to 2 kHz                                                    |
| `close`          | 0.24 s | 0.90 | sine gliding 840 to 420 Hz over 0.18 s (ADSR 10/50 ms, 0.7, 80 ms) with band-passed noise falling 2 kHz to 800 Hz                                                   |
| `success`        | 0.75 s | 0.90 | triangle and sine blend C5 E5 G5 C6 at 90 ms spacing, decaying over 0.3 s, the last over 0.5 s                                                                      |
| `fail_soft`      | 0.55 s | 0.70 | triangle E4 (0.25 s decay) then C4 (0.35 s decay) 180 ms apart, lowpassed at 1.5 kHz                                                                                |
| `level_up`       | 1.10 s | 0.90 | run C5 D5 E5 G5 C6 E6 at 70 ms spacing (0.25 s decays) into a C6 E6 G6 bell chord at 0.42 s decaying over 0.6 s, with a 90 ms shimmer delay                         |
| `star`           | 0.55 s | 0.90 | bell at 2.2 kHz with a 2 percent upward bend over 50 ms, 2x and 3x partials, decaying over 0.45 s, through a 70 ms shimmer delay                                    |
| `star_3`         | 0.90 s | 0.90 | three star bells at 1760, 2200 and 2640 Hz struck 150 ms apart                                                                                                      |
| `drumroll_short` | 0.85 s | 0.90 | lowpassed (1.8 kHz) noise hits accelerating from 18 to 36 per second over 0.6 s under a rising envelope, ending in a 110 to 50 Hz thump                             |
| `wind_gust`      | 1.50 s | 0.60 | band-passed noise (Q 0.6) with the centre wandering 500 to 1100 Hz on a slow sine, under a sine-squared swell over 1.5 s                                            |
| `rain_soft`      | 1.50 s | 0.50 | band-passed (3 kHz, Q 0.5) noise bed fading in and out over 0.3 s, with eighteen random sine drips 2.5 kHz to 1.2 kHz decaying over 30 ms                           |
| `snow_soft`      | 1.50 s | 0.45 | lowpassed (900 Hz) noise with slow 0.7 Hz swells fading over 0.4 s, with four soft sine blips between 2.5 and 3.5 kHz decaying over 0.15 s                          |
| `launch`         | 0.50 s | 0.90 | saw gliding 150 to 900 Hz over 0.45 s under a lowpass opening 600 Hz to 4 kHz (ADSR 20/100 ms, 0.8, 100 ms), with band-passed noise rising 500 Hz to 3 kHz          |
| `land`           | 0.30 s | 0.90 | sine 130 to 50 Hz thump decaying over 0.15 s with lowpassed (900 Hz) noise over 50 ms, then a smaller 200 to 90 Hz bounce at 120 ms                                 |
| `draw_start`     | 0.14 s | 0.90 | high-passed (2.5 kHz) noise scratch decaying over 0.1 s with a sine blip rising 500 to 900 Hz                                                                       |
| `draw_end`       | 0.16 s | 0.90 | high-passed (2.5 kHz) noise scratch decaying over 0.1 s with a sine blip falling 900 to 450 Hz                                                                      |

## Music beds

These six loops are **placeholders**. The quality programme specifies one 30-second bed per
theme generated offline with `lyria-3-clip-preview` (Lyria); until Vertex AI credentials for
Lyria exist these synthesised pads and plucks stand in. Each loop is an exact number of
4/4 bars at its tempo, and every tail wraps to the start, so the loop point at the end of
the last bar is seamless. `MUSIC_LOOP_SECONDS` in `apps/web/lib/sound/manifest.ts` carries the
exact loop length so the mixer can set `loopEnd` regardless of encoder padding.

| Theme    | BPM | Bars | Loop    | Key          | Synthesis                                                                                                                                                                       |
| -------- | --- | ---- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meadow` | 80  | 10   | 30.00 s | G major      | detuned triangle pad (lowpass 1.2 kHz, 0.08 Hz wobble), bright Karplus-Strong plucks on G major pentatonic, sine bass; I IV vi V I, two bars each                               |
| `pond`   | 72  | 9    | 30.00 s | F major      | soft detuned triangle pad (lowpass 700 Hz), muted Karplus-Strong plucks on F major pentatonic, rising sine bubble blips, sine bass; Imaj7 IVmaj7 ii7, three bars each           |
| `sky`    | 90  | 11   | 29.33 s | D major      | airy detuned saw pad (lowpass 1.5 kHz), bright plucks on D major pentatonic, high sine sparkles with echo, light sine bass; I V vi IV I, the last chord three bars              |
| `moon`   | 75  | 9    | 28.80 s | A minor      | dreamy detuned triangle pad (lowpass 600 Hz), sparse high plucks on A minor pentatonic with echo, sparse sine sparkles, deep sine bass; i VI III VII, the last chord three bars |
| `lab`    | 88  | 11   | 30.00 s | C major      | square pad (lowpass 800 Hz), short lowpassed square blips on C major pentatonic, sine sparkles, punchy triangle bass on every beat; I bVII IV V I, the last chord three bars    |
| `room`   | 76  | 9    | 28.42 s | E flat major | warm detuned triangle pad (lowpass 500 Hz), felt-piano style muted plucks on E flat major, soft sine bass; Imaj7 vi7 IVmaj7, three bars each                                    |

When the Lyria clips arrive, replace the files, keep the names, update `MUSIC_TEMPO` in the
manifest to the clip's tempo and bar count, and record the prompt and model version here.
