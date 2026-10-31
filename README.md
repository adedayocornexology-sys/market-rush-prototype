# Market Rush — Lagos prototype

A playable prototype: the Slop New York Mini city engine, re-graded for Lagos. Same Midtown street
geometry, warm dust-and-terracotta palette, danfo-yellow interface.

**This is an engine and look test, not a Lagos map.** The buildings and streets are still Manhattan.
Replacing them with Lagos Island or Abuja CBD geometry is the next step (see `tools/`).

## What changed from the fork

| file | change |
|---|---|
| `js/boroughs.js` | `PALETTE`: 7 facade swatch families re-graded warm (terracotta, ochre, cream, weathered concrete) |
| `js/lighting.js` | all four time-of-day presets: sun, hemisphere, sky and fog re-graded, haze density raised |
| `index.html` | title, loader and HUD renamed; GitHub link points at the upstream mini |
| `css/style.css` | GPU-lost link accent matched to the brand yellow |

## Run it

Serve the folder over http (not `file://`):

```
python -m http.server 8000
```

Open `http://localhost:8000`. Add `?phone` for the phone mode (no trees, no shadows, Midtown only).

## Controls

WASD / arrows to walk or drive, `E` to enter a vehicle, `C` to change camera, mouse or touch to look.

## Licence and data

Code: MIT. This repository is a fork of [mattiaongit/slop-newyork-mini](https://github.com/mattiaongit/slop-newyork-mini),
which is a fork of [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork) by Ricardo Cabello. The original
copyright notice is retained in `LICENSE`.

Map data: New York City Open Data and © OpenStreetMap contributors (ODbL). Attribution must stay visible.

three.js is loaded from jsDelivr, pinned to a build commit.
