// Génère les articles du blog à partir des fichiers .md du dossier « articles ».
// Lancé automatiquement par Vercel à chaque mise à jour du dépôt. Ne pas modifier.
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const yaml = require("js-yaml");

const ROOT = __dirname;
const OUT = path.join(ROOT, "public");
const ART = path.join(ROOT, "articles");
const SKIP = new Set(["public", "node_modules", "articles", ".git", ".github", ".vercel", "data", "package.json", "package-lock.json", "build-blog.js", "vercel.json", "COMMENT-PUBLIER.md"]);
const SITE = "https://www.serroumohammed.com";
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function copy(src, dst) {
  if (fs.statSync(src).isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); }
  else fs.copyFileSync(src, dst);
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function frDate(iso) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MOIS[m - 1]} ${y}`; }
function parse(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) throw new Error(`En-tête manquant dans ${path.basename(file)} (les lignes --- au début)`);
  let meta = {};
  try { meta = yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) || {}; }
  catch (e) { throw new Error(`En-tête illisible dans ${path.basename(file)} : ${e.message}`); }
  meta = Object.fromEntries(Object.entries(meta).map(([k, v]) => [k.toLowerCase(), v instanceof Date ? v.toISOString().slice(0, 10) : v]));
  if (meta.date != null) meta.date = String(meta.date).slice(0, 10);
  for (const k of ["titre", "date", "resume"]) if (!meta[k]) throw new Error(`Le champ « ${k} » manque dans ${path.basename(file)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`Date invalide dans ${path.basename(file)} : écris-la comme 2026-10-20`);
  const body = m[2].trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  return { ...meta, slug: path.basename(file, ".md").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
    minutes: meta.temps || Math.max(1, Math.ceil(words / 200)), html: marked.parse(body), brouillon: meta.brouillon === true || /^(oui|yes|true)$/i.test(String(meta.brouillon || "")) };
}

// 1. Copier le site
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
for (const f of fs.readdirSync(ROOT)) if (!SKIP.has(f) && !f.startsWith(".")) copy(path.join(ROOT, f), path.join(OUT, f));
if (fs.existsSync(path.join(ART, "images"))) copy(path.join(ART, "images"), path.join(OUT, "images"));

// 1b. Contenus éditables : prix, témoignages, prochain cercle (dossier « data »)
const DATA = path.join(ROOT, "data");
const loadY = (f) => { const p = path.join(DATA, f); return fs.existsSync(p) ? (yaml.load(fs.readFileSync(p, "utf8"), { schema: yaml.CORE_SCHEMA }) || {}) : {}; };
const prix = loadY("prix.yml"), cercle = loadY("cercle.yml"), tem = (loadY("temoignages.yml").temoignages || []).filter((t) => t && t.publie !== false && t.texte);
const fmtDH = (n) => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0DH";
const values = {};
for (const [k, v] of Object.entries(prix)) if (v !== null && v !== "" && !isNaN(Number(v))) values["prix." + k] = fmtDH(v);
for (const [k, v] of Object.entries(cercle)) if (v) values["cercle." + k] = esc(v);
function temSection(page) {
  const list = tem.filter((t) => !t.pages || (Array.isArray(t.pages) ? t.pages : [t.pages]).includes(page));
  if (!list.length) return "";
  const cards = list.map((t) => `<figure class="tcard"><blockquote>« ${esc(t.texte)} »</blockquote><figcaption><strong>${esc(t.prenom || "")}</strong><span>${esc([t.situation, t.programme].filter(Boolean).join(" · "))}</span></figcaption></figure>`).join("");
  return `<section><div class="wrap"><div class="head"><h2><span lang="fr">Ils en parlent</span><span lang="en">What they say</span></h2><p></p></div><div class="tgrid">${cards}</div></div></section>`;
}
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const p = path.join(OUT, f); let h = fs.readFileSync(p, "utf8"); const before = h;
  h = h.replace(/(<([a-z0-9]+)[^>]*\sdata-cms="([a-z0-9_.]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, inner, close) => (key in values ? open + values[key] + close : m));
  h = h.replace(/<!--TEMOIGNAGES:([A-Za-zé]+)-->/g, (m, page) => temSection(page));
  if (h !== before) fs.writeFileSync(p, h);
}
console.log(`Contenus : ${Object.keys(values).length} valeur(s), ${tem.length} témoignage(s).`);

// 2. Lire les articles
const posts = fs.existsSync(ART) ? fs.readdirSync(ART).filter((f) => f.endsWith(".md")).map((f) => parse(path.join(ART, f))).filter((p) => !p.brouillon) : [];
posts.sort((a, b) => b.date.localeCompare(a.date));

// 3. Générer une page par article, à partir du modèle de l'article existant
const tpl = fs.readFileSync(path.join(ROOT, "article-indicateurs.html"), "utf8");
const a0 = tpl.indexOf('<article class="article">'), a1 = tpl.indexOf("</article>") + "</article>".length;
const EXTRA_CSS = `<style>.article a{color:var(--accent)}.article blockquote{margin:28px 0;padding:18px 22px;background:var(--wash);border-left:3px solid var(--accent)}.article blockquote p{margin:0;font-size:18px}.article img{max-width:100%;height:auto;margin:20px 0}.article table{width:100%;border-collapse:collapse;margin:24px 0;font-size:16px}.article th,.article td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}.article th{color:var(--accent)}.article h3{font-family:var(--serif);font-weight:400;font-size:22px;margin:30px 0 8px}</style>`;
for (const p of posts) {
  let head = tpl.slice(0, a0), tail = tpl.slice(a1);
  head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.titre)} | Mohammed Serrou</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(p.resume)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(p.titre)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(p.resume)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}/article-${p.slug}.html">`)
    .replace("</head>", EXTRA_CSS + "</head>");
  const art = `<article class="article"><a class="back" href="blog.html">Retour au blog</a><div class="meta">${frDate(p.date)} · ${p.minutes} min de lecture</div><h1>${esc(p.titre)}</h1>${p.html}</article>`;
  fs.writeFileSync(path.join(OUT, `article-${p.slug}.html`), head + art + tail);
}

// 4. Ajouter les articles en tête de la page Blog
const blogFile = path.join(OUT, "blog.html");
let blog = fs.readFileSync(blogFile, "utf8");
const cards = posts.map((p) => `<article class="post"><div class="meta">${frDate(p.date)} · ${p.minutes} min</div><h3><a href="article-${p.slug}.html" style="text-decoration:none">${esc(p.titre)}</a></h3><p>${esc(p.resume)}</p><a class="read" href="article-${p.slug}.html">Lire l’article</a></article>`).join("");
blog = blog.replace('<div class="posts">', '<div class="posts">' + cards);
fs.writeFileSync(blogFile, blog);

// 5. Plan du site
const smFile = path.join(OUT, "sitemap.xml");
if (fs.existsSync(smFile)) {
  const urls = posts.map((p) => `<url><loc>${SITE}/article-${p.slug}.html</loc><lastmod>${p.date}</lastmod></url>`).join("");
  fs.writeFileSync(smFile, fs.readFileSync(smFile, "utf8").replace("</urlset>", urls + "</urlset>"));
}
console.log(`Blog : ${posts.length} article(s) publié(s).`);
