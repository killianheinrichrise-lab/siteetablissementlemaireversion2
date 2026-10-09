"""Assemble les pages du site à partir de src/ (gabarit + parties communes).

Usage : python tools/build_pages.py
  src/layout.html          gabarit commun (head, en-tête, pied de page, scripts)
  src/partials/*.html      parties réutilisées : {{header}}, {{footer}}, {{process}}…
  src/pages/*.html         une page par fichier (les fichiers « _*.html » sont des fragments)

En tête de chaque page, un bloc de réglages :
  <!--meta {"title": "…", "description": "…", "path": "/gros-oeuvre/", "nav": "services", "svc": "gros-oeuvre"} -->
puis, facultatifs, <!--slot:head--> … <!--/slot--> et <!--slot:jsonld--> … <!--/slot-->.
Aucune dépendance : bibliothèque standard Python uniquement.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
OUT = ROOT / "site"

# pages « Nos services » : utilisées pour les cartes « Découvrez nos autres services »
SERVICES = [
    ("gros-oeuvre", "/gros-oeuvre/", "Gros œuvre", "/assets/img/svc-gros-oeuvre-sm.webp",
     "De la maçonnerie aux finitions, nous vous accompagnons dans tous vos projets de construction et de rénovation : charpente, toiture, isolation, ravalement, menuiserie, revêtements…"),
    ("second-oeuvre", "/second-oeuvre/", "Second œuvre", "/assets/img/svc-second-oeuvre-sm.webp",
     "Nous vous accompagnons dans l’ensemble des finitions intérieures de votre habitat, de la définition des espaces avec la plâtrerie jusqu’à la peinture."),
    ("chauffage-sanitaire", "/chauffage-sanitaire/", "Chauffage &amp; sanitaire", "/assets/img/svc-chauffage-sm.webp",
     "Installation ou remplacement de votre système de chauffage et de vos sanitaires : chaudières, pompes à chaleur, planchers chauffants, salle de bain clé en main…"),
    ("chaudronnerie", "/chaudronnerie-a-fourmies/", "Chaudronnerie", "/assets/img/steel-dream-sm.webp",
     "Nos ateliers de chaudronnerie conçoivent des structures métalliques sur mesure : escaliers, garde-corps, portails, carports, verrières…"),
]


def others_block(current):
    cards = []
    for slug, href, name, img, text in SERVICES:
        if slug == current:
            continue
        cards.append(
            f'      <li class="other">\n'
            f'        <a href="{href}">\n'
            f'          <span class="other__media"><img src="{img}" width="760" height="406" alt="" loading="lazy" decoding="async"></span>\n'
            f'          <span class="other__name">{name} <svg class="ico" aria-hidden="true"><use href="#i-arrow-up-right"/></svg></span>\n'
            f'          <span class="other__text">{text}</span>\n'
            f'        </a>\n'
            f'      </li>'
        )
    return (
        '<section class="others" aria-labelledby="others-title">\n'
        '  <div class="wrap">\n'
        '    <h2 class="section-title" id="others-title">Découvrez nos autres services</h2>\n'
        '    <ul class="others__list">\n' + "\n".join(cards) + '\n    </ul>\n'
        '  </div>\n'
        '</section>'
    )


def parse_page(raw):
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", raw, re.S)
    meta = json.loads(m.group(1))
    rest = raw[m.end():]
    slots = {"head": "", "jsonld": ""}
    for name in list(slots):
        sm = re.search(r"<!--slot:%s-->(.*?)<!--/slot-->" % name, rest, re.S)
        if sm:
            slots[name] = sm.group(1).strip()
            rest = rest[:sm.start()] + rest[sm.end():]
    return meta, slots, rest.strip("\n")


def render(template, ctx):
    for _ in range(6):                      # les parties peuvent elles-mêmes contenir des {{…}}
        new = re.sub(r"\{\{([a-z_:.\-]+)\}\}", lambda m: ctx.get(m.group(1), m.group(0)), template)
        if new == template:
            break
        template = new
    left = re.findall(r"\{\{[a-z_:.\-]+\}\}", template)
    if left:
        raise SystemExit(f"Variables non résolues : {sorted(set(left))}")
    return template


def mark_current(html, nav, svc):
    if nav:
        # pilule de navigation (lien ou bouton « Nos services »)
        html = html.replace(f'class="pill pill--nav" data-nav="{nav}"', f'class="pill pill--nav is-current" data-nav="{nav}"')
        html = re.sub(r'(<a [^>]*data-nav="%s"[^>]*?)>' % re.escape(nav), r'\1 aria-current="page">', html)
    if svc:
        html = re.sub(r'(<a [^>]*data-svc="%s"[^>]*?)>' % re.escape(svc), r'\1 aria-current="page">', html)
        # présélection du type de projet dans le bloc contact
        html = html.replace(f'aria-pressed="false" data-value="{svc}"', f'aria-pressed="true" data-value="{svc}"')
        html = html.replace('id="contact-cta" href="/contact/"', f'id="contact-cta" href="/contact/?projet={svc}"')
    return html


def main():
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    partials = {p.stem: p.read_text(encoding="utf-8").strip() for p in (SRC / "partials").glob("*.html")}
    fragments = {"include:" + p.name: p.read_text(encoding="utf-8").strip() for p in (SRC / "pages").glob("_*.html")}

    for page in sorted((SRC / "pages").glob("*.html")):
        if page.name.startswith("_"):
            continue
        meta, slots, content = parse_page(page.read_text(encoding="utf-8"))
        ctx = dict(partials)
        ctx.update(fragments)
        ctx.update({k: str(v) for k, v in meta.items()})
        ctx.update(slots)
        ctx["content"] = content
        ctx["others"] = others_block(meta.get("svc", ""))
        ctx.setdefault("og_image", "/assets/img/boue-apres.webp")
        html = render(layout, ctx)
        html = mark_current(html, meta.get("nav", ""), meta.get("svc", ""))

        path = meta["path"].strip("/")
        target = OUT / path / "index.html" if path else OUT / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8")
        print(f"{meta['path']:32s} -> {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
