Baloo 2: https://fonts.google.com/specimen/Baloo+2 (SIL Open Font License)
Downloaded from https://fonts.gstatic.com/s/baloo2/v23/wXK0E3kTposypRydzVT08TS3JnAmtdiayqpv.ttf

Nunito: https://fonts.google.com/specimen/Nunito (SIL Open Font License)
Downloaded from https://fonts.gstatic.com/s/nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTM.ttf

Baloo Da 2 (Bengali display, by Ek Type): https://fonts.google.com/specimen/Baloo+Da+2 (SIL Open Font License 1.1, see BalooDa2-OFL.txt, from https://github.com/google/fonts/blob/main/ofl/balooda2/OFL.txt)
Downloaded 2026-10-16 as the Google Fonts CSS API's unicode-range subsets (v26) of the variable font, wght axis 400 to 800, which covers the 400, 600 and 800 weights the app uses:
https://fonts.gstatic.com/s/balooda2/v26/2-ci9J9j0IaUMQZwAJyJQvvdoLNAb2XKYw.woff2 (bengali) as baloo-da-2-bengali.woff2
https://fonts.gstatic.com/s/balooda2/v26/2-ci9J9j0IaUMQZwAJyJQundoLNAb2U.woff2 (latin) as baloo-da-2-latin.woff2

Noto Sans Bengali (Bengali body, by the Noto Project): https://fonts.google.com/specimen/Noto+Sans+Bengali (SIL Open Font License 1.1, see NotoSansBengali-OFL.txt, from https://github.com/google/fonts/blob/main/ofl/notosansbengali/OFL.txt)
Downloaded 2026-10-16 as the Google Fonts CSS API's unicode-range subsets (v33) of the variable font, wght axis 100 to 900 with wdth pinned to 100, which covers the 400 and 700 weights the app uses:
https://fonts.gstatic.com/s/notosansbengali/v33/Cn-fJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mc4I3mYrtU3_I-n.woff2 (bengali) as noto-sans-bengali-bengali.woff2
https://fonts.gstatic.com/s/notosansbengali/v33/Cn-fJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mc4MXmYrtU3_A.woff2 (latin) as noto-sans-bengali-latin.woff2

Subsetting: the four woff2 files are Google's bengali and latin unicode-range subsets, shipped unchanged. They were not re-subset locally: fonttools is installed but its woff2 writer needs the brotli module, which is not. The @font-face rules in apps/web/lib/i18n/fonts.css carry the matching unicode-range descriptors so a page downloads only the ranges it renders.

These original font files are self-hosted unchanged. Their respective authors retain copyright. See OFL licenses alongside the files.
