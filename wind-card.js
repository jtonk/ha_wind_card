import { LitElement, svg, html, css } from 'https://unpkg.com/lit?module';
import { repeat } from 'https://unpkg.com/lit/directives/repeat.js?module';
////
// Color scale used for wind and gust speeds. This mirrors the palette from
// ha_wind_stat_card so both the gauge and graph use the same colours.
const wsColors = [
  '#9700ff', '#6400ff', '#3200ff', '#0032ff', '#0064ff', '#0096ff', '#00c7ff',
  '#00e6f0', '#25c192', '#11d411', '#00e600', '#00fa00', '#b8ff61', '#fffe00',
  '#ffe100', '#ffc800', '#ffaf00', '#ff9600', '#e67d00', '#e66400', '#dc4a1d',
  '#c8321d', '#b4191d', '#aa001d', '#b40032', '#c80064', '#fe0096'
];

class WindCard extends LitElement {
  static properties = {
    hass: {},
    config: {},
    windSpeed: { type: Number },
    gust: { type: Number },
    direction: { type: Number },
    size: { type: Number },
    cardinal_offset: { type: Number },
    tickPath_radius: { type: Number },
    tickPath_width: { type: Number },
    _timeline: { type: Array },
    _timelineIndex: { type: Number },
    _historyData: { state: true },
    _lastUpdated: { state: true },
    _noData: { state: true },
    show_radialgraph: { type: Boolean },
    _hoverMinute: { state: true }
  };

  constructor() {
    super();
    this.hass = null;
    this.config = null;
    this.windSpeed = 0;
    this.gust = 0;
    this.direction = 0;
    this.size = 200;
    this.cardinal_offset = 4;
    this.tickPath_radius = 38;
    this.tickPath_width = 4;
    this._timeline = [];
    this._timelineIndex = 0;

    this._historyData = [];
    this._lastUpdated = null;
    this._noData = false;
    this.show_radialgraph = true;
    this._lastTimelineUpdate = null;
    this._hoverMinute = null;
  }

  setConfig(config) {

    if (!config?.entity) {
      throw new Error('entity must be set');
    }
    if (!config.wind_entity || !config.gust_entity || !config.direction_entity) {
      throw new Error('wind_entity, gust_entity and direction_entity must be set');
    }
    this.config = config;
    this.size = Number(config.size || 200);
    this.cardinal_offset = Number(config.cardinal_offset || 4);
    this.tickPath_radius = Number(config.tickPath_radius || 38);
    this.tickPath_width = Number(config.tickPath_width || 4);
    this.minutes = Math.max(1, Math.min(60, Number(config.minutes || 60)));
    this.autoscale = config.autoscale !== false;
    this.show_radialgraph = config.show_radialgraph !== false;
  }

  set hass(hass) {
    this._hass = hass;
    this._updateFromEntity();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    super.connectedCallback();
    this._animInterval = setInterval(() => this._animateFromTimeline(), 1000);
    if (this.show_radialgraph) {
      this._scheduleNextFetch();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._animInterval);
    clearTimeout(this._timeout);
  }

  updated() {
    const labels = this.renderRoot.querySelectorAll('.unit-labels text');
    labels.forEach(el => {
      const val = el.textContent;
      el.textContent = '';
      el.textContent = val;
    });
  }

  _updateFromEntity() {
    if (!this._hass || !this.config) return;
    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj?.attributes?.data) return;
    const lastUpdate = (stateObj.last_updated || stateObj.last_changed || '').toString();
    if (this._lastTimelineUpdate === lastUpdate) return;

    const data = stateObj.attributes.data;
    const dirs = Array.isArray(data.direction) ? data.direction : [];
    const speeds = Array.isArray(data.speed) ? data.speed : [];
    const gusts = Array.isArray(data.gusts) ? data.gusts : [];
    const len = Math.min(dirs.length, speeds.length, gusts.length);
    this._timeline = [];
    for (let i = 0; i < len; i++) {
      this._timeline.push({
        direction: Number(dirs[i]),
        wind: Number(speeds[i]),
        gust: Number(gusts[i]),
      });
    }
    this._timelineIndex = 0;
    this._lastTimelineUpdate = lastUpdate;
  }

  _animateFromTimeline() {
    if (!this._isDataLive()) {
      this.windSpeed = 0;
      this.gust = 0;
      this.direction = 0;
      return;
    }
    if (!this._timeline || this._timeline.length === 0) return;
    const frame = this._timeline[this._timelineIndex];
    if (frame) {
      this.windSpeed = frame.wind ?? this.windSpeed;
      this.gust = frame.gust ?? this.gust;
      if (typeof frame.direction === 'number') {
        this.direction = this._shortestAngle(this.direction, frame.direction);
      }
    }
    this._timelineIndex = (this._timelineIndex + 1) % this._timeline.length;
  }

  _shortestAngle(current, target) {
    if (typeof current !== 'number') return target;
    const diff = ((target - current + 540) % 360) - 180;
    return current + diff;
  }

  _buildMinuteSlots(now = new Date()) {
    const slots = [];
    for (let i = 0; i < 60; i++) {
      const t = new Date(now.getTime() - (59 - i) * 60000);
      t.setSeconds(0, 0);
      const minute = t.getMinutes();
      slots.push({ minute, angle: minute * 6, order: i });
    }
    return slots;
  }

  _polarToCartesian(cx, cy, r, angleDeg) {
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  }

  _directionToText(deg) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const norm = ((deg % 360) + 360) % 360;
    const i = Math.round(norm / 22.5) % 16;
    return dirs[i];
  }

  _renderSpeedScale(outerR, minSpan, maxSpan, scale, anchorSlots) {
    if (!scale || scale < 5) return null;
    const anchors = Array.isArray(anchorSlots) && anchorSlots.length
      ? anchorSlots
      : Array.from({ length: 12 }, (_, i) => ({ angle: i * 30 }));
    const center = { x: 50, y: 50 };
    const spanRange = Math.max(0, maxSpan - minSpan);
    if (spanRange <= 0) return null;
    const dashLenKn = 0.2; // half of 5-kn span
    const gapLenKn = 5 - dashLenKn; // keep total cycle at 5 knots

    const ticks = anchors.map(anchor => {
      const angle = anchor.angle;
      const outer = this._polarToCartesian(center.x, center.y, outerR, angle);
      const dx = center.x - outer.x;
      const dy = center.y - outer.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const startX = outer.x + ux * minSpan;
      const startY = outer.y + uy * minSpan;
      const endX = startX + ux * spanRange;
      const endY = startY + uy * spanRange;
      return svg`<line
        x1="${startX}" y1="${startY}"
        x2="${endX}" y2="${endY}"
        pathLength="${scale}"
        stroke-dasharray="${dashLenKn.toFixed(3)} ${(gapLenKn).toFixed(3)}"
      ></line>`;
    });

    return svg`<g class="speed-ticks">${ticks}</g>`;
  }

  _buildTickPath(radius, length, step, skip = []) {
    let d = '';
    for (let a = 0; a < 360; a += step) {
      if (skip.includes(a)) continue;
      const outer = this._polarToCartesian(50, 50, radius, a);
      const inner = this._polarToCartesian(50, 50, radius - length, a);
      d += `M ${inner.x},${inner.y} L ${outer.x},${outer.y} `;
    }
    return d.trim();
  }

  _speedToColor(speed) {
    const idx = Math.min(wsColors.length - 1, Math.max(0, Math.floor(speed / 2)));
    return wsColors[idx];
  }

  _addAlpha(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(ch => ch + ch).join('');
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  _buildMinuteDataMap(now = new Date()) {
    const minuteData = {};
    this._historyData.forEach(d => {
      const t = d.time ? new Date(d.time) : null;
      if (!t || !Number.isFinite(t.getTime())) return;
      // Keep the most recent reading per minute
      minuteData[t.getMinutes()] = d;
    });
    const currentMinute = now.getMinutes();
    if (!minuteData[currentMinute]) {
      minuteData[currentMinute] = {
        wind: this.windSpeed,
        gust: this.gust,
        direction: this.direction,
        time: now,
      };
    }
    return minuteData;
  }

  _getMinuteValues(minute, minuteData, currentMinute) {
    const data = minuteData[minute] || {};
    const liveWind = Number.isFinite(this.windSpeed) ? this.windSpeed : null;
    const liveGust = Number.isFinite(this.gust) ? this.gust : null;
    const liveDir = Number.isFinite(this.direction) ? this.direction : null;
    const baseWind = Number.isFinite(data.wind) ? data.wind : (liveWind ?? 0);
    const baseGust = Number.isFinite(data.gust) ? data.gust : Number.isFinite(data.wind) ? data.wind : (liveGust ?? liveWind ?? 0);
    const wind = minute === currentMinute && liveWind !== null ? liveWind : baseWind;
    const gust = minute === currentMinute && (liveGust !== null || liveWind !== null)
      ? (liveGust ?? liveWind ?? baseGust)
      : baseGust;
    const direction = Number.isFinite(data.direction)
      ? data.direction
      : (minute === currentMinute && liveDir !== null ? liveDir : liveDir ?? 0);
    return { wind, gust, direction };
  }

  _minuteFromPointerEvent(ev) {
    if (!ev) return null;
    const svg = this.renderRoot?.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return null;

    const clientX = ev.clientX ?? ev?.touches?.[0]?.clientX;
    const clientY = ev.clientY ?? ev?.touches?.[0]?.clientY;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    return Math.round(angle / 6) % 60;
  }

  _handleMinutePointer(ev) {
    const minute = this._minuteFromPointerEvent(ev);
    if (!Number.isFinite(minute)) return;
    this._hoverMinute = minute;
  }

  _clearHover() {
    this._hoverMinute = null;
  }

  _isDataLive() {
    if (!this.hass || !this.config) return false;
    const ids = [
      this.config.wind_entity,
      this.config.gust_entity,
      this.config.direction_entity,
    ];
    const now = Date.now();
    return ids.every(id => {
      const state = this.hass.states[id];
      if (!state) return false;
      const ts = new Date(state.last_updated || state.last_changed).getTime();
      return now - ts <= 60000;
    });
  }

  _scheduleNextFetch() {
    if (!this.show_radialgraph) return;
    // Clear any pending timer before scheduling a new one
    if (this._timeout) clearTimeout(this._timeout);
    this._fetchData();
    const now = new Date();
    const ms = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    this._timeout = setTimeout(() => this._scheduleNextFetch(), ms);
  }

  async _fetchData() {
    if (!this.hass || !this.config) return;

    const minutes = Math.max(1, Math.min(60, Number(this.minutes || 0)));
    const now = new Date();
    now.setSeconds(0, 0);
    const end = now.toISOString();
    const start = new Date(now.getTime() - minutes * 60000).toISOString();
    const ids = `${this.config.wind_entity},${this.config.gust_entity},${this.config.direction_entity}`;

    try {
      const hist = await this.hass.callApi(
        'GET',
        `history/period/${start}?end_time=${end}&filter_entity_id=${ids}&minimal_response`
      );

      const byId = {};
      for (const h of hist) {
        if (Array.isArray(h) && h[0]?.entity_id) byId[h[0].entity_id] = h;
      }
      const windHist = byId[this.config.wind_entity] ?? [];
      const gustHist = byId[this.config.gust_entity] ?? [];
      const dirHist  = byId[this.config.direction_entity] ?? [];

      this._noData = !windHist.length && !gustHist.length && !dirHist.length;

      const avgPerMinute = (entries) => {
        const map = {};
        for (const e of entries) {
          const ts = (e.last_changed || e.last_updated);
          const key = typeof ts === 'string' ? ts.slice(0, 16) : new Date(ts).toISOString().slice(0, 16);
          const val = parseFloat(e.state);
          if (!isFinite(val) || val < 0 || val > 100) continue;
          const bucket = (map[key] ||= { sum: 0, count: 0 });
          bucket.sum += val;
          bucket.count += 1;
        }
        return Object.keys(map).sort().map(k => ({ minute: k, avg: map[k].sum / map[k].count }));
      };

      const avgVectorPerMinute = (entries) => {
        const map = {};
        for (const e of entries) {
          const ts = (e.last_changed || e.last_updated);
          const key = typeof ts === 'string' ? ts.slice(0, 16) : new Date(ts).toISOString().slice(0, 16);
          const val = parseFloat(e.state);
          if (!isFinite(val)) continue;
          const rad = (val * Math.PI) / 180;
          const bucket = (map[key] ||= { x: 0, y: 0, count: 0 });
          bucket.x += Math.cos(rad);
          bucket.y += Math.sin(rad);
          bucket.count += 1;
        }
        return Object.keys(map).sort().map(k => {
          const d = map[k];
          const avgRad = Math.atan2(d.y / d.count, d.x / d.count);
          const deg = (avgRad * 180) / Math.PI;
          return { minute: k, avg: (deg + 360) % 360 };
        });
      };

      const windAvg = avgPerMinute(windHist);
      const gustAvg = avgPerMinute(gustHist);
      const dirAvg = avgVectorPerMinute(dirHist);

      const minuteMap = {};
      windAvg.forEach(({ minute, avg }) => { minuteMap[minute] = { ...minuteMap[minute], wind: avg }; });
      gustAvg.forEach(({ minute, avg }) => { minuteMap[minute] = { ...minuteMap[minute], gust: avg }; });
      dirAvg.forEach(({ minute, avg }) => { minuteMap[minute] = { ...minuteMap[minute], direction: avg }; });

      const data = [];
      for (let i = minutes - 1; i >= 0; i--) {
        const mTime = new Date(now.getTime() - i * 60000);
        const key = mTime.toISOString().slice(0, 16);

        const windRaw = minuteMap[key]?.wind;
        const gustRaw = minuteMap[key]?.gust ?? windRaw;
        const dirRaw = minuteMap[key]?.direction;

        if (!Number.isFinite(windRaw) || !Number.isFinite(gustRaw) || !Number.isFinite(dirRaw)) {
          continue;
        }

        const gustFinal = Math.min(60, Math.max(0, gustRaw));
        const windFinal = Math.min(60, Math.max(0, windRaw));
        const direction = dirRaw;

        data.push({ wind: windFinal, gust: gustFinal, direction, time: mTime });
      }

      const historyData = data.slice(-60);
      const noData = (!windHist.length && !gustHist.length && !dirHist.length) || historyData.length === 0;
      this._noData = noData;

      if (noData) {
        this._historyData = historyData;
        this._lastUpdated = new Date();
        return;
      }

      this._historyData = historyData;
      this._lastUpdated = new Date();
    } catch (err) {
      this._historyData = [];
      this._noData = true;
      console.error('Failed to fetch wind data', err);
    }
  }

  _renderRadialHistory(now, currentMinute) {
    if (!this.show_radialgraph || !Array.isArray(this._historyData)) return null;
    const minuteData = this._buildMinuteDataMap(now);
    const outerR = this.tickPath_radius;
    const maxSpan = Math.max(4, Math.min(18, outerR - 16));
    const minSpan = 1.5;
    const windScale = Math.max(...this._historyData.map(d => {
      const w = Number.isFinite(d.wind) ? d.wind : 0;
      const g = Number.isFinite(d.gust) ? d.gust : w;
      return Math.max(w, g);
    }), 1);
    const scale = this.autoscale ? windScale : 60;
    const center = { x: 50, y: 50 };

    const slots = this._buildMinuteSlots(now);
    const speedAnchors = slots.filter(s => s.minute % 5 === 0);
    const speedTicks = this._renderSpeedScale(outerR, minSpan, maxSpan, scale, speedAnchors);

    return svg`<g class="history-radial">
      ${repeat(slots, (slot) => slot.minute, (slot, idx) => {
        const d = minuteData[slot.minute];
        const angle = slot.angle;
        const isCurrent = slot.minute === currentMinute;
        const liveWind = Number.isFinite(this.windSpeed) ? this.windSpeed : null;
        const liveGust = Number.isFinite(this.gust) ? this.gust : null;
        const baseWind = Number.isFinite(d?.wind) ? d.wind : 0;
        const baseGust = Number.isFinite(d?.gust) ? d.gust : baseWind;
        const windVal = isCurrent && liveWind !== null ? liveWind : baseWind;
        const gustVal = isCurrent && (liveGust !== null || liveWind !== null)
          ? (liveGust ?? liveWind ?? baseGust)
          : baseGust;
        const windFactor = Math.min(1, Math.max(0, windVal / (scale || 1)));
        const gustFactor = Math.min(1, Math.max(0, gustVal / (scale || 1)));
        const windSpan = minSpan + windFactor * (maxSpan - minSpan);
        const gustSpan = minSpan + gustFactor * (maxSpan - minSpan);
        const windDash = windVal > 0 ? windSpan : 0;
        const gustDash = gustVal > 0 ? gustSpan : 0;
        const start = this._polarToCartesian(50, 50, outerR, angle);
        const colorWind = this._speedToColor(windVal);
        const colorGust = this._addAlpha(this._speedToColor(gustVal), 1.0);
        const delay = (slots.length - 1 - idx) * 0.025;
        const ageFromOldest = idx; // 0 is oldest, 59 is newest
        const fadeTable = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        const opacity = ageFromOldest < fadeTable.length ? fadeTable[ageFromOldest] : 1;
        return svg`<g
          class="history-minute ${isCurrent ? 'current' : ''}"
          id="history-minute-${slot.minute}"
        >
          <line
            class="history-line-track"
            data-minute="${slot.minute}"
            x1="${start.x}" y1="${start.y}"
            x2="${center.x}" y2="${center.y}"
          ></line>
          <line
            class="history-line-dash gust"
            data-minute="${slot.minute}"
            x1="${start.x}" y1="${start.y}"
            x2="${center.x}" y2="${center.y}"
            stroke="${colorGust}"
            style="--dash:${gustDash.toFixed(2)};--dash-gap:100;--dash-offset:0;--dash-delay:${delay + 0.5}s;opacity:${opacity};"
          ></line>
          <line
            class="history-line-dash wind"
            data-minute="${slot.minute}"
            x1="${start.x}" y1="${start.y}"
            x2="${center.x}" y2="${center.y}"
            stroke="${colorWind}"
            style="--dash:${windDash.toFixed(2)};--dash-gap:100;--dash-offset:0;--dash-delay:${delay}s;opacity:${opacity};"
          ></line>
        </g>`;
      })}
      ${speedTicks}
    </g>`;
  }

  render() {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const minuteData = this._buildMinuteDataMap(now);
    const activeMinute = Number.isInteger(this._hoverMinute) ? this._hoverMinute : currentMinute;
    const activeValues = this._getMinuteValues(activeMinute, minuteData, currentMinute);
    const dirText = this._directionToText(activeValues.direction ?? this.direction);
    const tickPath_radius = this.tickPath_radius;
    const tick_length_major = this.tickPath_width;
    const tick_length_minor = this.tickPath_width / 2;
    const cardinal_offset = this.cardinal_offset;
    const majorPath = this._buildTickPath(tickPath_radius, tick_length_major, 30, [0, 90, 180, 270]);
    const minorPath = this._buildTickPath(tickPath_radius, tick_length_minor, 6, [355,0,5,85,90,95,175,180,185,265,270,275]);
    const windColor = this._speedToColor(activeValues.wind ?? this.windSpeed);
    const gustColor = this._addAlpha(this._speedToColor(activeValues.gust ?? this.gust), 0.5);
    const historyLayer = this._renderRadialHistory(now, currentMinute);

    return html`
      <ha-card>
        <div class="container" style="width:100%; height:${this.size}px;">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            focusable="false"
            role="img"
            aria-hidden="true"
            @pointerenter=${this._handleMinutePointer}
            @pointermove=${this._handleMinutePointer}
            @pointerleave=${this._clearHover}
          >
            ${historyLayer}
            <g class="ring">
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 - tickPath_radius + cardinal_offset}" font-size="11">N</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 + tickPath_radius - cardinal_offset}" y="50" font-size="11">E</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 + tickPath_radius - cardinal_offset}" font-size="11">S</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 - tickPath_radius + cardinal_offset}" y="50" font-size="11">W</text>
              <path class="compass minor" stroke-width="0.5" fill="none" stroke="var(--secondary-text-color, #727272)" stroke-linecap="butt" stroke-opacity="1" d="${minorPath}"></path>
              <path class="compass major" stroke-width="1.4" fill="none" stroke="var(--primary-text-color, #212121)" stroke-linecap="butt" stroke-opacity="1" d="${majorPath}"></path>
            </g>
            <g class="indicators">
              <path class="compass marker" stroke="var(--card-background-color, white)" stroke-linejoin="bevel" d="m 50,${tickPath_radius + 42} l 5,3 l -5,-12 l -5,12 z" fill="var(--primary-text-color, #212121)" stroke-width="0" style="transform: rotate(${(activeValues.direction ?? this.direction) + 180}deg);"></path>
            </g>
            <g class="info">
              <text class="direction" x="50" y="34">${dirText}</text>
              <text class="speed" x="50" y="50" fill="${windColor}">${(activeValues.wind ?? this.windSpeed).toFixed(1)}</text>
              <text class="gust" x="50" y="66" fill="${gustColor}">${(activeValues.gust ?? this.gust).toFixed(1)} kn</text>
            </g>
          </svg>
          ${this._noData ? html`<div class="no-data">No data available</div>` : ''}
        </div>
        ${!this._noData ? html`
          <div class="footer">Updated: ${this._lastUpdated?.toLocaleTimeString()}</div>
        ` : ''}
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .container {
      position: relative;
      display: flex;
      align-items: end;
      margin: auto;
      width: 100%;
      height: 100%;
    }
    svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0; left: 0;
      z-index: 2;
      pointer-events: auto;
    }
    .info text {
      fill: var(--primary-text-color, #212121);
      font-family: var(--ha-card-font-family, var(--paper-font-body1_-_font-family));
      text-anchor: middle;
      dominant-baseline: central;
    }
    .info .direction,
    .info .gust {
      font-size: 8px;
    }
    .info .speed {
      font-size: 24px;
      font-weight: 800;
    }
    .marker {
      transition: transform 1s ease-in-out, fill 1s ease-in-out;
      transform-origin: 50% 50%;
      transform-box: view-box;
    }
    .ring text {
      fill: var(--primary-text-color, #212121);
      font-weight: bold;
    }
    text {
      fill: var(--primary-text-color, #212121);
    }
    .history-radial {
      pointer-events: auto;
    }
    .history-minute {
    }
    .history-line-track {
      stroke: var(--secondary-text-color, #727272);
      stroke-width: 0.6;
      stroke-linecap: round;
      stroke-opacity: 0;
      transition: stroke-opacity 0.4s ease-in-out;
    }
    .history-line-dash {
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: var(--dash, 0) var(--dash-gap, 100);
      stroke-dashoffset: var(--dash-offset, 0);
      transition: stroke-dasharray 0.6s ease-in-out, stroke-dashoffset 0.6s ease-in-out, stroke 0.3s ease-in-out;
    }
    .history-line-dash.wind{
      filter: drop-shadow(0 0 0.5px var(--primary-text-color, #212121));
    }
    .history-minute.current .history-line-track {
      stroke-opacity: 0;
    }
    .history-minute.current .history-line-dash {

    }
    .speed-ticks {
      pointer-events: none;
    }
    .speed-ticks line {
      stroke: var(--primary-text-color, #212121);
      stroke-width: 1.4;
      stroke-linecap: but;
      opacity: 1.0;
    }
    .footer {
      text-align: right;
      font-size: 9px;
      font-weight: 400;
      padding: 4px 12px;
      color: var(--secondary-text-color);
    }
    .no-data {
      padding: 16px;
      text-align: center;
    }
  `;
}

customElements.define('wind-card', WindCard);
