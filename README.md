# siteetablissementlemaireversion2

Maquette du nouveau site des Établissements Lemaire (Fourmies). Site statique en HTML, CSS et JavaScript, sans étape de build côté Vercel.

- `site/` : le site publié (dossier de sortie Vercel). Ses fichiers HTML sont générés.
- `src/` : gabarit, parties communes et pages, à modifier ici.
- `tools/` : génération des pages (`build_pages.py`) et des images (`build_images.py`, `build_hero.py`).

```bash
python tools/build_pages.py
python -m http.server 5178 --directory site
```

La maquette est servie avec l'en-tête `X-Robots-Tag: noindex` (défini dans `vercel.json`). Cela évite qu'elle concurrence le site actuel du client dans les moteurs de recherche. Il faudra le retirer à la mise en ligne définitive.

Détails : [site/README.md](site/README.md).
