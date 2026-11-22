/* Cloudflare Pages Function: GET /og?b=YYYY-MM-DD&n=Name
 *
 * Renders the 1200x630 share image. It shows the STANDING card, not the hour
 * card, on purpose: a share link is clicked hours or days after it is posted,
 * and the standing card is the one part of a reading that never goes stale.
 * It also means this function needs only the 22 Major names and two small
 * date functions, rather than a copy of the whole 78-card engine.
 */
import { ImageResponse } from "workers-og";

const MAJORS = [
  "The Fool","The Magician","The High Priestess","The Empress","The Emperor",
  "The Hierophant","The Lovers","The Chariot","Strength","The Hermit",
  "Wheel of Fortune","Justice","The Hanged Man","Death","Temperance","The Devil",
  "The Tower","The Star","The Moon","The Sun","Judgement","The World"
];
const NUMERALS = ["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI",
  "XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"];

const SIGNS = [
  ["Capricorn","♑",[12,22],[1,19],"Earth"], ["Aquarius","♒",[1,20],[2,18],"Air"],
  ["Pisces","♓",[2,19],[3,20],"Water"],     ["Aries","♈",[3,21],[4,19],"Fire"],
  ["Taurus","♉",[4,20],[5,20],"Earth"],     ["Gemini","♊",[5,21],[6,20],"Air"],
  ["Cancer","♋",[6,21],[7,22],"Water"],     ["Leo","♌",[7,23],[8,22],"Fire"],
  ["Virgo","♍",[8,23],[9,22],"Earth"],      ["Libra","♎",[9,23],[10,22],"Air"],
  ["Scorpio","♏",[10,23],[11,21],"Water"],  ["Sagittarius","♐",[11,22],[12,21],"Fire"]
];
function signFor(month, day){
  for (const s of SIGNS){
    const [fm, fd] = s[2], [tm, td] = s[3];
    if (fm <= tm){
      if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return s;
    } else if ((month === fm && day >= fd) || (month === tm && day <= td)) return s;
  }
  return SIGNS[0];
}
const digitSum = n => String(n).split("").reduce((a, c) => a + Number(c), 0);
function birthCard(y, m, d){                       /* Mary Greer's method */
  let t = m + d + y;
  while (t > 22) t = digitSum(t);
  return t === 22 ? 0 : t;
}
const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

/* Satori needs a real font buffer and cannot read woff2, so ask Google Fonts
   with an old User-Agent, which makes it serve TTF. Cached at the edge. */
async function loadFont(family, weight, ctx){
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`;
  const cache = caches.default;
  const key = new Request(cssUrl + "#ttf");
  let hit = await cache.match(key);
  if (!hit){
    const css = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 Chrome/40 Safari/537.36" }
    }).then(r => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    hit = new Response(await fetch(url).then(r => r.arrayBuffer()), {
      headers: { "Cache-Control": "public, max-age=31536000" }
    });
    ctx?.waitUntil(cache.put(key, hit.clone()));
  }
  return await hit.arrayBuffer();
}

export async function onRequestGet(context){
  const { request } = context;
  const url = new URL(request.url);
  const b = url.searchParams.get("b") || "";
  const name = (url.searchParams.get("n") || "").slice(0, 24);

  let heading = "Hour &amp; Sign";
  let sub = "Three cards, cut by your birth date and the hour you ask in";
  let numeral = "✦", cardName = "78 cards", meta = "A full deck, reshuffled eight times a day";

  if (/^\d{4}-\d{2}-\d{2}$/.test(b)){
    const [y, m, d] = b.split("-").map(Number);
    const s = signFor(m, d);
    const card = birthCard(y, m, d);
    heading = name ? esc(name) : (s[0] + " sun");
    sub = `${s[1]} ${s[0]} · ${s[4]}`;
    numeral = NUMERALS[card];
    cardName = MAJORS[card];
    meta = "Standing card · the one that never changes";
  }

  const display = await loadFont("Fraunces", 900, context);
  const mono = await loadFont("Space+Mono", 700, context);
  const fonts = [];
  if (display) fonts.push({ name:"Fraunces", data:display, weight:900, style:"normal" });
  if (mono) fonts.push({ name:"Space Mono", data:mono, weight:700, style:"normal" });

  const html = `
    <div style="display:flex;width:1200px;height:630px;background:#e7e4d8;color:#141e3c;
                font-family:'Fraunces',serif;padding:64px;box-sizing:border-box;">
      <div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;">
        <div style="display:flex;flex-direction:column;">
          <div style="display:flex;font-family:'Space Mono',monospace;font-size:22px;
                      letter-spacing:6px;color:#4e5675;">HOUR &amp; SIGN</div>
          <div style="display:flex;font-size:84px;font-weight:900;margin-top:18px;
                      line-height:1;">${heading}</div>
          <div style="display:flex;font-family:'Space Mono',monospace;font-size:28px;
                      color:#4e5675;margin-top:16px;letter-spacing:2px;">${sub}</div>
        </div>
        <div style="display:flex;font-family:'Space Mono',monospace;font-size:20px;
                    letter-spacing:3px;color:#4e5675;">${meta}</div>
      </div>
      <div style="display:flex;width:340px;height:502px;border:3px solid #141e3c;
                  background:#dedac9;flex-direction:column;align-items:center;
                  justify-content:center;margin-left:48px;">
        <div style="display:flex;font-family:'Space Mono',monospace;font-size:26px;
                    letter-spacing:4px;color:#ff3f6b;">${numeral}</div>
        <div style="display:flex;font-size:48px;font-weight:900;text-align:center;
                    margin-top:24px;padding:0 24px;line-height:1.1;">${cardName}</div>
      </div>
    </div>`;

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: fonts.length ? fonts : undefined,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" }
  });
}
