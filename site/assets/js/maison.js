/* Maison clé en main : maquette 3D construite puis visitée au défilement.
   La maison (plain-pied de 137 m²) est modélisée à partir d'un plan illustratif :
   agencement et mobilier fictifs, surfaces des pièces réelles (lues dans la page).
   Un seul état « S » est interpolé par une timeline GSAP pilotée par ScrollTrigger ;
   la scène n'est redessinée que lorsque cet état change. */
import * as THREE from '/assets/vendor/three.module.min.js';

const root = document.documentElement;
const section = document.querySelector('.visit');

if (section && root.classList.contains('has-visit')) {
  if (window.gsap && window.ScrollTrigger) init();
  else root.classList.remove('has-visit');
}

function init() {
  const stage = section.querySelector('.visit__stage');
  const canvas = section.querySelector('.visit__canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    root.classList.remove('has-visit');
    return;
  }
  window.__visitReady = true;
  gsap.registerPlugin(ScrollTrigger);

  const isSmall = () => window.innerWidth < 900;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeeefec, 70, 160);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220);

  /* ------------------------------------------------------------------ lumière */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bd, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6ec, 2.9);
  sun.position.set(13, 15, -10);
  sun.castShadow = true;
  const shadowSize = isSmall() ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 15, bottom: -15, near: 2, far: 60 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
  fill.position.set(-14, 9, -6);
  scene.add(fill);

  /* ------------------------------------------------------------------ matières */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.6); // garde y <= hauteur de coupe
  const clipped = { clippingPlanes: [clip], clipShadows: true };
  const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.92, metalness: 0 }, extra || {}));
  const M = {
    wall: mat('#f7f7f4', clipped),
    cap: new THREE.MeshBasicMaterial({ color: '#2b302c' }), // poché de la coupe architecturale
    slab: mat('#dcd8d0'),
    plate: mat('#e9eae6'),
    wood: mat('#c2a07a', Object.assign({ transparent: true }, clipped)),
    glass: new THREE.MeshStandardMaterial({ color: '#9ec2d6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false, clippingPlanes: [clip] }),
    roof: mat('#f4f4f1', { transparent: true }),
    furn: mat('#e4e1da', Object.assign({ transparent: true }, clipped)),
    furnWood: mat('#c9ab88', Object.assign({ transparent: true }, clipped)),
    furnDark: mat('#6a706b', Object.assign({ transparent: true }, clipped)),
    tree: mat('#f2f1ec'),
    trunk: mat('#9d9384'),
    deck: mat('#cdac84'),
    path: mat('#d6d3cb')
  };
  const furnMats = [M.furn, M.furnWood, M.furnDark];

  /* ------------------------------------------------------------------ outils */
  const OX = 8.6, OZ = 4.1, H = 2.6; // plan de 17,2 × 8,2 m, centré sur l'origine
  const wx = (px) => px - OX;
  const wz = (pz) => pz - OZ;
  function box(w, h, d, material, x, y, z, parent, opts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = !(opts && opts.noCast);
    m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }
  // boîte en coordonnées de plan : x0, z0 → x1, z1 ; hauteur y0 → y1
  const pBox = (x0, z0, x1, z1, y0, y1, material, parent, opts) =>
    box(x1 - x0, y1 - y0, z1 - z0, material, wx((x0 + x1) / 2), (y0 + y1) / 2, wz((z0 + z1) / 2), parent, opts);
  function cyl(r, y0, y1, material, px, pz, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 24), material);
    m.position.set(wx(px), (y0 + y1) / 2, wz(pz));
    m.castShadow = true;
    m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
  }

  /* ------------------------------------------------------------------ socle, dalle, abords */
  box(38, 0.5, 27, M.plate, 0, -0.55, 1.4, scene, { noCast: true });
  pBox(-0.2, -0.2, 17.4, 8.4, -0.3, 0, M.slab);
  pBox(0.3, 8.32, 6.6, 10.6, -0.3, -0.06, M.deck);              // terrasse bois côté jardin
  pBox(8.25, -3.6, 9.25, -0.14, -0.3, -0.26, M.path, scene, { noCast: true }); // allée d'entrée
  [[-13.6, 2.4, 1.0], [-12.4, 8.4, 1.25], [14.2, 1.6, 0.95], [12.6, 8.6, 1.15], [-4.2, 11.4, 0.9], [3.8, 12.0, 1.2], [9.2, 11.2, 0.85], [-15.4, -4.0, 0.8]]
    .forEach(([x, z, r]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 10), M.trunk);
      trunk.position.set(x, -0.3 + 1.0, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), M.tree);
      crown.scale.set(1, 1.18, 1);
      crown.position.set(x, -0.3 + 1.7 + r * 1.05, z);
      crown.castShadow = true;
      crown.receiveShadow = true;
      scene.add(crown);
    });

  /* ------------------------------------------------------------------ pièces (sols) */
  const ROOMS = {
    entree: [[6.9, 0, 10.6, 3.7]],
    sejour: [[0, 2.45, 6.9, 8.2]],
    cuisine: [[0, 0, 6.9, 2.45]],
    circulation: [[6.9, 3.7, 16.2, 4.8], [16.2, 3.7, 17.2, 4.8]],
    buanderie: [[6.9, 4.8, 9.4, 8.2]],
    chambre3: [[9.4, 4.8, 12.4, 8.2]],
    sdb: [[12.4, 4.8, 15.2, 8.2]],
    dressing: [[15.2, 4.8, 17.2, 8.2]],
    chambre1: [[13.85, 0, 17.2, 3.7]],
    chambre2: [[10.6, 0, 13.85, 3.7]]
  };
  const C_BASE = new THREE.Color('#ebe8e2');
  const C_ACTIVE = new THREE.Color('#b9dd98');
  const C_LIT = new THREE.Color('#d6ebc4');
  const floorMats = {};
  Object.keys(ROOMS).forEach((key) => {
    const m = mat(C_BASE.clone().getStyle());
    m.color.copy(C_BASE);
    floorMats[key] = m;
    ROOMS[key].forEach(([x0, z0, x1, z1]) => pBox(x0 + 0.01, z0 + 0.01, x1 - 0.01, z1 - 0.01, 0, 0.04, m, scene, { noCast: true }));
  });

  /* ------------------------------------------------------------------ murs */
  // ouverture : [début, fin, type], distances depuis l'origine du mur
  const OPEN = {
    door: [0, 2.1, null],
    front: [0, 2.2, 'door'],
    window: [0.9, 2.15, 'glass'],
    bay: [0.02, 2.3, 'glass'],
    high: [1.45, 2.15, 'glass']
  };
  const walls = new THREE.Group();
  scene.add(walls);
  const pieces = [];
  let doorPivot = null;

  function wall(x1, z1, x2, z2, t, openings) {
    const horiz = z1 === z2;
    const L = horiz ? x2 - x1 : z2 - z1;
    const along = (a, b, y0, y1, material, depth, isPiece) => {
      if (b - a <= 0.001 || y1 - y0 <= 0.001) return null;
      const mid = (a + b) / 2;
      const cx = horiz ? x1 + mid : x1;
      const cz = horiz ? z1 : z1 + mid;
      const w = horiz ? b - a : depth;
      const d = horiz ? depth : b - a;
      const mesh = box(w, y1 - y0, d, material, wx(cx), (y0 + y1) / 2, wz(cz), walls, { noCast: material === M.glass });
      if (isPiece) {
        const cap = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.cap);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(wx(cx), y1, wz(cz));
        cap.visible = false;
        walls.add(cap);
        pieces.push({ cap, y0, y1 });
      }
      return mesh;
    };
    let cursor = 0;
    (openings || []).slice().sort((p, q) => p[0] - q[0]).forEach(([a, b, type]) => {
      const [sill, head, filling] = OPEN[type];
      along(cursor, a, 0, H, M.wall, t, true);
      along(a, b, 0, sill, M.wall, t, true);
      along(a, b, head, H, M.wall, t, true);
      if (filling === 'glass') along(a, b, sill, head, M.glass, 0.03, false);
      if (filling === 'door') {
        // porte d'entrée en bois, articulée sur son montant
        doorPivot = new THREE.Group();
        doorPivot.position.set(wx(x1 + a), 0, wz(z1));
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(b - a, head, 0.06), M.wood);
        leaf.position.set((b - a) / 2, head / 2, 0);
        leaf.castShadow = true;
        doorPivot.add(leaf);
        walls.add(doorPivot);
      }
      cursor = b;
    });
    along(cursor, L, 0, H, M.wall, t, true);
  }

  // façades (0,24 m) : sud = rue et entrée, nord = jardin avec larges baies
  wall(0, 0, 17.2, 0, 0.24, [[1.0, 3.2, 'window'], [8.2, 9.3, 'front'], [11.3, 13.1, 'window'], [14.6, 16.5, 'window']]);
  wall(0, 8.2, 17.2, 8.2, 0.24, [[0.6, 6.3, 'bay'], [7.5, 8.8, 'window'], [10.0, 11.8, 'bay'], [13.2, 14.4, 'high']]);
  wall(0, -0.12, 0, 8.32, 0.24, [[0.62, 2.02, 'window'], [4.32, 7.52, 'bay']]);
  wall(17.2, -0.12, 17.2, 8.32, 0.24, [[1.12, 2.72, 'window']]);
  // cloisons (0,10 m)
  wall(6.9, 0, 6.9, 8.2, 0.1, [[2.7, 4.8, 'door']]);
  wall(10.6, 3.7, 17.2, 3.7, 0.1, [[0.4, 1.3, 'door'], [3.6, 4.5, 'door']]);
  wall(10.6, 0, 10.6, 3.7, 0.1);
  wall(13.85, 0, 13.85, 3.7, 0.1);
  wall(6.9, 4.8, 17.2, 4.8, 0.1, [[0.7, 1.6, 'door'], [3.1, 4.0, 'door'], [6.0, 6.8, 'door'], [8.45, 9.15, 'door']]);
  wall(9.4, 4.8, 9.4, 8.2, 0.1);
  wall(12.4, 4.8, 12.4, 8.2, 0.1);
  wall(15.2, 4.8, 15.2, 8.2, 0.1);
  wall(16.2, 3.7, 16.2, 4.8, 0.1, [[0.15, 0.95, 'door']]);

  // bardage bois vertical autour de l'entrée (façade enduite avec bardage bois)
  const slatXs = [];
  for (let x = 6.95; x <= 10.56; x += 0.11) if (x < 8.15 || x > 9.35) slatXs.push(x);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, H, 0.05), M.wood, slatXs.length);
  const tmp = new THREE.Object3D();
  slatXs.forEach((x, i) => {
    tmp.position.set(wx(x), H / 2, wz(0) - 0.155);
    tmp.updateMatrix();
    slats.setMatrixAt(i, tmp.matrix);
  });
  slats.castShadow = true;
  scene.add(slats);

  /* ------------------------------------------------------------------ toit terrasse */
  const roof = new THREE.Group();
  box(17.75, 0.26, 8.75, M.roof, 0, H + 0.13, 0, roof);
  [[0, -4.3, 17.75, 0.12], [0, 4.3, 17.75, 0.12], [-8.82, 0, 0.12, 8.75], [8.82, 0, 0.12, 8.75]]
    .forEach(([x, z, w, d]) => box(w, 0.24, d, M.roof, x, H + 0.38, z, roof));
  scene.add(roof);

  /* ------------------------------------------------------------------ mobilier (fictif) */
  const furn = new THREE.Group();
  scene.add(furn);
  const F = M.furn, FW = M.furnWood, FD = M.furnDark;
  const fb = (x0, z0, x1, z1, y0, y1, m) => pBox(x0, z0, x1, z1, y0, y1, m, furn);
  // séjour
  fb(1.5, 4.5, 5.0, 7.0, 0.04, 0.055, F);
  fb(1.6, 3.55, 4.6, 4.45, 0.04, 0.44, F);
  fb(1.6, 3.35, 4.6, 3.6, 0.04, 0.84, F);
  fb(1.6, 4.45, 2.5, 5.55, 0.04, 0.44, F);
  fb(2.7, 5.35, 3.9, 6.05, 0.04, 0.38, FW);
  fb(4.3, 6.6, 5.1, 7.4, 0.04, 0.44, F);
  fb(4.9, 2.95, 6.5, 3.95, 0.72, 0.77, FW);
  fb(5.6, 3.35, 5.8, 3.55, 0.04, 0.72, FD);
  [5.15, 5.7, 6.25].forEach((x) => { fb(x - 0.2, 2.5, x + 0.2, 2.88, 0.04, 0.46, F); fb(x - 0.2, 4.02, x + 0.2, 4.4, 0.04, 0.46, F); });
  cyl(0.28, 0.04, 0.98, FD, 0.95, 3.25, furn);
  cyl(0.07, 0.98, H, FD, 0.95, 3.25, furn);
  cyl(0.22, 0.04, 0.5, FW, 6.45, 7.7, furn);
  // cuisine ouverte
  fb(0.35, 0.14, 4.6, 0.76, 0.04, 0.9, F);
  fb(0.35, 0.12, 4.6, 0.78, 0.9, 0.95, FW);
  fb(4.7, 0.14, 6.1, 0.76, 0.04, 2.2, FD);
  fb(1.4, 1.35, 4.2, 2.15, 0.04, 0.9, F);
  fb(1.35, 1.3, 4.25, 2.2, 0.9, 0.95, FW);
  // entrée
  fb(10.12, 1.2, 10.5, 2.6, 0.04, 0.82, FW);
  fb(7.05, 0.5, 7.45, 1.8, 0.04, 0.45, F);
  fb(7.9, 0.45, 9.6, 2.7, 0.04, 0.052, F);
  cyl(0.2, 0.04, 0.55, FW, 10.25, 3.3, furn);
  // circulation et WC
  fb(10.8, 4.05, 15.6, 4.45, 0.04, 0.05, F);
  fb(16.72, 3.85, 17.08, 4.22, 0.04, 0.42, F);
  fb(16.95, 3.82, 17.1, 4.32, 0.04, 0.85, F);
  // buanderie
  fb(7.05, 7.4, 7.7, 8.05, 0.04, 0.86, F);
  fb(7.75, 7.4, 8.4, 8.05, 0.04, 0.86, F);
  fb(7.0, 5.3, 7.6, 7.2, 0.04, 0.9, FW);
  fb(8.7, 5.0, 9.3, 5.9, 0.04, 2.0, F);
  // chambre 3
  fb(10.3, 5.6, 12.25, 7.2, 0.04, 0.5, F);
  fb(12.18, 5.5, 12.33, 7.3, 0.04, 1.0, FW);
  fb(11.85, 5.0, 12.3, 5.42, 0.04, 0.5, FW);
  fb(11.85, 7.38, 12.3, 7.8, 0.04, 0.5, FW);
  // salle de bain
  fb(12.6, 7.25, 14.4, 8.0, 0.04, 0.58, F);
  fb(14.62, 5.4, 15.1, 6.8, 0.04, 0.86, FW);
  fb(12.55, 5.0, 12.6, 6.3, 0.04, 2.0, M.glass);
  // dressing
  fb(16.55, 5.0, 17.05, 8.0, 0.04, 2.1, FW);
  fb(15.4, 7.6, 16.5, 8.05, 0.04, 2.1, FW);
  cyl(0.28, 0.04, 0.45, F, 16.0, 6.4, furn);
  // chambre 1
  fb(14.05, 1.0, 16.05, 2.8, 0.04, 0.5, F);
  fb(13.95, 0.95, 14.1, 2.85, 0.04, 1.0, FW);
  fb(13.95, 0.45, 14.4, 0.88, 0.04, 0.5, FW);
  fb(13.95, 2.92, 14.4, 3.35, 0.04, 0.5, FW);
  fb(15.4, 3.05, 17.05, 3.6, 0.04, 2.1, FW);
  // chambre 2
  fb(11.75, 1.0, 13.7, 2.6, 0.04, 0.5, F);
  fb(13.6, 0.95, 13.75, 2.65, 0.04, 1.0, FW);
  fb(10.75, 0.15, 11.95, 0.75, 0.04, 0.75, FW);
  fb(11.15, 0.85, 11.55, 1.25, 0.04, 0.46, F);
  furn.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* ------------------------------------------------------------------ plan dessiné (étape conception) */
  const VISIT_ORDER = ['entree', 'sejour', 'cuisine', 'circulation', 'buanderie', 'chambre3', 'sdb', 'dressing', 'chambre1', 'chambre2'];
  const planPts = [];
  [[-0.12, -0.12, 17.32, 8.32]].concat(...VISIT_ORDER.map((k) => ROOMS[k])).forEach(([x0, z0, x1, z1]) => {
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
    for (let i = 0; i < 4; i++) planPts.push(wx(c[i][0]), 0.07, wz(c[i][1]), wx(c[i + 1][0]), 0.07, wz(c[i + 1][1]));
  });
  const planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planPts, 3));
  const planMat = new THREE.LineBasicMaterial({ color: '#3b7417', transparent: true, opacity: 0 });
  const planLines = new THREE.LineSegments(planGeo, planMat);
  planLines.visible = false;
  scene.add(planLines);
  const planCount = planPts.length / 3;

  /* ------------------------------------------------------------------ étapes (lues dans la page) */
  const stopEls = Array.prototype.slice.call(section.querySelectorAll('.stop'));
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');
  const roomCenter = (key) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    ROOMS[key].forEach((r) => { x0 = Math.min(x0, r[0]); z0 = Math.min(z0, r[1]); x1 = Math.max(x1, r[2]); z1 = Math.max(z1, r[3]); });
    return { x: wx((x0 + x1) / 2), z: wz((z0 + z1) / 2), s: Math.max(x1 - x0, z1 - z0) };
  };
  const BASE = { clipH: H, roofY: 0, roofO: 1, finish: 1, plan: 0, labels: 0, door: 0, allLit: 0 };
  const VISIT = { clipH: 1.1, roofY: 8, roofO: 0, finish: 1, plan: 0, labels: 0, door: 1, allLit: 0 };
  const view = (cam, tgt, fov) => ({ camX: cam[0], camY: cam[1], camZ: cam[2], tgtX: tgt[0], tgtY: tgt[1], tgtZ: tgt[2], fov });
  const STATES = {
    hero: Object.assign({}, BASE, view([-24.5, 12.5, -26.5], [0.6, 0.3, 0.8], 30)),
    conception: Object.assign({}, BASE, view([0, 39, -3.2], [0, 0, 0.4], 30), { clipH: 0, roofY: 7, roofO: 0, finish: 0, plan: 1, labels: 1 }),
    construction: Object.assign({}, BASE, view([19, 13, -21.5], [0, 0.6, 0.4], 32), { finish: 0 }),
    finitions: Object.assign({}, BASE, view([-12.5, 4.6, -15.5], [-0.6, 1.1, -2.4], 34)),
    cles: Object.assign({}, BASE, view([3.4, 2.2, -13.6], [0.4, 1.2, -4.1], 36), { door: 1 }),
    final: Object.assign({}, VISIT, view([0.6, 27, 19.5], [0, 0, 0.8], 32), { allLit: 1 })
  };
  let roomIndex = 0;
  const stops = stopEls.map((el) => {
    const type = el.dataset.stop;
    const info = { el, type, room: el.dataset.room || null, area: parseFloat(el.dataset.area || '0'), photo: !!el.dataset.photo };
    if (type === 'room') {
      const c = roomCenter(info.room);
      const side = roomIndex++ % 2 ? 1 : -1;
      const d = Math.min(c.s, 7);
      info.state = Object.assign({}, VISIT, view([c.x + side * (1.4 + d * 0.35), 6.2 + d * 1.15, c.z - (5.2 + d * 1.05)], [c.x, 0.2, c.z + 0.3], 36));
    } else {
      info.state = STATES[type];
    }
    info.title = (el.querySelector('.stop__title') || {}).textContent || '';
    return info;
  });
  // surface cumulée à chaque étape
  let cumul = 0;
  stops.forEach((s) => { if (s.type === 'room') cumul += s.area; s.cumul = s.type === 'final' ? 137 : cumul; });

  /* ------------------------------------------------------------------ étiquettes des pièces (vue en plan) */
  const labelsBox = section.querySelector('.visit__labels');
  const labels = stops.filter((s) => s.type === 'room').map((s) => {
    const span = document.createElement('span');
    span.innerHTML = '<b></b><em></em>';
    span.firstChild.textContent = s.title;
    span.lastChild.textContent = fmt(s.area, 2) + ' m²';
    labelsBox.appendChild(span);
    const c = roomCenter(s.room);
    return { span, pos: new THREE.Vector3(c.x, 0.1, c.z) };
  });

  /* ------------------------------------------------------------------ état interpolé */
  const S = Object.assign({}, stops[0].state);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onUpdate: () => { needsRender = true; syncStop(); } });
  const HOLD = 0.7;
  tl.addLabel('s0', 0).to({}, { duration: HOLD });
  for (let i = 1; i < stops.length; i++) {
    tl.to(S, Object.assign({ duration: 1 }, stops[i].state));
    tl.addLabel('s' + i);
    tl.to({}, { duration: i === stops.length - 1 ? 0.25 : HOLD });
  }
  const labelTimes = stops.map((_, i) => tl.labels['s' + i]);

  /* ------------------------------------------------------------------ rendu */
  const vTgt = new THREE.Vector3();
  const vCam = new THREE.Vector3();
  const vTmp = new THREE.Vector3();
  let width = 1, height = 1, distScale = 1, needsRender = true, lastFov = 0;

  function resize() {
    width = stage.clientWidth || window.innerWidth;
    height = stage.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const a = camera.aspect;
    distScale = a < 1 ? Math.min(2.5, 1.18 / a) : a < 1.45 ? 1.12 : 1;
    // le sujet est décalé pour laisser la place au texte (à gauche sur grand écran, en bas sur mobile)
    if (width < 900) camera.setViewOffset(width, height, 0, height * 0.15, width, height);
    else camera.setViewOffset(width, height, -width * 0.15, 0, width, height);
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  function applyState(time, heroWeight) {
    vTgt.set(S.tgtX, S.tgtY, S.tgtZ);
    vCam.set(S.camX, S.camY, S.camZ).sub(vTgt).multiplyScalar(distScale);
    if (heroWeight > 0.001) vCam.applyAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(time * 0.00018) * 0.16 * heroWeight);
    camera.position.copy(vTgt).add(vCam);
    camera.lookAt(vTgt);
    if (Math.abs(S.fov - lastFov) > 0.001) { camera.fov = S.fov; camera.updateProjectionMatrix(); lastFov = S.fov; }

    clip.constant = S.clipH + 0.001;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const cut = S.clipH > p.y0 + 0.005 && S.clipH < p.y1 - 0.005;
      p.cap.visible = cut;
      if (cut) p.cap.position.y = S.clipH;
    }
    roof.position.y = S.roofY;
    roof.visible = S.roofO > 0.01;
    M.roof.opacity = S.roofO;
    M.roof.transparent = S.roofO < 0.999;
    M.wood.opacity = S.finish;
    M.wood.transparent = S.finish < 0.999;
    M.glass.opacity = 0.35 * S.finish;
    slats.visible = S.finish > 0.01;
    furn.visible = S.finish > 0.01;
    furnMats.forEach((m) => { m.opacity = S.finish; m.transparent = S.finish < 0.999; });
    if (doorPivot) { doorPivot.rotation.y = -S.door * 1.35; doorPivot.visible = S.finish > 0.01; }
    planLines.visible = S.plan > 0.01;
    planMat.opacity = Math.min(1, S.plan * 1.4);
    planGeo.setDrawRange(0, Math.floor(planCount * S.plan / 2) * 2);

    labelsBox.style.opacity = S.labels;
    if (S.labels > 0.01) {
      labels.forEach((l) => {
        vTmp.copy(l.pos).project(camera);
        l.span.style.transform = 'translate(' + ((vTmp.x + 1) / 2 * width).toFixed(1) + 'px,' + ((1 - vTmp.y) / 2 * height).toFixed(1) + 'px) translate(-50%, -50%)';
      });
    }
  }

  let inView = true;
  let rafOn = false;
  function frame(time) {
    if (!inView || document.hidden) { rafOn = false; return; }
    const heroWeight = 1 - Math.min(1, tl.time() / 0.6);
    if (needsRender || heroWeight > 0.001) {
      applyState(time, heroWeight);
      renderer.render(scene, camera);
      needsRender = false;
    }
    requestAnimationFrame(frame);
  }
  function wake() { if (!rafOn && inView && !document.hidden) { rafOn = true; requestAnimationFrame(frame); } }
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; wake(); }).observe(stage);
  document.addEventListener('visibilitychange', wake);

  /* ------------------------------------------------------------------ interface (texte, compteur, rail) */
  const meterValue = section.querySelector('#visit-meter');
  const meterBar = section.querySelector('#visit-meter-bar');
  const meter = { v: 0 };
  const rail = section.querySelector('.visit__rail');
  const ticks = [];
  stops.forEach((s, i) => {
    if (i === 0) return;
    const group = rail.querySelector(s.type === 'room' || s.type === 'final' ? '[data-group="visiter"] .visit__rail-ticks' : '[data-group="construire"] .visit__rail-ticks');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'visit__tick';
    b.setAttribute('aria-label', 'Aller à : ' + s.title.replace(/\s+/g, ' ').trim());
    b.innerHTML = '<span></span>';
    b.firstChild.textContent = s.title.replace(/\s+/g, ' ').trim();
    b.addEventListener('click', () => goTo(i));
    group.appendChild(b);
    ticks[i] = b;
  });

  let current = -1;
  function lightRooms(activeKey, all) {
    Object.keys(floorMats).forEach((key) => {
      const target = all ? C_LIT : key === activeKey ? C_ACTIVE : C_BASE;
      gsap.to(floorMats[key].color, { r: target.r, g: target.g, b: target.b, duration: 0.7, ease: 'power2.out', overwrite: true, onUpdate: () => { needsRender = true; } });
    });
  }
  function setStop(i) {
    if (i === current) return;
    current = i;
    const s = stops[i];
    stopEls.forEach((el, k) => { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
    section.classList.toggle('is-visiting', s.type === 'room' || s.type === 'final');
    section.classList.toggle('is-hero', s.type === 'hero');
    section.classList.toggle('has-photo', s.photo);
    ticks.forEach((t, k) => { if (!t) return; t.classList.toggle('is-active', k === i); t.classList.toggle('is-done', k < i); });
    rail.querySelector('[data-group="construire"]').classList.toggle('is-current', i >= 1 && i <= 4);
    rail.querySelector('[data-group="visiter"]').classList.toggle('is-current', i > 4);
    lightRooms(s.room, s.type === 'final');
    gsap.to(meter, { v: s.cumul, duration: 0.9, ease: 'power2.out', overwrite: true, onUpdate: () => { meterValue.textContent = Math.round(meter.v); } });
    meterBar.style.transform = 'scaleX(' + (s.cumul / 137).toFixed(3) + ')';
    const num = s.el.querySelector('.stop__num');
    if (num) {
      const n = { v: 0 };
      gsap.to(n, { v: s.area, duration: 0.9, ease: 'power2.out', onUpdate: () => { num.textContent = fmt(n.v, 2); } });
    }
  }
  function syncStop() {
    const t = tl.time();
    let idx = 0;
    for (let i = 0; i < labelTimes.length; i++) if (t >= labelTimes[i] - 0.55) idx = i;
    setStop(idx);
  }

  /* ------------------------------------------------------------------ défilement */
  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * (stops.length - 1) * 0.8),
    pin: true,
    scrub: 0.7,
    animation: tl,
    invalidateOnRefresh: true,
    snap: { snapTo: 'labelsDirectional', duration: { min: 0.25, max: 0.8 }, delay: 0.08, ease: 'power1.inOut' }
  });
  function goTo(i) {
    const y = st.start + (labelTimes[i] / tl.duration()) * (st.end - st.start);
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------------ thème clair / sombre */
  function applyTheme() {
    const dark = root.dataset.theme === 'dark';
    const bg = new THREE.Color(getComputedStyle(root).getPropertyValue('--chaux').trim() || '#eeefec');
    scene.background = bg;
    scene.fog.color.copy(bg);
    M.plate.color.set(dark ? '#1d221f' : '#e9eae6');
    hemi.groundColor.set(dark ? '#2a2f2b' : '#d9d4ca');
    planMat.color.set(dark ? '#8bcb5e' : '#3b7417');
    needsRender = true;
    wake();
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  applyTheme();
  resize();
  window.addEventListener('resize', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2)); resize(); });
  setStop(0);
  wake();
}
