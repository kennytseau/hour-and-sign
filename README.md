# Hour &amp; Sign

A three-card reading from a full 78-card tarot deck, cut by your birth date and the planetary hour you ask in. One static HTML file plus two Cloudflare Functions for share images.

## The deck

All 78 cards: 22 Major Arcana and four suits of 14. Nothing is omitted or softened — Death, The Tower, The Devil, the Three of Swords, the Nine and Ten of Swords and the Five of Pentacles are all in there, each with a plain-English "do not panic" note on the card explaining what it actually means, because those are the cards that frighten people on a first reading.

Readers can switch to **22 Majors only** if they want the big thematic deck, but the default is the whole thing.

## How the three cards are drawn

| Slot | Source | Changes |
|---|---|---|
| **The Sign** | your birth date, via Mary Greer's birth-card method | never — your standing card for life |
| **The Hour** | the day's hand, dealt watch by watch | every 3 hours, 8 distinct cards a day |
| **The Turning** | what the eight watches left behind, weighted by the current solar sign | once a day, face and orientation |

The whole day is dealt in **one sequential pass**: for each of the eight watches, a card is drawn from the pool under that watch's own planetary weighting and removed. That sequencing matters — weighting the deck once using the *current* hour's planet re-ordered it every three hours and brought repeated cards back on 48% of days.

The three cards in a spread come from one deck, so they can never duplicate. That dependence is deliberate: it is what a physical shuffle does.

## Randomness: deterministic where it should be, truly random where it must be

Two different mechanisms, on purpose:

- **The daily reading** uses a seeded PRNG (`xmur3` → `sfc32`). The same person, same hour, same day always gets the same spread. Refreshing changes nothing. This is the feature — it is what makes it read like a reading rather than a slot machine, and it is why the countdown to the next watch means something.
- **The one-question draw** uses `crypto.getRandomValues`. Flat odds, no weighting, no seed, genuinely different every press. When you ask a specific question you want a real shuffle, not yesterday's answer.

Both are verified in the test log below.

## The odds, and what bends them

With weighting on, the deck is not flat. The multipliers come from **Golden Dawn correspondences**, which are long-standing attributions rather than inventions, plus two timing rules:

| Rule | Multiplier | Why |
|---|---|---|
| The current planetary hour's own Major | x2.5 | Every planet has a traditional card: Mercury → The Magician, Mars → The Tower, Venus → The Empress, Saturn → The World, Jupiter → Wheel of Fortune, Sun → The Sun, Moon → The High Priestess |
| The current solar sign's own Major | x2.0 | Same system for the zodiac: Scorpio → Death, Leo → Strength, Libra → Justice, and so on |
| Waxing moon → the seven cards of beginning | x1.6 | Fool, Magician, Empress, Lovers, Chariot, Star, Sun |
| Waning moon → the seven cards of ending | x1.6 | Hermit, Hanged Man, Death, Tower, Moon, Judgement, World |
| Full moon → both sets | x1.25 | Everything is lit |
| **Mercury retrograde** → Magician, Wheel, Hanged Man, Moon, Judgement | x1.8 | Delay, review, the misread message |
| **Mercury retrograde** → the whole Swords suit | x1.4 | Swords is the suit of speech and thought |
| **Mercury retrograde** → reversal chance | **+10 points** | The one rule that changes orientation rather than which card appears |
| Your own element's suit | x1.35 | A Fire sun gets slightly more Wands |

Weights apply to a **weighted shuffle, not a lottery**. A card at x2.5 is two and a half times as likely to come off the top, and the lowest-weighted card in the deck can still be the first one dealt. Measured across 3,360 birth dates at a single instant, every one of the 78 cards still appeared.

The page shows the live table under **"The odds, and what is bending them"**, listing exactly which rules are firing right now and which cards they lift. Switching Astrology to **flat deck** removes all of it, and the test log confirms the flat deck is statistically uniform.

### Mercury retrograde is approximated

Mercury's synodic period is 115.88 days and it is apparently retrograde for roughly 19% of each one. The page models this as a repeating window from a known retrograde midpoint rather than looking it up, which gives about 3 periods a year covering about 18% of days — correct in shape, but it can be a few days out at the edges, and the page labels it "approx".

**If you want it exact**, replace `mercuryRetrograde()` in `index.html` with a lookup table of real station dates. It is the one number in the project worth sourcing properly, and it is isolated in a single function for that reason.

## Share images (Cloudflare Functions)

Social crawlers do not run JavaScript, so a shared link needs server-rendered meta tags:

- `functions/_middleware.js` — rewrites `og:title`, `og:description`, `og:image` and `og:url` per shared reading using **HTMLRewriter**, which is built into the Workers runtime and needs no dependency.
- `functions/og.js` — renders the 1200x630 PNG with `workers-og`.

The image shows the **standing card**, not the hour card, deliberately: a link is clicked hours or days after it is posted, and the standing card is the only part of a reading that never goes stale. It also means the function needs the 22 Major names and two small date functions rather than a copy of the whole engine.

> **Not yet verified against a live deployment.** The engine logic is tested, but the Functions need a real Pages deploy (or `npx wrangler pages dev .`) to confirm the font fetch and the `workers-og` render. Check `/og?b=1991-06-14&n=Test` first.

## Test log

Run in a browser console against the shipped functions. Five real defects were found and fixed across two rounds:

| Test | Result |
|---|---|
| Deck integrity | 78 cards, 22 majors + 4x14 minors, 78 unique names, Death/Tower/Devil/3 of Swords all present |
| Same inputs, 300 repeats | 1 distinct result |
| **Repeated hour card within a day** | **0 of 720** (was 80%, then 344/720 after a weighting regression) |
| **Standing card: unreachable cards** | **1 of 22**, reachable as a soul card (was 3) |
| **Standing card: share landing on XIII–XXI** | **24.2%** (was 13.5%) |
| **Day card holds face + orientation all day** | **720 / 720** (previously flipped every 3 hours) |
| Duplicate cards within one spread | 0 of 6,912 |
| Flat deck uniformity (weighting off) | chi-square 77.2, df 77, critical 112.7 — uniform |
| Independence across people, one instant | chi-square 86.1, df 77 — uniform, no card unreachable |
| Independence day to day (lag-1) | 305 repeats observed vs 316 expected by chance — independent |
| Weighted: Mercury's card in a Mercury hour | **3.74x** observed against 4.0 nominal |
| Weighted: waxing group under a waxing moon | **1.57x** against 1.6 nominal |
| Weighted: all 78 cards still reachable | 78 / 78 |
| Crypto one-question draw, 78,000 pulls | chi-square 83.1, df 77 — uniform; 59 consecutive repeats vs 64 expected |
| Mercury retrograde model | 3 periods in 2026, 18.1% of days |
| Live page render | 78/78 card artworks clean, no console errors, zero mojibake |

Planetary hours were checked against five classical rules: the sunrise hour matches the day ruler for all seven weekdays, Chaldean order holds between consecutive hours, the next day's sunrise rolls over correctly, pre-dawn hours fall in the previous day's sequence, and each planet gets exactly 24 of the week's 168 hours.

## Encoding

`index.html` is **pure ASCII** — zero bytes above 127, no BOM. Every symbol is an HTML entity (`&mdash;`) or a JavaScript escape (`·`, `♈`). This is deliberate: an earlier build served real UTF-8 em dashes and they arrived as `â€”` after one encoding step in the publish path. ASCII source cannot be mangled by any pipeline.

If you edit the file, keep it that way. To check:

```powershell
$b=[IO.File]::ReadAllBytes("index.html"); ($b | Where-Object {$_ -gt 127}).Count
```

That must print `0`.

## Files

```
index.html                 the whole app - markup, CSS, JS, pure ASCII
functions/_middleware.js   per-reading Open Graph tags (no dependencies)
functions/og.js            1200x630 share image (workers-og)
package.json               one dependency, for the image function
_headers                   security + cache headers
404.html, robots.txt
```

`preview.html` is a generated copy with the `<head>`/`<body>` wrapper stripped, used only for a Claude artifact preview. Gitignored, not part of the site.

## Deploy: GitHub to Cloudflare Pages

```powershell
git init
git add .
git commit -m "Hour & Sign: seeded three-card reading"
git branch -M main
gh repo create hour-and-sign --public --source . --push
```

Then **Workers & Pages → Create → Pages → Connect to Git**:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm install` |
| Build output directory | `/` |
| Production branch | `main` |

The build command is only there so Pages installs `workers-og` for the image function; the site itself needs no build. If you drop the share images, leave it empty and delete `functions/` and `package.json`.

Run it locally with the Functions working:

```powershell
npx wrangler@latest pages dev .
```

## Shareable links

```
https://hour-and-sign.pages.dev/?b=1991-06-14&t=7&n=Kenny
```

`b` = birth date, `t` = birth hour (0-23, optional), `n` = name (optional). The "Copy share link" button builds these. With no parameters the page falls back to `localStorage`, then to a clearly-labelled example, so the first frame is never empty.

## Privacy

The birth date never leaves the browser for the reading itself. No analytics, no cookie, no fetch. Note the one exception: if you share a link, the birth date is in the URL and therefore reaches Cloudflare in the request for the share image — which is unavoidable for per-reading preview cards, and is the only data that ever leaves the device.

## Still worth adding

1. **A real Mercury retrograde table** — see above.
2. **Reading history** — last 30 draws in `localStorage` with a "you drew this before" note.
3. **Moon sign, not just phase** — a mean-longitude approximation is about 30 lines.
4. **Elemental dignities** — adjacent cards of opposing elements traditionally weaken each other; a real readers' feature and a natural fit now the suits exist.
5. **A gentler deck toggle** that swaps the heavy cards' artwork rather than removing them.

## Licence

MIT. For fun. Not advice.
