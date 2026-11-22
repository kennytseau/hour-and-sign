/* Cloudflare Pages Function: runs on every request to the site.
 *
 * Social crawlers do not execute JavaScript, so a shared link like
 *   /?b=1991-06-14&n=Kenny
 * would otherwise show the generic card. This rewrites the Open Graph tags in
 * the served HTML so each shared reading gets its own title and image, using
 * HTMLRewriter, which is built into the Workers runtime and needs no package.
 */

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

const SIGNS = [
  ["Capricorn",[12,22],[1,19]], ["Aquarius",[1,20],[2,18]], ["Pisces",[2,19],[3,20]],
  ["Aries",[3,21],[4,19]],      ["Taurus",[4,20],[5,20]],   ["Gemini",[5,21],[6,20]],
  ["Cancer",[6,21],[7,22]],     ["Leo",[7,23],[8,22]],      ["Virgo",[8,23],[9,22]],
  ["Libra",[9,23],[10,22]],     ["Scorpio",[10,23],[11,21]],["Sagittarius",[11,22],[12,21]]
];
function signFor(month, day){
  for (const s of SIGNS){
    const [fm, fd] = s[1], [tm, td] = s[2];
    if (fm <= tm){
      if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return s[0];
    } else if ((month === fm && day >= fd) || (month === tm && day <= td)) return s[0];
  }
  return SIGNS[0][0];
}

class MetaRewriter {
  constructor(map){ this.map = map; }
  element(el){
    const key = el.getAttribute("property") || el.getAttribute("name");
    if (key && this.map[key]) el.setAttribute("content", this.map[key]);
  }
}

export async function onRequest(context){
  const { request, next } = context;
  const url = new URL(request.url);
  const b = url.searchParams.get("b") || "";

  const response = await next();

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") || !VALID_DATE.test(b)) return response;

  const [y, m, d] = b.split("-").map(Number);
  if (!y || !m || !d || m > 12 || d > 31) return response;

  const name = (url.searchParams.get("n") || "").slice(0, 24).replace(/[<>"]/g, "");
  const sign = signFor(m, d);

  const img = new URL("/og", url.origin);
  img.searchParams.set("b", b);
  if (name) img.searchParams.set("n", name);

  const title = name ? `${name}'s reading · Hour & Sign` : `A ${sign} reading · Hour & Sign`;
  const desc = "Three cards from a full 78-card deck, cut by a birth date and the planetary hour. Draw your own.";

  return new HTMLRewriter()
    .on('meta[property^="og:"], meta[name^="twitter:"]', new MetaRewriter({
      "og:title": title,
      "og:description": desc,
      "og:image": img.toString(),
      "og:url": url.toString(),
      "twitter:card": "summary_large_image"
    }))
    .on("title", {
      element(el){ el.setInnerContent(title); }
    })
    .transform(response);
}
