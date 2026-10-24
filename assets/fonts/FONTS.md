# Self-hosted fonts, provenance

All files in this directory are SIL Open Font License (OFL) webfonts,
downloaded 2026-10-13 from the Google Fonts css2 API (woff2) and
served locally, so the site makes zero remote font requests.
QA-013 closed the single point of failure where one Google Fonts
css2 call carried the whole type system on all 66 pages.

Request used (Chrome user agent, so the css2 API returns woff2):

```
https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap
```

Only the latin and latin-ext subset files were kept, matching what
the old call delivered to this site's pages. Barlow arrives as one
static file per weight. JetBrains Mono arrives as one variable file
per subset: the css2 responses for weight 400 and weight 700 point
at the same URL, and the file's measured fvar range is wght 400 to
800 (fontTools), which covers both weights the site uses.

| file | family | subset | weight | source URL |
|---|---|---|---|---|
| barlow-latin-400.woff2 | Barlow | latin | 400 static | https://fonts.gstatic.com/s/barlow/v13/7cHpv4kjgoGqM7E_DMs5.woff2 |
| barlow-latin-500.woff2 | Barlow | latin | 500 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3_-gs51os.woff2 |
| barlow-latin-600.woff2 | Barlow | latin | 600 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E30-8s51os.woff2 |
| barlow-latin-700.woff2 | Barlow | latin | 700 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4s51os.woff2 |
| barlow-latin-800.woff2 | Barlow | latin | 800 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3q-0s51os.woff2 |
| barlow-latin-ext-400.woff2 | Barlow | latin-ext | 400 static | https://fonts.gstatic.com/s/barlow/v13/7cHpv4kjgoGqM7E_Ass52Hs.woff2 |
| barlow-latin-ext-500.woff2 | Barlow | latin-ext | 500 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3_-gs6VospT4.woff2 |
| barlow-latin-ext-600.woff2 | Barlow | latin-ext | 600 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E30-8s6VospT4.woff2 |
| barlow-latin-ext-700.woff2 | Barlow | latin-ext | 700 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4s6VospT4.woff2 |
| barlow-latin-ext-800.woff2 | Barlow | latin-ext | 800 static | https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3q-0s6VospT4.woff2 |
| jetbrains-mono-latin-var.woff2 | JetBrains Mono | latin | variable 400 to 800 | https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2 |
| jetbrains-mono-latin-ext-var.woff2 | JetBrains Mono | latin-ext | variable 400 to 800 | https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwhsk.woff2 |

Delivery rules (Aesthetics ROUND-001 section 5) live in
assets/css/fonts.css: font-display swap everywhere, the display
face preloaded from the page head at the generator source, one
metric-adjusted fallback face per shipped face, and
font-synthesis-weight none at the root in assets/css/base.css.

## Rotation 23 addition: Archivo (the display voice)

Downloaded 2026-10-14 from the Google Fonts css2 API (woff2),
request `family=Archivo:wght@600;700;800;900`. Archivo arrives as
one variable file per subset: the css2 responses for all four
weights point at the same URL, and the file's measured fvar range
is wght 100 to 900 (fontTools), which covers every weight the site
sets. Measured on the shipped files: upm 1000, x-height 526
(constant across the weight axis), hhea ascent 878, descent 210.

| file | family | subset | weight | source URL |
|---|---|---|---|---|
| archivo-latin-var.woff2 | Archivo | latin | variable 100 to 900 | https://fonts.gstatic.com/s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLydOxKsv4Rn.woff2 |
| archivo-latin-ext-var.woff2 | Archivo | latin-ext | variable 100 to 900 | https://fonts.gstatic.com/s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLyTOxKsv4RnUPU.woff2 |

From rotation 23 the preloaded display face is the Archivo latin
variable file (it replaced the Barlow 700 latin preload at the
generator source); Barlow remains shipped in full for body text.

## Rotation 135 addition: the Build Booklet voices (Aesthetics Round 366, fix C1)

Downloaded 2026-10-23 from the Google Fonts css2 API (woff2), request
`family=Archivo:ital,wdth,wght@0,62..125,100..900&family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800&display=swap`
(Chrome user agent). Only the latin and latin-ext subsets were kept,
matching this file's standing practice. The extraction's remote css2
stylesheet link does NOT ship; these faces are declared locally in
assets/css/fonts.css, so the zero-remote-fonts rule stands.

| file | family | subset | axes (fontTools) | source URL |
|---|---|---|---|---|
| archivo-wdth-latin-var.woff2 | Archivo | latin | wdth 62 to 125, wght 100 to 900 | https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLg.woff2 |
| archivo-wdth-latin-ext-var.woff2 | Archivo | latin-ext | wdth 62 to 125, wght 100 to 900 | https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdfoLnnA.woff2 |
| atkinson-latin-var.woff2 | Atkinson Hyperlegible Next | latin | wght 200 to 800 | https://fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/NaPNcYPdHfdVxJw0IfIP0lvYFqijb-UxCtm5_wdGseiJn3o.woff2 |
| atkinson-latin-ext-var.woff2 | Atkinson Hyperlegible Next | latin-ext | wght 200 to 800 | https://fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/NaPNcYPdHfdVxJw0IfIP0lvYFqijb-UxCtm5_wdGseiHn3qmpQ.woff2 |

Measured on the shipped files: Archivo wdth upm 1000, x-height 526,
hhea ascent 878, descent 210 (identical metrics to the wght-only
Archivo, so its fallback numbers carry over). Atkinson upm 1000,
x-height 496, hhea ascent 984, descent 316.
