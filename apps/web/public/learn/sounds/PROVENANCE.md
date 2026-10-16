# Learning Worlds sounds

- `<animal>.ogg`: byte-for-byte copies of `packages/learning-content/assets/sounds/<animal>.ogg`. Source, licence (CC0 or public domain), URL and author for each are in `docs/art/animal-sounds-provenance.md` and in each pack's `sounds[].provenance`.
- `<animal>.m4a`: the same recordings transcoded to AAC 64 kb/s with ffmpeg for Safari, which cannot decode Ogg Opus.
- `phone_ring.{ogg,m4a}`: the toy-phone ring, synthesized locally with ffmpeg (two sine tones at 1180 and 1420 Hz, 22 Hz tremolo, two 0.42 s trills). No third-party material.
