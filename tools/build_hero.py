"""Hero du site : ciel étendu + détourage du gîte de Boué (photo client).

Produit deux calques parfaitement superposables (même taille) :
  - hero-bg   : la photo d'origine, ciel prolongé vers le haut (place pour le mot « Lemaire »)
  - hero-cut  : la même photo, ciel rendu transparent (le bâtiment passe devant le mot)

Usage : python tools/build_hero.py <photo_source> <dossier_sortie> [<dossier_apercu>]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

EXTEND = 620          # lignes de ciel ajoutées au-dessus de la photo
EAVE_Y = 395          # sous cette ligne (coordonnées photo), détourage par couleur seule
GABLE_X = (380, 1260) # zone horizontale du pignon pour le balayage de silhouette


def skyness(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    a = np.clip((b - g - 8) / 18.0, 0, 1)
    c = np.clip((b - r - 20) / 30.0, 0, 1)
    return a * c


def gable_interval(rgb):
    """Bords gauche/droit du pignon, ligne par ligne, au-dessus de l'égout."""
    left = np.full(EAVE_Y, -1)
    right = np.full(EAVE_Y, -1)
    x0, x1 = GABLE_X
    for y in range(EAVE_Y):
        row = rgb[y, x0:x1]
        lum = row.mean(axis=1)
        blue = row[:, 2] - row[:, :2].max(axis=1)
        fg = np.where((blue < 40) & (lum < 200))[0]
        # le faîtage en zinc est clair : on l'accepte s'il touche une zone sombre
        if len(fg):
            left[y], right[y] = x0 + fg.min(), x0 + fg.max()
    return left, right


def build_alpha(rgb):
    """Transparent = ciel (et nuages) relié au bord haut de la photo.

    Les vitrages et pots bleus ne sont pas reliés au ciel : ils restent opaques.
    """
    from PIL import ImageDraw

    sky = skyness(rgb)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = rgb.mean(axis=2)
    cloud = (lum > 185) & (b - r > 25)
    # cœur blanc des nuages, loin du pignon (le faîtage en zinc est clair lui aussi)
    xs = np.arange(rgb.shape[1])[None, :]
    far = (xs < GABLE_X[0]) | (xs > GABLE_X[1])
    ys = np.arange(rgb.shape[0])[:, None]
    cloud |= (lum > 225) & far & (ys < EAVE_Y)
    sky_like = (sky > 0.35) | cloud

    region = Image.fromarray(np.where(sky_like, 255, 0).astype(np.uint8), "L").copy()
    for x in range(0, region.width, 40):           # graines sur toute la première ligne
        if region.getpixel((x, 0)) == 255:
            ImageDraw.floodfill(region, (x, 0), 128)
    connected = np.asarray(region) == 128
    # 1 px de marge pour récupérer les pixels de bord anticrénelés
    grown = np.asarray(Image.fromarray(connected.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0

    alpha = np.ones(sky.shape)
    alpha[grown] = 1.0 - sky[grown]
    alpha[connected & cloud] = 0.0
    alpha[connected & (sky > 0.85)] = 0.0
    a = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.5))
    return a


def extend_sky(rgb):
    h, w, _ = rgb.shape
    sky = skyness(rgb) > 0.95
    # couleur médiane du ciel par ligne (200 premières lignes)
    rows = []
    for y in range(0, 200):
        m = sky[y]
        if m.sum() > 200:
            rows.append((y, np.median(rgb[y, m], axis=0)))
    ys = np.array([r[0] for r in rows], dtype=float)
    cols = np.array([r[1] for r in rows], dtype=float)
    slope = np.polyfit(ys, cols, 1)[0]            # variation par ligne (vers le bas)
    top = np.median(rgb[0:6][sky[0:6]], axis=0)   # couleur au raccord
    zenith = np.array([34.0, 104.0, 196.0])       # bleu profond visé en haut

    ext = np.zeros((EXTEND, w, 3), dtype=float)
    d = np.arange(EXTEND, 0, -1, dtype=float)[:, None]   # distance au raccord
    lin = top[None, :] - slope[None, :] * d              # prolongement linéaire
    t = 1 - np.exp(-d / 420.0)                            # convergence douce vers le zénith
    base = lin * (1 - t) + (lin * 0.35 + zenith * 0.65) * t
    ext[:] = base[:, None, :]

    # variation horizontale du raccord, qui s'estompe vers le haut
    row0 = np.asarray(Image.fromarray(rgb[0:4].astype(np.uint8)).filter(ImageFilter.GaussianBlur(40)), dtype=float).mean(axis=0)
    offset = row0 - row0.mean(axis=0, keepdims=True)
    fade = np.exp(-d / 260.0)[:, :, None]
    ext += offset[None, :, :] * fade

    rng = np.random.default_rng(7)
    ext += rng.normal(0, 1.3, ext.shape)
    out = np.concatenate([np.clip(ext, 0, 255), rgb], axis=0)

    # fondu sur 24 lignes au raccord (zone de ciel pur, le faîtage commence ligne 35)
    seam = out[EXTEND - 1].copy()
    for i in range(24):
        k = (i + 1) / 25.0
        y = EXTEND + i
        out[y] = out[y] * k + seam * (1 - k)
    return out.astype(np.uint8)


def main():
    src, outdir = Path(sys.argv[1]), Path(sys.argv[2])
    preview = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    outdir.mkdir(parents=True, exist_ok=True)

    rgb = np.asarray(Image.open(src).convert("RGB")).astype(float)
    alpha = build_alpha(rgb)

    bg = Image.fromarray(extend_sky(rgb), "RGB")
    cut = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    photo = Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")
    photo.putalpha(alpha)
    cut.paste(photo, (0, EXTEND))

    for suffix, width in (("", 1920), ("-m", 1080)):
        h = round(bg.height * width / bg.width)
        bg.resize((width, h), Image.LANCZOS).save(outdir / f"hero-bg{suffix}.webp", quality=82, method=6)
        cut.resize((width, h), Image.LANCZOS).save(outdir / f"hero-cut{suffix}.webp", quality=88, method=6)
    print("hero:", bg.size)

    if preview:
        preview.mkdir(parents=True, exist_ok=True)
        check = Image.new("RGBA", cut.size, (255, 0, 255, 255))
        check.alpha_composite(cut)
        check.convert("RGB").resize((960, round(cut.height / 2))).save(preview / "cutout-check.jpg", quality=88)
        bg.convert("RGB").resize((960, round(bg.height / 2))).save(preview / "bg-check.jpg", quality=88)


if __name__ == "__main__":
    main()
