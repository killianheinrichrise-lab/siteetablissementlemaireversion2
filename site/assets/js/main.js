/* Établissements Lemaire — scripts communs à toutes les pages (maquette de présentation)
   Sans dépendance obligatoire : GSAP / ScrollTrigger / Lenis améliorent l'expérience
   s'ils sont chargés, les pages restent utilisables sans eux. Chaque module ne
   s'exécute que si ses éléments sont présents dans la page. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = hasGsap && !reduceMotion;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!motion) doc.classList.add('no-js-motion');

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };

  /* ---------------------------------------------------------------------
     Défilement doux (Lenis) synchronisé avec ScrollTrigger
     --------------------------------------------------------------------- */
  var lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;   // utilisé par les scripts propres à une page
  }

  function scrollToTarget(target) {
    var offset = target === document.body ? 0 : -96;
    if (lenis) { lenis.scrollTo(target, { offset: offset, duration: 1.4 }); return; }
    var y = target === document.body ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // arrivée sur une page avec une ancre (ex. /#realisations depuis une page service)
  if (location.hash.length > 1) {
    var initialTarget = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (initialTarget) window.addEventListener('load', function () { setTimeout(function () { scrollToTarget(initialTarget); }, 150); });
  }

  /* ---------------------------------------------------------------------
     Pages à venir : message au lieu d'un lien mort pendant la présentation
     --------------------------------------------------------------------- */
  var toast = $('#toast');
  var toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (link.hasAttribute('data-soon')) {
      e.preventDefault();
      closeMenu(false);
      showToast('Aperçu : cette page sera conçue dans la suite du projet.');
      return;
    }
    // lien vers la page en cours (ancre ou retour en haut) : défilement doux
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || link.target === '_blank') return;
    var target = url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : document.body;
    if (!target) return;
    e.preventDefault();
    closeMenu(false);
    scrollToTarget(target);
    if (url.hash) history.replaceState(null, '', url.hash);
  });

  /* ---------------------------------------------------------------------
     En-tête : flottant après le visuel d'en-tête, menu « Nos services », menu mobile
     --------------------------------------------------------------------- */
  var header = $('#site-header');
  var heroFrame = $('.hero-frame') || $('.page-hero__frame');
  var mobileBar = $('#mobile-bar');
  var heroVisible = !!heroFrame;
  var contactVisible = false;

  function updateBars() {
    header.classList.toggle('is-floating', !heroVisible);
    mobileBar.classList.toggle('is-visible', !heroVisible && !contactVisible);
  }
  if ('IntersectionObserver' in window) {
    if (heroFrame) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        updateBars();
      }, { rootMargin: '-96px 0px 0px 0px' }).observe(heroFrame);
    }
    var contactSection = $('#contact');
    if (contactSection) {
      new IntersectionObserver(function (entries) {
        contactVisible = entries[0].isIntersecting;
        updateBars();
      }, { threshold: 0.2 }).observe(contactSection);
    }
  }
  updateBars();

  var drop = $('.nav-drop');
  var dropBtn = $('button', drop);
  function setDrop(open) {
    drop.classList.toggle('is-open', open);
    dropBtn.setAttribute('aria-expanded', String(open));
  }
  dropBtn.addEventListener('click', function (e) {
    // à la souris, le survol ouvre déjà le menu : le clic ne doit pas le refermer
    if (e.detail > 0 && window.matchMedia('(hover: hover)').matches) { setDrop(true); return; }
    setDrop(!drop.classList.contains('is-open'));
  });
  drop.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) setDrop(true); });
  drop.addEventListener('mouseleave', function () { setDrop(false); });
  drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) setDrop(false); });
  document.addEventListener('click', function (e) { if (!drop.contains(e.target)) setDrop(false); });

  var menu = $('#menu-mobile');
  var menuBtn = $('.menu-toggle');
  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    $('.menu-mobile__close', menu).focus();
  }
  function closeMenu(restoreFocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (restoreFocus !== false) menuBtn.focus();
  }
  menuBtn.addEventListener('click', openMenu);
  $('.menu-mobile__close', menu).addEventListener('click', function () { closeMenu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drop.classList.contains('is-open')) { setDrop(false); dropBtn.focus(); }
    closeMenu();
  });

  /* ---------------------------------------------------------------------
     Thème clair / sombre (choix du visiteur)
     --------------------------------------------------------------------- */
  var themeBtn = $('.theme-toggle');
  var themeMeta = $('meta[name="theme-color"]');
  function syncTheme() {
    var dark = doc.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeMeta.setAttribute('content', dark ? '#111412' : '#EEEFEC');
  }
  themeBtn.addEventListener('click', function () {
    doc.dataset.theme = doc.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('lemaire-theme', doc.dataset.theme); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* ---------------------------------------------------------------------
     ACCUEIL — hero : le mot « Lemaire » passe derrière le pignon du gîte de Boué.
     Les deux calques photo (ciel / bâtiment détouré) et le texte partagent
     le même repère SVG ; on recadre la vue selon le format de l'écran.
     --------------------------------------------------------------------- */
  var scene = $('#hero-scene');
  if (scene) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var IMG_W = 1920, IMG_H = 1645;   // calques hero-bg / hero-cut
    var HOUSE_X = 820, APEX_Y = 655;  // centre du gîte et faîtage, en pixels image
    var wordGroup = $('#hero-word');
    var mainText = $('#hero-main');
    var preText = $('#hero-pre');
    var clipRect = $('#hero-word-clip-rect');
    var letters = [];
    var offsets = [];
    var refWidth = 0;
    var fontSize = 514;
    var introDone = !motion;

    var measureWord = function () {
      mainText.removeAttribute('textLength');
      mainText.removeAttribute('lengthAdjust');
      mainText.setAttribute('x', '0');
      mainText.style.fontSize = '1000px';
      offsets = [];
      for (var i = 0; i < mainText.getNumberOfChars(); i++) offsets.push(mainText.getStartPositionOfChar(i).x);
      refWidth = mainText.getEndPositionOfChar(mainText.getNumberOfChars() - 1).x;
      letters = mainText.textContent.split('').map(function (ch) {
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('class', 'hero-word__main letter');
        t.textContent = ch;
        wordGroup.appendChild(t);
        return t;
      });
      mainText.style.display = 'none';
    };

    var layoutHero = function () {
      // taille du cadre sans transformation (l'animation d'entrée agrandit la scène de 7 %)
      var r = { width: heroFrame.clientWidth, height: heroFrame.clientHeight };
      if (!r.width || !r.height) return;
      var a = r.width / r.height;
      var w = IMG_W, h = w / a;
      if (h > IMG_H) { h = IMG_H; w = h * a; }
      var apexAt = a < 1 ? 0.4 : 0.445;
      var y0 = clamp(APEX_Y - apexAt * h, 0, IMG_H - h);
      var x0 = w < IMG_W ? clamp(HOUSE_X - w / 2, 0, IMG_W - w) : 0;
      scene.setAttribute('viewBox', [x0, y0, w, h].map(function (n) { return n.toFixed(1); }).join(' '));

      if (!letters.length) return;
      var target = Math.min(w * 0.9, 1760);
      fontSize = target / refWidth * 1000;
      var baseline = APEX_Y + 0.14 * fontSize;
      // le haut du « L » ne doit pas toucher les textes placés au-dessus (bandeau desktop, slogan mobile).
      // Mesure sans les transformations : pendant l'animation d'entrée le slogan est encore décalé
      // vers le bas, ce qui réduisait le mot à presque rien sur les écrans peu hauts (iPhone).
      var above = 0;
      [$('.hero-statements'), a < 1 ? $('.hero-slogan') : null].forEach(function (el) {
        if (!el || !el.offsetParent) return;
        var bottom = el.offsetHeight;
        for (var n = el; n && n !== heroFrame; n = n.offsetParent) bottom += n.offsetTop;
        above = Math.max(above, bottom);
      });
      if (above) {
        var limitY = y0 + (above + 28) * (h / r.height);
        if (baseline - 0.718 * fontSize < limitY) {
          // d'abord enfoncer le mot derrière le pignon (jusqu'à 30 % de sa hauteur), puis seulement le réduire
          fontSize = Math.max(Math.min(fontSize, (APEX_Y - limitY) / (0.718 - 0.30)), fontSize * 0.45);
          target = fontSize * refWidth / 1000;
          baseline = Math.max(APEX_Y + 0.14 * fontSize, Math.min(limitY + 0.718 * fontSize, APEX_Y + 0.30 * fontSize));
        }
      }
      var startX = x0 + (w - target) / 2;
      letters.forEach(function (el, i) {
        el.setAttribute('x', (startX + offsets[i] * fontSize / 1000).toFixed(1));
        el.setAttribute('y', baseline.toFixed(1));
        el.style.fontSize = fontSize.toFixed(1) + 'px';
      });
      preText.style.fontSize = (fontSize * (a < 1 ? 0.13 : 0.088)).toFixed(1) + 'px';
      preText.setAttribute('x', (startX + offsets[1] * fontSize / 1000).toFixed(1));
      preText.setAttribute('y', (baseline - 0.595 * fontSize).toFixed(1));

      clipRect.setAttribute('x', x0.toFixed(1));
      clipRect.setAttribute('width', w.toFixed(1));
      clipRect.setAttribute('y', '0');
      clipRect.setAttribute('height', (introDone ? IMG_H : baseline + 0.04 * fontSize).toFixed(1));
    };

    var heroIntro = function () {
      var tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: function () { introDone = true; clipRect.setAttribute('height', String(IMG_H)); }
      });
      tl.from(scene, { scale: 1.07, duration: 2.4, transformOrigin: '50% 62%' }, 0)
        .from(letters, { y: function () { return fontSize * 0.8; }, duration: 1.5, stagger: 0.065 }, 0.2)
        .from(preText, { opacity: 0, duration: 1.2, ease: 'power2.out' }, 0.95)
        .from('.hero-statements p, .hero-slogan, .hero-ctas, .hero-card', { opacity: 0, y: 26, duration: 1.2, stagger: 0.08 }, 0.65)
        .from(header, { opacity: 0, y: -14, duration: 1.1 }, 0.45);

      // en défilant, le mot s'enfonce derrière le bâtiment
      gsap.to(wordGroup, {
        y: function () { return fontSize * 0.42; },
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
      gsap.to('.hero-bottom, .hero-card, .hero-statements', {
        y: -60, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: '20% top', end: '75% top', scrub: true }
      });
    };

    var initHero = function () {
      measureWord();
      layoutHero();
      if (motion) heroIntro();
      var pending = false;
      var onResize = function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; layoutHero(); });
      };
      if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(heroFrame);
      else window.addEventListener('resize', onResize);
      // si la police arrive après le délai de 1,5 s, la hauteur du slogan change : on recale le mot
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    };

    var fontReady = document.fonts && document.fonts.load ? document.fonts.load('500 100px "General Sans"') : Promise.resolve();
    Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(initHero, initHero);
  }

  /* ---------------------------------------------------------------------
     PAGES SERVICES — en-tête de page : entrée de la photo et du titre
     --------------------------------------------------------------------- */
  var pageHero = $('.page-hero');
  if (pageHero && motion) {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.page-hero__img', { scale: 1.08, duration: 2.2 }, 0)
      .from('.crumbs, .page-hero__title, .page-hero__lead, .page-hero .hero-ctas', { opacity: 0, y: 30, duration: 1.2, stagger: 0.08 }, 0.15)
      .from('.page-hero__links li', { opacity: 0, y: 14, duration: 0.9, stagger: 0.05 }, 0.5)
      .from(header, { opacity: 0, y: -14, duration: 1.1 }, 0.3);
    gsap.to('.page-hero__img', {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: pageHero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------------------------------------------------------------------
     PAGES SERVICES — sommaire des prestations qui suit la lecture
     --------------------------------------------------------------------- */
  var tocLinks = $$('.toc__list a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var setActive = function (id) {
      tocLinks.forEach(function (a) { a.classList.toggle('is-active', a === byId[id]); });
      var link = byId[id];
      var list = link && link.parentNode.parentNode;
      // version mobile : la puce active reste visible dans la barre horizontale
      if (link && list.scrollWidth > list.clientWidth) list.scrollTo({ left: link.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------------------------------------------------------------------
     ACCUEIL — manifeste : les mots se « lisent » au défilement
     --------------------------------------------------------------------- */
  var manifesto = $('[data-scrub-words]');
  if (manifesto) {
    var words = manifesto.textContent.trim().split(/\s+/);
    manifesto.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var spans = $$('.w', manifesto);
    if (motion) {
      ScrollTrigger.create({
        trigger: manifesto, start: 'top 82%', end: 'bottom 48%', scrub: true,
        onUpdate: function (self) {
          var n = Math.round(self.progress * spans.length);
          spans.forEach(function (s, i) { s.classList.toggle('is-read', i < n); });
        }
      });
    } else {
      spans.forEach(function (s) { s.classList.add('is-read'); });
    }
  }

  /* ---------------------------------------------------------------------
     ACCUEIL — métiers : aperçu photo qui suit le pointeur (souris uniquement)
     --------------------------------------------------------------------- */
  var preview = $('.metier-preview');
  if (preview) {
    var previewImg = $('img', preview);
    var fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
    var px = 0, py = 0, tx = 0, ty = 0, previewOn = false, rafId = null, previewH = 0;
    var previewLoop = function () {
      px += (tx - px) * 0.14;
      py += (ty - py) * 0.14;
      var s = previewOn ? 1 : 0.86;
      preview.style.transform = 'translate3d(' + (px + 28).toFixed(1) + 'px,' + (py - previewH - 28).toFixed(1) + 'px,0) scale(' + s + ')';
      if (previewOn || Math.abs(tx - px) + Math.abs(ty - py) > 0.6) rafId = requestAnimationFrame(previewLoop);
      else rafId = null;
    };
    $$('.metier__link').forEach(function (link) {
      link.addEventListener('pointerenter', function (e) {
        if (!fine.matches || reduceMotion) return;
        previewImg.src = link.dataset.preview;
        previewH = preview.offsetHeight;
        if (!previewOn) { px = tx = e.clientX; py = ty = e.clientY; }
        previewOn = true;
        preview.classList.add('is-on');
        if (!rafId) rafId = requestAnimationFrame(previewLoop);
      });
      link.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
      link.addEventListener('pointerleave', function () {
        previewOn = false;
        preview.classList.remove('is-on');
      });
    });
  }

  /* ---------------------------------------------------------------------
     ACCUEIL — chantier à la une : avant / après + interventions
     --------------------------------------------------------------------- */
  var compare = $('.compare');
  if (compare) {
    var compareBtns = $$('.compare__btn', compare);
    var compareTouched = false;
    var setCompare = function (state) {
      compare.dataset.state = state;
      compareBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.target === state)); });
    };
    compareBtns.forEach(function (b) {
      b.addEventListener('click', function () { compareTouched = true; setCompare(b.dataset.target); });
    });
    if (motion && 'IntersectionObserver' in window) {
      setCompare('avant');
      var compareIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        compareIO.disconnect();
        setTimeout(function () { if (!compareTouched) setCompare('apres'); }, 900);
      }, { threshold: 0.6 });
      compareIO.observe(compare);
    }
  }

  var tradeBtns = $$('.trade__btn');
  tradeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      tradeBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---------------------------------------------------------------------
     ACCUEIL — réalisations : défilement horizontal épinglé (grand écran)
     --------------------------------------------------------------------- */
  var real = $('.realisations');
  if (real && motion) {
    var track = $('.realisations__track', real);
    gsap.matchMedia().add('(min-width: 1024px)', function () {
      real.classList.add('is-pinned');
      var distance = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '.realisations__pin', start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
      return function () { real.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'x' }); };
    });
  }

  /* ---------------------------------------------------------------------
     Accompagnement : progression des étapes
     --------------------------------------------------------------------- */
  var steps = $('.steps');
  if (steps) {
    if (motion) {
      ScrollTrigger.create({
        trigger: steps, start: 'top 70%', end: 'bottom 60%', scrub: true,
        onUpdate: function (self) { steps.style.setProperty('--progress', self.progress.toFixed(3)); }
      });
      $$('.step', steps).forEach(function (step) {
        ScrollTrigger.create({
          trigger: step, start: 'top 68%',
          onEnter: function () { step.classList.add('is-active'); },
          onLeaveBack: function () { step.classList.remove('is-active'); }
        });
      });
    } else {
      steps.style.setProperty('--progress', '1');
      $$('.step', steps).forEach(function (s) { s.classList.add('is-active'); });
    }
  }

  /* ---------------------------------------------------------------------
     ACCUEIL — avis clients : carrousel (boutons, flèches clavier, glisser)
     --------------------------------------------------------------------- */
  var quotesBox = $('.quotes');
  if (quotesBox) {
    var quotes = $$('.quote', quotesBox);
    var quoteIndex = 0;
    var indexOut = $('#quote-index');
    var showQuote = function (i) {
      quoteIndex = (i + quotes.length) % quotes.length;
      quotes.forEach(function (q, k) { q.classList.toggle('is-active', k === quoteIndex); });
      indexOut.textContent = String(quoteIndex + 1);
    };
    $$('.quotes__nav .round-btn', quotesBox).forEach(function (b) {
      b.addEventListener('click', function () { showQuote(quoteIndex + Number(b.dataset.dir)); });
    });
    quotesBox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') showQuote(quoteIndex + 1);
      if (e.key === 'ArrowLeft') showQuote(quoteIndex - 1);
    });
    var startX = null;
    var stage = $('.quotes__stage', quotesBox);
    stage.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 48) showQuote(quoteIndex + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------------------------------------------------------------------
     Contact : choix du type de projet (transmis à la future page contact)
     --------------------------------------------------------------------- */
  var cta = $('#contact-cta');
  if (cta) {
    $$('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
        var picked = $$('.chip[aria-pressed="true"]').map(function (c) { return c.dataset.value; });
        cta.setAttribute('href', '/contact/' + (picked.length ? '?projet=' + picked.join(',') : ''));
      });
    });
  }
})();
