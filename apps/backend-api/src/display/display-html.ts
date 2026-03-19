/**
 * Returns the billboard display HTML. Inline CSS/JS so a single GET serves the full page.
 * Premium dark theme: glassmorphism card, Electric Blue (#007AFF) accent, no yellow/purple.
 */
export function getDisplayHtml(driverId: string): string {
  const escapedDriverId = escapeHtml(driverId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DOOH Display – ${escapedDriverId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      width: 100%;
    }
    body {
      background: #0a0a0c;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: clamp(1rem, 4vw, 2rem);
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 100vh;
    }
    .slot {
      text-align: center;
      max-width: min(90vw, 960px);
      width: 100%;
      padding: 0 4vw;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      flex-shrink: 0;
    }
    .display-card {
      background: rgba(28, 30, 34, 0.92);
      border: 1px solid #333;
      border-radius: 20px;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
      padding: clamp(1.5rem, 5vw, 3rem);
      width: 100%;
    }
    .card-headline {
      color: #fff;
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 0.15em;
    }
    .card-subhead {
      color: #e0e0e0;
      font-size: clamp(1.1rem, 3.5vw, 2rem);
      font-weight: 500;
      line-height: 1.3;
      margin-bottom: 0.4em;
    }
    .coupon-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      background: #007AFF;
      color: #fff;
      font-size: clamp(1.4rem, 4vw, 2.5rem);
      font-weight: 700;
      border-radius: 12px;
      padding: 0.4em 0.8em;
      margin: 0.3em 0;
      cursor: pointer;
    }
    .coupon-pill:hover { opacity: 0.95; }
    .copy-icon { font-size: 0.85em; opacity: 0.9; }
    .direction-arrow {
      color: #007AFF;
      font-size: clamp(6rem, 20vw, 11rem);
      font-weight: 700;
      line-height: 1;
      margin: 0.1em 0;
      text-shadow: 0 0 32px rgba(0, 122, 255, 0.5);
    }
    .card-details {
      color: #A0A0A0;
      font-size: clamp(0.95rem, 2.5vw, 1.5rem);
      line-height: 1.4;
      margin-top: 0.3em;
    }
    .headline { color: #fff; font-size: clamp(2.2rem, 7vw, 4.5rem); font-weight: 700; line-height: 1.15; margin-bottom: 0.2em; }
    .body { color: #e0e0e0; font-size: clamp(1.2rem, 3.5vw, 2.3rem); line-height: 1.4; margin-bottom: 0.15em; }
    .coupon { color: #fff; font-size: clamp(1.6rem, 4.5vw, 3rem); font-weight: 700; margin-top: 0.2em; }
    .slot.fade-enter { animation: fadeIn 0.8s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .placeholder { color: #666; font-size: clamp(1.2rem, 3vw, 2rem); }
    /* Emergency: red only, no yellow – white for accents */
    body.emergency { background: #CC0000; color: #fff; height: 100vh; overflow: hidden; display: flex; flex-direction: column; padding: 0; }
    body.emergency .slot { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; padding: clamp(0.5rem, 1.5vh, 1rem) 4vw; }
    body.emergency .emergency-topBand { background: #990000; width: 100%; padding: clamp(0.4rem, 1.2vh, 1rem) 0; text-align: center; flex-shrink: 0; }
    body.emergency .emergency-alertType { color: #FFFFFF; font-size: clamp(1rem, 2.8vh, 2.5rem); font-weight: 900; letter-spacing: 0.05em; }
    body.emergency .emergency-alertTypeHe { color: #FFFFFF; font-size: clamp(0.85rem, 2.2vh, 2rem); font-weight: 800; margin-top: 0.1rem; }
    body.emergency .emergency-headline { color: #fff; font-size: clamp(0.7rem, 2vh, 1.4rem); font-weight: 600; margin: 0.2rem 0; }
    body.emergency .emergency-arrow { color: #FFFFFF; font-size: clamp(3rem, 12vh, 9rem); font-weight: 900; line-height: 1; margin: 0.1em 0; flex-shrink: 0; }
    body.emergency .emergency-shelterLabel { color: rgba(255,255,255,0.8); font-size: clamp(0.65rem, 1.8vh, 1rem); font-weight: 600; letter-spacing: 0.1em; margin-top: 0.2rem; }
    body.emergency .emergency-address { color: #fff; font-size: clamp(0.75rem, 2.2vh, 1.6rem); font-weight: 700; margin: 0.2rem 0 0.3rem; }
    body.emergency .emergency-distanceBadge { background: #FFFFFF; color: #1a1a1a; border-radius: 12px; padding: 0.35rem 1rem; margin: 0.3rem 0; display: inline-block; }
    body.emergency .emergency-distanceText { font-size: clamp(1rem, 3vh, 2.5rem); font-weight: 900; }
    body.emergency .emergency-distanceSubtext { font-size: 0.6rem; color: rgba(0,0,0,0.6); }
    body.emergency .emergency-instruction { color: rgba(255,255,255,0.9); font-size: clamp(0.7rem, 2vh, 1.1rem); margin-top: 0.2rem; }
    body.emergency .emergency-bottomBand { background: #990000; width: 100%; padding: clamp(0.4rem, 1.2vh, 1rem) 0; text-align: center; flex-shrink: 0; }
    body.emergency .emergency-bottomText { color: #FFFFFF; font-size: clamp(0.7rem, 2vh, 1rem); font-weight: 600; }
  </style>
</head>
<body>
  <div id="root" class="slot">
    <div class="display-card">
      <div class="card-headline">Loading…</div>
      <div class="body">Fetching ads for ${escapedDriverId}</div>
    </div>
  </div>
  <script>
    const driverId = ${JSON.stringify(driverId)};
    const root = document.getElementById('root');
    const API_BASE = window.location.origin;
    var lastAdKey = '';
    var emptyCount = 0;

    function escapeHtml(s) {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    var DIRECTION_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
    function replacePlaceholders(text, instruction, distanceInBody) {
      if (!text) return '';
      var distNum = (instruction.distanceMeters != null) ? (Math.round(instruction.distanceMeters) + 'm') : '—';
      var distForBody = distanceInBody ? distNum : '—';
      var code = instruction.couponCode || '—';
      return text.split('[DISTANCE]').join(distForBody).split('[TIME_LEFT]').join('—').split('[COUPON_CODE]').join(code);
    }
    function copyCoupon(code) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code);
    }
    window.copyCoupon = copyCoupon;
    function render(instruction, useFade) {
      if (!instruction) {
        document.body.classList.remove('emergency');
        root.innerHTML = '<div class="display-card"><div class="card-headline">No ad</div><div class="card-details">No active campaign in range.</div></div>';
        lastAdKey = '';
        return;
      }
      var isEmergency = instruction.campaignId === 'emergency' ||
        (instruction.body && String(instruction.body).indexOf('מקלט') !== -1) ||
        (instruction.headline && /אזעקת|MISSILE|alert/i.test(String(instruction.headline)));
      document.body.classList.toggle('emergency', isEmergency);
      if (useFade) {
        root.classList.remove('fade-enter');
        root.offsetHeight;
        root.classList.add('fade-enter');
      }
      if (isEmergency) {
        var headlineRaw = replacePlaceholders(instruction.headline || 'EMERGENCY ALERT', instruction, false);
        var bodyRaw = replacePlaceholders(instruction.body || '', instruction, true);
        var distNum = (instruction.distanceMeters != null) ? (Math.round(instruction.distanceMeters) + 'm') : '—';
        var arrowChar = instruction.direction && DIRECTION_ARROWS[instruction.direction] ? DIRECTION_ARROWS[instruction.direction] : '↑';
        var directionText = (instruction.direction === 'up') ? 'forward' : (instruction.direction === 'down') ? 'behind you' : (instruction.direction || '');
        root.innerHTML = '<div class="emergency-topBand"><div class="emergency-alertType">MISSILE ALERT</div><div class="emergency-alertTypeHe">אזעקת טילים</div></div>' +
          '<div class="emergency-headline">' + escapeHtml(headlineRaw) + '</div>' +
          '<div class="emergency-arrow">' + escapeHtml(arrowChar) + '</div>' +
          '<div class="emergency-shelterLabel">NEAREST SHELTER</div>' +
          '<div class="emergency-address">' + escapeHtml(bodyRaw) + '</div>' +
          '<div class="emergency-distanceBadge"><div class="emergency-distanceText">' + escapeHtml(distNum) + '</div><div class="emergency-distanceSubtext">straight-line</div></div>' +
          '<div class="emergency-instruction">Head ' + escapeHtml(directionText) + ' to the nearest shelter</div>' +
          '<div class="emergency-bottomBand"><div class="emergency-bottomText">Stay safe. Move to shelter immediately.</div></div>';
        return;
      }
      var headlineRawAd = replacePlaceholders(instruction.headline || 'Special offer', instruction, false);
      var bodyRawAd = replacePlaceholders(instruction.body || '', instruction, true);
      var headline = escapeHtml(headlineRawAd);
      var bodyEscaped = escapeHtml(bodyRawAd);
      var couponCode = instruction.couponCode || '';
      var coupon = escapeHtml(couponCode);
      var arrowCharAd = instruction.direction && DIRECTION_ARROWS[instruction.direction] ? DIRECTION_ARROWS[instruction.direction] : '';
      var arrowBlock = arrowCharAd ? '<div class="direction-arrow">' + escapeHtml(arrowCharAd) + '</div>' : '';
      var couponBlock = couponCode ? '<div class="coupon-pill" onclick="copyCoupon(' + JSON.stringify(couponCode) + ')">' + coupon + ' <span class="copy-icon" aria-hidden="true">⎘</span></div>' : '';
      root.innerHTML = '<div class="display-card">' +
        '<div class="card-headline">' + headline + '</div>' +
        couponBlock +
        arrowBlock +
        '<div class="card-details">' + bodyEscaped + '</div>' +
        '</div>';
    }

    var fetchTimeout = 12000;

    function showMirror() {
      root.innerHTML = '<div class="display-card"><div class="card-headline">Mirror</div><div class="card-details">Open the app with this driver. The ad shown in the app will appear here within a few seconds.</div></div>';
    }

    function fetchAds() {
      var headers = { 'Accept': 'application/json' };
      if (window.location.hostname.indexOf('ngrok') !== -1) headers['ngrok-skip-browser-warning'] = '1';
      var timedOut = false;
      var timeoutId = setTimeout(function() {
        timedOut = true;
        if (lastAdKey === '') {
          root.innerHTML = '<div class="display-card"><div class="card-headline">Connecting…</div><div class="card-details">No response yet. Open the app with this driver or check the server. Retrying every 5s.</div></div>';
        }
      }, fetchTimeout);
      fetch(API_BASE + '/ad-selection/last/' + encodeURIComponent(driverId) + '?t=' + Date.now(), { headers: headers })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          clearTimeout(timeoutId);
          if (timedOut) return;
          var first = data && data.instructions && data.instructions[0];
          if (first) {
            emptyCount = 0;
            var key = (first.headline || '') + '|' + (first.body || '') + '|' + (first.couponCode || '') + '|' + (first.businessId || '');
            var isSame = key === lastAdKey;
            lastAdKey = key;
            render(first, !isSame);
          } else {
            if (lastAdKey) {
              emptyCount++;
              if (emptyCount >= 2) {
                lastAdKey = '';
                emptyCount = 0;
                showMirror();
              }
            } else {
              showMirror();
            }
          }
        })
        .catch(function() {
          clearTimeout(timeoutId);
          if (!lastAdKey) {
            root.innerHTML = '<div class="display-card"><div class="card-headline">Offline</div><div class="card-details">Cannot reach server. Retrying in 5s.</div></div>';
          }
        });
    }

    fetchAds();
    setInterval(fetchAds, 5000);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
