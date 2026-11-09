// Kris: concept site by Damora Digital. One rAF loop for the hero payoff (bulbs + lipstick swipe),
// scrubbed from max(time, scroll) so it always finishes in view; reveals and counters fire on entry.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  // theme toggle
  var tbtn = document.getElementById('theme');
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  tbtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('kris-theme', next); } catch (e) {}
  });

  // the mirror bulbs
  var mirror = document.getElementById('mirror');
  var host = document.getElementById('bulbs');
  var bulbs = [];
  var lastW = 0;
  function buildBulbs() {
    var w = mirror.offsetWidth, h = mirror.offsetHeight;
    if (!w || w === lastW) return;
    lastW = w;
    var pad = parseFloat(getComputedStyle(mirror).paddingLeft) || 30;
    var size = w < 600 ? 13 : 19;
    var gap = w < 600 ? 44 : 58;
    var o = pad / 2;
    var pts = [];
    var nx = Math.max(3, Math.round((w - 2 * o) / gap));
    var ny = Math.max(3, Math.round((h - 2 * o) / gap));
    var i;
    for (i = ny; i > 0; i--) pts.push([o, o + (h - 2 * o) * i / ny]);          // left, bottom to top
    for (i = 0; i < nx; i++) pts.push([o + (w - 2 * o) * i / nx, o]);          // top, left to right
    for (i = 0; i < ny; i++) pts.push([w - o, o + (h - 2 * o) * i / ny]);      // right, top to bottom
    for (i = nx; i > 0; i--) pts.push([o + (w - 2 * o) * i / nx, h - o]);      // bottom, right to left
    host.innerHTML = '';
    host.style.setProperty('--b', size + 'px');
    bulbs = pts.map(function (p) {
      var b = document.createElement('span');
      b.className = 'bulb';
      b.style.left = p[0] + 'px';
      b.style.top = p[1] + 'px';
      host.appendChild(b);
      return b;
    });
    paint(done ? 1 : prog);
  }

  // the payoff: bulbs chase on, glow rises, lipstick swipe draws
  var swipe = document.getElementById('swipe');
  var paths = swipe ? Array.prototype.slice.call(swipe.querySelectorAll('path')) : [];
  var lens = paths.map(function (p) { return p.getTotalLength(); });
  var glow = document.getElementById('glow');
  var t0 = performance.now();
  var DUR = 1200;
  var prog = 0, done = false;
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function paint(p) {
    var lit = Math.round(p * bulbs.length);
    for (var i = 0; i < bulbs.length; i++) bulbs[i].classList.toggle('on', i < lit);
    glow.style.opacity = p.toFixed(3);
    paths.forEach(function (path, k) {
      var q = k === 0 ? clamp((p - 0.25) / 0.75) : clamp((p - 0.4) / 0.6);
      path.style.strokeDasharray = lens[k];
      path.style.strokeDashoffset = (lens[k] * (1 - q)).toFixed(1);
    });
  }
  function tick(now) {
    var p = Math.max((now - t0) / DUR, window.scrollY / (0.2 * window.innerHeight));
    prog = clamp(p);
    paint(prog);
    if (prog >= 1) { done = true; swipe.classList.add('in'); return; }
    requestAnimationFrame(tick);
  }
  buildBulbs();
  if (reduce) { prog = 1; done = true; paint(1); swipe.classList.add('in'); }
  else requestAnimationFrame(tick);
  window.addEventListener('resize', buildBulbs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastW = 0; buildBulbs(); });

  // header + phone book bar
  var hdr = document.getElementById('hdr');
  var bar = document.getElementById('bookbar');
  var endVisible = false;
  function onScroll() {
    var y = window.scrollY;
    hdr.classList.toggle('solid', y > 20);
    bar.classList.toggle('show', y > window.innerHeight * 0.8 && !endVisible);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var ends = new Set();
    var endIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) ends.add(e.target); else ends.delete(e.target); });
      endVisible = ends.size > 0;
      onScroll();
    });
    ['book', 'pitch'].forEach(function (id) { var el = document.getElementById(id); if (el) endIo.observe(el); });
    var f = document.querySelector('.foot'); if (f) endIo.observe(f);
  }

  // reveals + counters
  var reveals = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count]');
  function count(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var end = parseFloat(el.dataset.count);
    if (reduce) { el.textContent = String(end); return; }
    var s = performance.now();
    (function step(now) {
      var k = clamp((now - s) / 550);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(end * e));
      if (k < 1) requestAnimationFrame(step);
    })(s);
  }
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
    counters.forEach(count);
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    reveals.forEach(function (el) { io.observe(el); });
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // in-page links glide (CSS smooth scroll stays off so scripted scrolls land at once)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    var y = a.getAttribute('href') === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  // before / after
  var range = document.getElementById('baRange');
  var after = document.getElementById('baAfter');
  var handle = document.getElementById('baHandle');
  function setBA() {
    var v = range.value;
    after.style.clipPath = 'inset(0 0 0 ' + v + '%)';
    handle.style.left = v + '%';
  }
  range.addEventListener('input', setBA);
  setBA();
})();
