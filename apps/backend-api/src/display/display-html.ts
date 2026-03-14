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
        root.innerHTML = '<div class="headline">No ad</div><div class="body">No active campaign in range.</div>';
        lastAdKey = '';
        return;
      }
      const headlineRaw = replacePlaceholders(instruction.headline || 'Special offer', instruction, false);
      const bodyRaw = replacePlaceholders(instruction.body || '', instruction, true);
      const headline = escapeHtml(headlineRaw);
      const bodyEscaped = escapeHtml(bodyRaw);
      const coupon = escapeHtml(instruction.couponCode || '');
      var arrowChar = instruction.direction && DIRECTION_ARROWS[instruction.direction] ? DIRECTION_ARROWS[instruction.direction] : '';
      var arrowBlock = arrowChar ? '<div class="direction-arrow">' + escapeHtml(arrowChar) + '</div>' : '';
      if (useFade) {
        root.classList.remove('fade-enter');
        root.offsetHeight;
        root.classList.add('fade-enter');
      }
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
