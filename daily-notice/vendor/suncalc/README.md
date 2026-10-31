# SunCalc 2.1.1

Upstream: https://github.com/mourner/suncalc/tree/v2.1.1

- `suncalc.js` is upstream `index.js`, with the full upstream BSD-2-Clause license prepended as a comment. The calculation code is unchanged.
- `suncalc.d.ts` is upstream `index.d.ts`.
- `LICENSE` is the unmodified upstream license. SunCalc is BSD-2-Clause, not MIT.

Upstream Git blob SHAs:

- `index.js`: `6eb290724b83f9dba433157b068a1ba6f8be1c92`
- `index.d.ts`: `528616faf120a28ab963650f22279fb59997eeae`
- `LICENSE`: `be7ac39d4a6afcc1094d68b467806406c2e78d6c`

The app imports the local module. It makes no runtime request to a CDN or astronomy API. The production bundler includes it in hashed application assets. The source retains the full license comment; the production assets also include the license at `/licenses/suncalc.txt`, independently of minifier comment removal.
