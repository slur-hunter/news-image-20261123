[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/slur-hunter/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/slur-hunter/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

# The World in One Page — Monday 23 November 2026

A program that sums up Monday 23 November 2026 world news in one
1024×1024 image: **38 verified stories across 7 regions**, each named with
its place and source.

- Masthead with the day, story count and regions
- Big-number strip: Democrats' 258+ House seats, Kospi −3.9%, Brent $92.29,
  1,600+ delayed Delta flights, 50 missing after the Serang factory fire
- Region bars, 4 full stories with drawn illustrations (COP31 collapse,
  Hormuz tankers, Kospi plunge, boy pulled alive in the Kyiv region),
  a numbered also-on list of 34 more stories, a world map with pins 1–38,
  and a date-check box naming real stories from other days that are left out.

## Run

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png
```

Node 22, standard library only, no network. The program draws everything in
code (5×7 bitmap font, pixel canvas, hand-rolled PNG encoder) and is fully
deterministic: two runs write byte-identical PNGs. Output is a PNG of at
most 1 MiB and 1024×1024 pixels.

## Sources

Every story was verified against a live news source on 23 November 2026,
including BBC, Reuters, UKMTO, USGS, WHO, FIFA, NDTV, The Hindu, MENAFN,
Radio Dabanga, Delta, Cleverbridge and the Estonia MFA.
