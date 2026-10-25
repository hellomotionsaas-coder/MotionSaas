/* MotionSaas — 15% off popup (every page).
   Timing restarts on every new visit (new tab/window):
   first popup 3 s after arriving, then 30 s after the 1st close,
   45 s after the 2nd close, and every 60 s after that.
   Stops for good once the visitor signs up. */
(function () {
  'use strict';
  var KEY = 'ms-offer-v1';
  var ENTRY = 'ms-entry';
  var SKEY = 'ms-offer-session';
  var FIRST_DELAY = 3000; // 3 s after arriving on the site
  function delayAfter(closes) { return closes <= 1 ? 30000 : (closes === 2 ? 45000 : 60000); }
  var mem = {};
  function sread() { try { return JSON.parse(sessionStorage.getItem(SKEY) || '{}') || {}; } catch (e) { return mem; } }
  function swrite(o) { mem = o; try { sessionStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) {} }

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  var st = read();
  if (st.joined) return;

  var CODE = 'MOTION15';
  var box = document.createElement('div');
  box.className = 'offer';
  box.hidden = true;
  box.innerHTML =
    '<div class="offer__backdrop" data-offer-close></div>' +
    '<div class="offer__card" role="dialog" aria-modal="true" aria-labelledby="offer-h">' +
      '<button class="offer__x" type="button" data-offer-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="offer__step" data-step="form">' +
        '<p class="offer__big" id="offer-h"><span>15%</span> off</p>' +
        '<p class="offer__sub">Enter your email to unlock your exclusive MotionSaas discount code.</p>' +
        '<form class="offer__form" name="newsletter" method="POST" novalidate>' +
          '<input type="hidden" name="form-name" value="newsletter">' +
          '<p hidden><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
          '<label class="sr-only" for="offer-email">Email</label>' +
          '<input class="offer__input" id="offer-email" type="email" name="email" required autocomplete="email" placeholder="Enter your email">' +
          '<button class="offer__btn" type="submit"><span data-label>Get my code</span></button>' +
        '</form>' +
        '<p class="offer__err" data-err hidden>Please enter a valid email address.</p>' +
        '<p class="offer__fine">No spam. One-click unsubscribe anytime.</p>' +
      '</div>' +
      '<div class="offer__step" data-step="done" hidden>' +
        '<p class="offer__big"><span>15%</span> off</p>' +
        '<p class="offer__sub">Use this code at checkout for 15% off MotionSaas.</p>' +
        '<div class="offer__code"><code>' + CODE + '</code><button type="button" class="offer__copy" data-copy>Copy</button></div>' +
        '<a href="#pricing" class="offer__btn offer__btn--wide" data-offer-close>Get MotionSaas now</a>' +
      '</div>' +
    '</div>';

  var timer = null, lastFocus = null, isOpen = false;

  function busy() {
    var a = document.activeElement;
    return document.documentElement.classList.contains('cart-open') ||
      document.documentElement.classList.contains('modal-open') ||
      (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !box.contains(a));
  }
  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(open, Math.max(0, ms));
  }
  function open() {
    if (isOpen || read().joined) return;
    if (document.hidden || busy()) { schedule(8000); return; } // wait until visible
    if (!box.parentNode) document.body.appendChild(box);
    isOpen = true;
    lastFocus = document.activeElement;
    box.hidden = false;
    document.documentElement.classList.add('offer-open');
    var ss = sread(); ss.shown = Date.now(); swrite(ss);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('is-open'); }); });
    var input = box.querySelector('input[type=email]');
    if (input && window.matchMedia && window.matchMedia('(hover: hover)').matches) setTimeout(function () { input.focus(); }, 450);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    box.classList.remove('is-open');
    document.documentElement.classList.remove('offer-open');
    setTimeout(function () { if (!isOpen) box.hidden = true; }, 450);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (!read().joined) { var ss = sread(); ss.closes = (ss.closes || 0) + 1; ss.closed = Date.now(); swrite(ss); schedule(delayAfter(ss.closes)); }
  }

  box.addEventListener('click', function (e) {
    var c = e.target.closest('[data-offer-close]');
    if (!c) return;
    if (c.tagName !== 'A') e.preventDefault();
    close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });

  var form = box.querySelector('form');
  var err = box.querySelector('[data-err]');
  var label = box.querySelector('[data-label]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      err.textContent = 'Please enter a valid email address.';
      err.hidden = false; form.email.focus(); return;
    }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; label.textContent = 'One sec…';

    function grantCode() {
      var s = read(); s.joined = Date.now(); s.email = email; write(s);
      try {
        var subs = JSON.parse(localStorage.getItem('motionsaas_subscribers') || '[]');
        if (subs.indexOf(email) === -1) { subs.push(email); localStorage.setItem('motionsaas_subscribers', JSON.stringify(subs)); }
      } catch (err) {}
      clearTimeout(timer);
      box.querySelector('[data-step="form"]').hidden = true;
      box.querySelector('[data-step="done"]').hidden = false;
      btn.disabled = false; label.textContent = 'Get my code';
    }

    try {
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (r) {
        grantCode();
      }).catch(function () {
        // Fallback for offline/local server/non-Netlify: still grant code seamlessly!
        grantCode();
      });
    } catch (ex) {
      grantCode();
    }
  });

  var copy = box.querySelector('[data-copy]');
  copy.addEventListener('click', function () {
    var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1600); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(box.querySelector('.offer__code code'));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { document.execCommand('copy'); done(); } catch (e) { copy.textContent = 'Select & copy'; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CODE).then(done, fallback);
    else fallback();
  });

  /* When should it appear on this page? */
  var now = Date.now();
  var entry = 0;
  try { entry = parseInt(sessionStorage.getItem(ENTRY) || '0', 10); if (!entry) { entry = now; sessionStorage.setItem(ENTRY, String(now)); } } catch (e) { entry = now; }
  var ses = sread();
  if (ses.closes) schedule(ses.closed + delayAfter(ses.closes) - now);
  else if (ses.shown) schedule(ses.shown + 30000 - now);
  else schedule(entry + FIRST_DELAY - now);
})();
