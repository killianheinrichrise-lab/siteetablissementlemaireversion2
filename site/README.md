# Établissements Lemaire : maquette du nouveau site

Maquette de présentation : la page d'accueil et les 4 pages « Nos services ». Les autres pages seront réalisées après signature. Leurs liens affichent un message « Aperçu » au lieu d'une page vide.

| Page | Adresse (identique au site actuel) |
|---|---|
| Accueil | `/` |
| Gros œuvre | `/gros-oeuvre/` |
| Second œuvre | `/second-oeuvre/` |
| Chauffage & sanitaire | `/chauffage-sanitaire/` |
| Chaudronnerie | `/chaudronnerie-a-fourmies/` |

## Lancer la maquette

Depuis le dossier `E:\Site Lemaire` :

```bash
python -m http.server 5178 --directory site
```

Puis ouvrir http://localhost:5178. Tout est local (police, librairies, images) : la maquette fonctionne sans connexion pendant le rendez-vous.

## Modifier les pages

Les fichiers HTML de `site/` sont **générés**. On modifie `src/`, puis on relance :

```bash
python tools/build_pages.py
```

- `src/layout.html` : gabarit commun (balises head, scripts).
- `src/partials/` : en-tête, menu mobile, pied de page, accompagnement, engagements RSE, contact.
- `src/pages/` : une page par fichier, avec ses réglages (titre, description, adresse) en tête de fichier. `_home_body.html` contient le corps de l'accueil.
- Le bloc « Découvrez nos autres services » est généré automatiquement selon la page.

## Contenus

- Les textes des pages services reprennent ceux des pages actuelles du client : mêmes prestations, mêmes listes, mêmes promesses. Seules les fautes ont été corrigées et quelques phrases cassées remises d'aplomb.
- Les autres contenus viennent du site actuel, de la fiche Google et du registre des entreprises. Rien n'est inventé.
- Le slogan du haut de page actuel est conservé : « Construction et rénovation à Fourmies ».
- Le logo est celui du client. Le pied de page utilise sa version « groupe » (Ets Meyer, Steel Dream, Maison Eriam Elora, Recycl'Me).
- Toutes les images sont celles du site actuel ou de l'Instagram du client, aux mêmes emplacements que sur le site actuel quand c'était possible. Il n'y a aucune image générée.

## Régénérer les images

Pillow et NumPy sont nécessaires.

- `tools/build_images.py` : photos, logos, favicon.
- `tools/build_hero.py` : visuel du haut de l'accueil (ciel prolongé et gîte détouré).

## Points à valider avec le client

- **Prix de la maison clé en main :** « à partir de 165 000 € » n'est pas affiché. Il ne figure que dans la description Google du site actuel.
- **La Compagnie du Ramonage :** ajoutée dans le bloc « groupe » de l'accueil. Elle n'apparaît aujourd'hui que sur les réseaux sociaux.
- **Image de la page Chauffage :** c'est une photo de banque d'images présente sur le site actuel, en attendant une photo de chantier du client.
