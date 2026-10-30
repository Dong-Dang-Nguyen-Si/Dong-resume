/* A. Shared names: declared once, used by every block below. */
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const sections = Array.from(document.querySelectorAll('main section[id]'));
const navLinks = Array.from(document.querySelectorAll('.site-nav a'));
let jumpedTo = '';
let jumpSeen = false;

/* B. Reveal: sections draw their ground line, plans run their cut. */
function reveal(el) {
  el.classList.add(el.matches('.plan') ? 'is-cut' : 'is-drawn');
}

if (!calm) {
  const reveals = Array.from(document.querySelectorAll('main section[id]:not(#home), .plan'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Also reveal anything already scrolled past (for example after a reload).
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        reveal(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -15% 0px' });

  reveals.forEach((el) => {
    el.classList.add(el.matches('.plan') ? 'will-cut' : 'will-draw');
    io.observe(el);
  });

  // Keyboard accessibility: Tab landing inside a plan or section reveals it at once.
  document.addEventListener('focusin', (event) => {
    [event.target.closest('.plan'), event.target.closest('main section[id]')].forEach((el) => {
      if (el) reveal(el);
    });
  });
}

/* C. One scroll update, throttled with rAF: reads first, then writes. It runs per scroll event, so nothing loops when idle. */
let queued = false;

function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

function select(id) {
  navLinks.forEach((link) => {
    // setAttribute, not toggleAttribute: aria-current="" counts as false for screen readers.
    if (link.hash === '#' + id) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function update() {
  queued = false;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  const line = (header ? header.offsetHeight : 0) + window.innerHeight * 0.3;
  const tops = sections.map((section) => section.getBoundingClientRect().top);
  let id = sections.length > 0 ? sections[0].id : '';

  tops.forEach((top, i) => {
    if (top <= line) id = sections[i].id;
  });

  if (atBottom && sections.length > 0) {
    id = sections[sections.length - 1].id;
  }

  if (jumpedTo) {
    const el = document.getElementById(jumpedTo);
    if (el) {
      const box = el.getBoundingClientRect();
      if (box.bottom > 0 && box.top < window.innerHeight) {
        jumpSeen = true;
      } else if (jumpSeen) {
        jumpedTo = '';
      }
    }
  }

  select(jumpedTo || id);

  if (atBottom) {
    document.querySelectorAll('.will-draw:not(.is-drawn), .will-cut:not(.is-cut)').forEach(reveal);
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
update();

function release() {
  jumpedTo = '';
}

['wheel', 'touchmove'].forEach((name) => window.addEventListener(name, release, { passive: true }));

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
    release();
  }
});

/* D. Jumps: hold the selection and replay the heading's hatching. */
function land(target) {
  if (calm || target.id === 'home') return;
  reveal(target);
  target.classList.remove('is-landing');
  void target.offsetWidth; // restart animation if already running
  target.classList.add('is-landing');
  target.addEventListener('animationend', function done(event) {
    if (!event.target.matches('h2')) return;
    target.classList.remove('is-landing');
    target.removeEventListener('animationend', done);
  });
}

function jump(target) {
  jumpedTo = target.id;
  jumpSeen = false;
  select(target.id);
  land(target);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = link.hash.length > 1 && document.getElementById(link.hash.slice(1));
    if (target && sections.includes(target)) jump(target);
  });
});

window.addEventListener('hashchange', () => {
  const target = document.getElementById(location.hash.slice(1));
  if (target && sections.includes(target) && jumpedTo !== target.id) jump(target);
});

