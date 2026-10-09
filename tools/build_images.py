"""Optimise les photos et logos du client pour le site (WebP, 2 largeurs).

Usage : python tools/build_images.py <dossier_sources> <dossier_sortie>
Seules des photos réelles issues du site / Instagram du client sont utilisées.
"""
import sys
from pathlib import Path

from PIL import Image

# nom de sortie : (fichier source, recadrage (gauche, haut, droite, bas) ou None, largeurs)
IMAGES = {
    "svc-gros-oeuvre": ("dalle-fondaiton-etslemaire-fourmies.webp", None, (1400, 760)),
    "svc-second-oeuvre": ("platreriepeinture-etslemaire-fourmies.webp", None, (1400, 760)),
    "svc-chauffage": ("poelebois-etslemaire-fourmies.webp", None, (1080, 700)),
    "svc-chaudronnerie": ("verriere-acier-etslemaire.webp", None, (1080, 700)),
    "boue-avant": ("renovation-gite-boue-etablissementslemaire.webp", None, (1080, 760)),
    "boue-apres": ("construction-etslemaire-fourmies.webp", None, (1800, 960)),
    "boue-spa": ("renovation-boue-spa-etslemaire.webp", None, (1080, 700)),
    "boue-salon": ("renovationbatisse-boue-etslemaire.webp", None, (1080, 700)),
    "appartements-fourmies": ("renovation-appartements-fourmies.webp", None, (1080, 700)),
    "ite-fourmies": ("isolationexterieure-fourmies-etslemaire.webp", None, (1600, 900)),
    "restaurant-avesnes": ("renovation-avesnessurhelpe-etslemaire.webp", None, (1080, 700)),
    "maison-containers": ("piscine-etslemaire-fourmies.webp", None, (1080, 700)),
    "maison-interieur": ("maison-1.jpg", None, (1400, 800)),
    "steel-dream": ("structuremetallique-etslemaire-steeldream.webp", None, (1080, 700)),
    "ramonage-camion": ("instagram/809645771_18101668157305677_3137471542988537232_nfull.webp", (0, 0, 640, 488), (640,)),
    # pages « Nos services » : visuels d'en-tête et de sections (images du site actuel)
    "hero-gros-oeuvre": ("construction-etslemaire-fourmies.webp", None, (1920, 1080)),
    "hero-second-oeuvre": ("platreriepeinture-etslemaire-fourmies.webp", None, (1920, 1080)),
    "hero-chauffage": ("man-installs-heating-system-house-checks-pipes-with-wrench.jpg", None, (1920, 1080)),
    "hero-chaudronnerie": ("structuremetallique-etslemaire-steeldream.webp", None, (1080, 720)),
    "go-dalles": ("dalle-fondaiton-etslemaire-fourmies.webp", None, (1200, 720)),
    "go-maconnerie": ("maconneriegenerale-fourmies-etslemaire.webp", None, (1200, 720)),
    "go-charpente": ("charpente-etslemaire-fourmies.webp", None, (1200, 720)),
    "go-couverture": ("couverture-etslemaire.webp", None, (1200, 720)),
    "go-menuiseries": ("menuiserieetportails-etsleamaire-fourmies.webp", None, (1200, 720)),
    "go-ite": ("isolationexterieure-etslemaire-fourmies.webp", None, (1200, 720)),
    "go-amenagements": ("amenagementexterieur-etslemaire-fourmies.webp", None, (1200, 720)),
    "so-electricite": ("travaux-electricite-etslemaire-fourmies.webp", None, (1200, 720)),
    "so-sols": ("revetementsol-etslemaire-fourmies.webp", None, (1200, 720)),
    "so-isolation": ("isolation-interieur-etslemaire-fourmies.webp", None, (1200, 720)),
    "so-platrerie": ("renovationbatisse-boue-etslemaire.webp", None, (1080, 720)),
}

# logos du client et des marques partenaires (page chauffage), fond conservé transparent
BRAND_FILES = {
    "logo-lemaire": ("logo-etslemaire.webp", None),
    "logo-lemaire-groupe": ("etablissementslemaire-logo-general-scaled.webp", 1200),
    "logo-meyer": ("logo-etsmeyer-fourmies.webp", None),
    "logo-steeldream": ("logo-steeldream-etslemaire.webp", None),
    "marque-wesman": ("wesman-logo.webp", None),
    "marque-westa": ("westa-logo.webp", None),
    "marque-wolff": ("wolff-logo.webp", None),
    "marque-ravelli": ("ravelli-logo.webp", None),
    "marque-okofen": ("okofen-logo.webp", None),
    "marque-dedietrich": ("dedetriech-logo.webp", None),
    "marque-atlantic": ("atlantic-logo.webp", None),
}


def build_brand_files(src, out):
    for name, (file, width) in BRAND_FILES.items():
        im = Image.open(src / file).convert("RGBA")
        if name == "marque-wolff":                    # seul logo livré sur fond blanc opaque
            im = white_to_alpha(im)
        if width and im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(out / f"{name}.webp", quality=92, method=6)
        print(f"{name:24s} {im.width}x{im.height}")

    # favicon : la maison du logo actuel (pictogramme vert à gauche du logotype)
    import numpy as np
    logo = Image.open(src / "etablissementslemaire-logo-general-scaled.webp").convert("RGBA")
    a = np.asarray(logo)
    left = a[:, : int(a.shape[1] * 0.27)]
    green = (left[..., 1] > 140) & (left[..., 0] < 150) & (left[..., 3] > 200)
    ys, xs = np.where(green)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    house = logo.crop(box)
    side = max(house.size) + 40
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(house, ((side - house.width) // 2, (side - house.height) // 2))
    for size in (180, 32):
        square.resize((size, size), Image.LANCZOS).save(out / f"favicon-{size}.png")
    print("favicon", box)


# logos découpés dans l'image « certifications » du site actuel (fond blanc rendu transparent)
LOGOS = {
    "logo-qualibat-rge": (50, 95, 248, 325),
    "logo-qualitenr": (326, 100, 752, 325),
    "logo-qualifelec": (842, 100, 1030, 328),
    "logo-qualigaz-rge": (65, 405, 560, 556),
    "logo-recyclme": (604, 408, 1050, 556),
}


def white_to_alpha(im):
    import numpy as np
    a = np.asarray(im.convert("RGB")).astype(float)
    whiteness = a.min(axis=2)                       # 255 = blanc pur
    alpha = np.clip((255 - whiteness) / 40.0, 0, 1) # fondu sur les 40 derniers niveaux
    rgba = np.dstack([a, alpha * 255]).astype("uint8")
    return Image.fromarray(rgba, "RGBA")


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    build_brand_files(src, out)
    cert = Image.open(src / "certifications-etslemaire-fourmies.webp")
    for name, box in LOGOS.items():
        logo = white_to_alpha(cert.crop(box))
        logo.save(out / f"{name}.webp", lossless=True, method=6)
        print(f"{name:24s} {logo.width}x{logo.height}")
    for name, (file, crop, widths) in IMAGES.items():
        im = Image.open(src / file).convert("RGB")
        if crop:
            im = im.crop(crop)
        for i, w in enumerate(widths):
            w = min(w, im.width)
            h = round(im.height * w / im.width)
            suffix = "" if i == 0 else "-sm"
            im.resize((w, h), Image.LANCZOS).save(out / f"{name}{suffix}.webp", quality=80, method=6)
        print(f"{name:24s} {im.width}x{im.height} -> {widths}")


if __name__ == "__main__":
    main()
