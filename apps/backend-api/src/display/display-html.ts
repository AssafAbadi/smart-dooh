/**
 * Returns the billboard display HTML. Inline CSS/JS so a single GET serves the full page.
 * High-contrast (yellow/white on black), large typography for viewing from across the room.
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
      background: #000;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: clamp(0.5rem, 2vw, 1rem);
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 100vh;
    }
    .slot {
      text-align: center;
      max-width: min(100vw, 960px);
      width: 100%;
      padding: 0 4vw;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      flex-shrink: 0;
    }
    .headline {
      color: #fff;
      font-size: clamp(2.2rem, 7vw, 4.5rem);
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 0.2em;
      text-shadow: 0 0 20px rgba(255,255,255,0.2);
    }
    .body {
      color: #e0e0e0;
      font-size: clamp(1.2rem, 3.5vw, 2.3rem);
      line-height: 1.4;
      margin-bottom: 0.15em;
    }
    .direction-arrow {
      color: #0af;
      font-size: clamp(7.5rem, 24vw, 13.5rem);
      font-weight: 700;
      line-height: 1;
      margin: 0.05em 0;
      text-shadow: 0 0 24px rgba(0,170,255,0.5);
    }
    .coupon {
      color: #fff;
      font-size: clamp(1.6rem, 4.5vw, 3rem);
      font-weight: 700;
      margin-top: 0.2em;
    }
    .slot.fade-enter { animation: fadeIn 0.8s ease-out forwards; }
    .slot.fade-exit { animation: fadeOut 0.5s ease-in forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .placeholder { color: #666; font-size: clamp(1.2rem, 3vw, 2rem); }
    /* Emergency alert: red and yellow like the app */
    body.emergency { background: #CC0000; color: #fff; }
    body.emergency .emergency-topBand { background: #990000; width: 100%; padding: 1rem 0; text-align: center; }
    body.emergency .emergency-alertType { color: #FFD700; font-size: clamp(1.8rem, 5vw, 2.5rem); font-weight: 900; letter-spacing: 0.05em; }
    body.emergency .emergency-alertTypeHe { color: #FFD700; font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 800; margin-top: 0.2rem; }
    body.emergency .emergency-headline { color: #fff; font-size: clamp(1.1rem, 3.5vw, 1.4rem); font-weight: 600; margin: 0.5rem 0; }
    body.emergency .emergency-arrow { color: #FFD700; font-size: clamp(5rem, 18vw, 9rem); font-weight: 900; line-height: 1; margin: 0.2em 0; }
    body.emergency .emergency-shelterLabel { color: rgba(255,255,255,0.8); font-size: clamp(0.85rem, 2.5vw, 1rem); font-weight: 600; letter-spacing: 0.1em; margin-top: 0.5rem; }
    body.emergency .emergency-address { color: #fff; font-size: clamp(1.2rem, 4vw, 1.6rem); font-weight: 700; margin: 0.3rem 0 0.5rem; }
    body.emergency .emergency-distanceBadge { background: #FFD700; color: #000; border-radius: 12px; padding: 0.5rem 1.2rem; margin: 0.5rem 0; display: inline-block; }
    body.emergency .emergency-distanceText { font-size: clamp(1.8rem, 5vw, 2.5rem); font-weight: 900; }
    body.emergency .emergency-distanceSubtext { font-size: 0.7rem; color: rgba(0,0,0,0.6); }
    body.emergency .emergency-instruction { color: rgba(255,255,255,0.9); font-size: clamp(0.95rem, 2.8vw, 1.1rem); margin-top: 0.5rem; }
    body.emergency .emergency-bottomBand { background: #990000; width: 100%; padding: 1rem 0; text-align: center; margin-top: auto; }
    body.emergency .emergency-bottomText { color: #FFD700; font-size: clamp(0.85rem, 2.5vw, 1rem); font-weight: 600; }
  </style>
</head>
<body>
  <div id="root" class="slot">
    <div class="headline">Loading…</div>
    <div class="body">Fetching ads for ${escapedDriverId}</div>
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
    function render(instruction, useFade) {
      if (!instruction) {
        document.body.classList.remove('emergency');
        root.innerHTML = '<div class="headline">No ad</div><div class="body">No active campaign in range.</div>';
        lastAdKey = '';
        return;
      }
      var isEmergency = instruction.campaignId === 'emergency';
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
      const headlineRaw = replacePlaceholders(instruction.headline || 'Special offer', instruction, false);
      const bodyRaw = replacePlaceholders(instruction.body || '', instruction, true);
      const headline = escapeHtml(headlineRaw);
      const bodyEscaped = escapeHtml(bodyRaw);
      const coupon = escapeHtml(instruction.couponCode || '');
      var arrowChar = instruction.direction && DIRECTION_ARROWS[instruction.direction] ? DIRECTION_ARROWS[instruction.direction] : '';
      var arrowBlock = arrowChar ? '<div class="direction-arrow">' + escapeHtml(arrowChar) + '</div>' : '';
      root.innerHTML = '<div class="headline">' + headline + '</div><div class="body">' + bodyEscaped + '</div>' + arrowBlock + (coupon ? '<div class="coupon">' + coupon + '</div>' : '');
    }

    function fetchAds() {
      var headers = { 'Accept': 'application/json' };
      if (window.location.hostname.indexOf('ngrok') !== -1) headers['ngrok-skip-browser-warning'] = '1';
      fetch(API_BASE + '/ad-selection/last/' + encodeURIComponent(driverId), { headers: headers })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
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
                root.innerHTML = '<div class="headline">Mirror</div><div class="body">Open the app with this driver. The ad shown in the app will appear here within a few seconds.</div>';
              }
            } else {
              root.innerHTML = '<div class="headline">Mirror</div><div class="body">Open the app with this driver. The ad shown in the app will appear here within a few seconds.</div>';
            }
          }
        })
        .catch(function() {
          if (!lastAdKey) {
            root.innerHTML = '<div class="headline">Offline</div><div class="body">Cannot reach server. Retrying in 5s.</div>';
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
