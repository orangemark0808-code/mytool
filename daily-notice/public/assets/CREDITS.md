# Moon photograph

- Asset: `moon-full.webp` — 252 × 252 pixels, RGBA WebP, 17,784 bytes (3× the 84px desktop display).
- Photograph: **Lunar Reconnaissance Orbiter Wide Angle Camera (LROC WAC) mosaic**, lunar near side.
- Credit: **NASA/ASU**.
- Source and explicit license: https://www.usgs.gov/media/images/lunar-reconnaissance-orbiter-wide-angle-camera-lroc-wac-mosaic — Sources/Usage: Public Domain; image credited to NASA/ASU.
- Original image: https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/thumbnails/image/WAC_Mosaic_100mpp_Near_Side_0.png — 7006 × 7005 pixels. The 220px medium thumbnail was inspected but not used for the delivered asset.
- Mission and mosaic description: https://science.nasa.gov/photojournal/nearside-spectacular/
- Processing: downsample original to 252px with Lanczos; neutral grayscale; circular alpha mask (centre 126,126, radius 125.7); WebP quality 92, source metadata omitted. No AI generation, synthetic craters, sharpening or bump mapping.
- Runtime illustration: smooth radial limb darkening `0.5 + 0.5 * nz^0.6`, a broad 8% upper-right/upper-left highlight, exposure 1.45, gamma 0.85 and a soft highlight shoulder. A curved phase shadow has a 15%-of-radius feather, with 18% neutral earthshine outside the lit area; near-full shadows are deliberately faint to avoid a black stripe. Edge coverage has a 1.25 CSS pixel smooth transition, with no exterior glow or drop shadow. The projected phase is rotated toward the upper right/left for presentation. This illustration does not reproduce current libration, exact sky orientation or physically calibrated surface radiance. Astronomical phase, illumination, age, names and solar calculations are unchanged.
- Runtime color: after the unchanged spherical shading, map rendered luminance through #1f2a3d (0), #6f84a3 (0.5), #eef3fa (1), with continuous linear interpolation. Preserve alpha and remove the former warm tint. The photograph itself is unchanged.
- Retrieved and license checked: 2026-10-24.

The previous Apollo 11 photograph has been replaced by the higher-resolution WAC mosaic. NASA SVS's different 1,231-frame NAC photomosaic (https://svs.gsfc.nasa.gov/5001/) was not selected; the delivered asset uses the USGS-hosted WAC mosaic above.
