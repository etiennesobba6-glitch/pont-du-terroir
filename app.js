const $ = (s) => document.querySelector(s);
const source = $("#langue-source");
const cible = $("#langue-cible");
const inverser = $("#inverser");
const contenu = $("#contenu");
const recherche = $("#recherche");

let LANGUES = [];
let SERIES = [];
const cache = {};
let audioEnCours = null;
let version = 0;

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

async function charger(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Impossible de charger " + url);
  return r.json();
}

async function chargerSerie(id) {
  if (!cache[id]) cache[id] = await charger(`data/serie-${id}.json`);
  return cache[id];
}

function normaliser(t) {
  return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* ---------- Audio : audio/<langue>/<id>.mp3 ---------- */
function jouer(langue, id, bouton) {
  if (audioEnCours) audioEnCours.pause();
  const a = new Audio(`audio/${langue}/${id}.mp3`);
  audioEnCours = a;
  bouton.textContent = "🔊";
  a.play().catch(() => {
    bouton.textContent = "🔇";
    bouton.title = "Audio bientôt disponible";
  });
}

/* ---------- Cartes de phrases ---------- */
function ligne(langue, texte, id, classe) {
  const l = el("div", "ligne");
  if (!texte) {
    l.appendChild(el("p", classe + " vide", "à venir"));
    return l;
  }
  l.appendChild(el("p", classe, texte));
  const b = el("button", "son", "🔊");
  b.type = "button";
  b.setAttribute("aria-label", "Écouter");
  b.addEventListener("click", () => jouer(langue, id, b));
  l.appendChild(b);
  return l;
}

function carte(p, etiquette) {
  const c = el("div", "phrase-carte");
  if (etiquette) c.appendChild(el("p", "etiquette", etiquette));
  c.appendChild(ligne(source.value, p[source.value], p.id, "texte-source"));
  c.appendChild(ligne(cible.value, p[cible.value], p.id, "texte-cible"));
  return c;
}

/* ---------- Vues ---------- */
async function afficherAccueil(v) {
  contenu.replaceChildren();

  const pdj = el("div", "pdj");
  contenu.appendChild(pdj);

  contenu.appendChild(el("h2", "", "Séries"));
  const liste = el("div", "series");
  SERIES.forEach((s) => {
    const c = el(s.fichier ? "a" : "div", "serie" + (s.fichier ? "" : " bientot"));
    if (s.fichier) c.href = `#serie-${s.id}`;
    c.appendChild(el("span", "num", String(parseInt(s.id, 10))));
    c.appendChild(el("span", "icone", s.emoji));
    c.appendChild(el("span", "titre", s.titre));
    if (!s.fichier) c.appendChild(el("span", "badge", "bientôt"));
    else if (s.moundang === false) c.appendChild(el("span", "badge", "moundang bientôt"));
    liste.appendChild(c);
  });
  contenu.appendChild(liste);

  // Phrase du jour
  const completes = SERIES.filter((s) => s.fichier && s.moundang !== false);
  const dispo = completes.length ? completes : SERIES.filter((s) => s.fichier);
  if (!dispo.length) return;
  try {
    const jour = Math.floor(Date.now() / 86400000);
    const s = dispo[jour % dispo.length];
    const phrases = await chargerSerie(s.id);
    if (v !== version) return;
    const p = phrases[jour % phrases.length];
    pdj.appendChild(el("h2", "", "Phrase du jour"));
    const encart = el("div", "encart");
    encart.appendChild(carte(p));
    pdj.appendChild(encart);
  } catch (e) {}
}

async function afficherSerie(id, v) {
  const s = SERIES.find((x) => x.id === id);
  contenu.replaceChildren();
  const retour = el("a", "retour", "← Toutes les séries");
  retour.href = "#";
  contenu.appendChild(retour);

  if (!s || !s.fichier) {
    contenu.appendChild(el("p", "info", "Cette série n'est pas encore disponible."));
    return;
  }
  contenu.appendChild(el("h2", "", `${s.emoji} ${parseInt(id, 10)}. ${s.titre}`));
  try {
    const phrases = await chargerSerie(id);
    if (v !== version) return;
    phrases.forEach((p, i) => contenu.appendChild(carte(p, String(i + 1))));
  } catch (e) {
    contenu.appendChild(el("p", "info", "Impossible de charger cette série. Vérifie la connexion."));
  }
}

async function afficherRecherche(q, v) {
  contenu.replaceChildren();
  const dispo = SERIES.filter((s) => s.fichier);
  try {
    await Promise.all(dispo.map((s) => chargerSerie(s.id)));
  } catch (e) {
    contenu.appendChild(el("p", "info", "Impossible de charger les phrases."));
    return;
  }
  if (v !== version) return;
  const cle = normaliser(q);
  const trouves = [];
  dispo.forEach((s) => {
    cache[s.id].forEach((p, i) => {
      const texte = LANGUES.map((l) => normaliser(p[l.code])).join(" ");
      if (texte.includes(cle)) trouves.push({ p, s, i });
    });
  });
  contenu.appendChild(el("h2", "", `${trouves.length} résultat${trouves.length > 1 ? "s" : ""}`));
  if (!trouves.length) {
    contenu.appendChild(el("p", "info", "Aucune phrase trouvée."));
    return;
  }
  trouves.slice(0, 50).forEach(({ p, s, i }) =>
    contenu.appendChild(carte(p, `${s.emoji} ${parseInt(s.id, 10)}. ${s.titre} · n° ${i + 1}`))
  );
}

function route() {
  const v = ++version;
  const q = recherche.value.trim();
  if (q.length >= 2) return afficherRecherche(q, v);
  const m = location.hash.match(/^#serie-(\d{2})$/);
  if (m) return afficherSerie(m[1], v);
  return afficherAccueil(v);
}

/* ---------- Langues ---------- */
function remplir(select, defaut, cle) {
  LANGUES.forEach((l) => {
    const o = document.createElement("option");
    o.value = l.code;
    o.textContent = l.nom;
    select.appendChild(o);
  });
  let valeur = defaut;
  try {
    const enregistre = localStorage.getItem(cle);
    if (LANGUES.some((l) => l.code === enregistre)) valeur = enregistre;
  } catch (e) {}
  select.value = valeur;
}

function sauvegarder() {
  try {
    localStorage.setItem("langue-source", source.value);
    localStorage.setItem("langue-cible", cible.value);
  } catch (e) {}
}

/* ---------- Taille du texte ---------- */
let taille = 112.5;
function appliquerTaille() {
  document.documentElement.style.fontSize = taille + "%";
  try { localStorage.setItem("taille", String(taille)); } catch (e) {}
}
function initTaille() {
  try {
    const t = parseFloat(localStorage.getItem("taille"));
    if (t >= 90 && t <= 200) taille = t;
  } catch (e) {}
  appliquerTaille();
  $("#plus-grand").addEventListener("click", () => { taille = Math.min(200, taille + 12.5); appliquerTaille(); });
  $("#plus-petit").addEventListener("click", () => { taille = Math.max(90, taille - 12.5); appliquerTaille(); });
}

async function init() {
  initTaille();
  try {
    LANGUES = await charger("data/langues.json");
    SERIES = await charger("data/series.json");
  } catch (e) {
    contenu.appendChild(el("p", "info", "Impossible de charger les données. Ouvre la page depuis un serveur (GitHub Pages ou localhost)."));
    return;
  }
  remplir(source, "fr", "langue-source");
  remplir(cible, "moundang", "langue-cible");

  [source, cible].forEach((s) =>
    s.addEventListener("change", () => {
      sauvegarder();
      route();
    })
  );
  inverser.addEventListener("click", () => {
    const t = source.value;
    source.value = cible.value;
    cible.value = t;
    sauvegarder();
    route();
  });
  recherche.addEventListener("input", route);
  window.addEventListener("hashchange", () => {
    window.scrollTo(0, 0);
    route();
  });
  route();
}

init();
