import { LitElement, svg, html, css } from 'https://unpkg.com/lit?module';
import { repeat } from 'https://unpkg.com/lit/directives/repeat.js?module';

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
    gauge_radius: { type: Number },
    gauge_width: { type: Number },
    cardinal_offset: { type: Number },
    tickPath_radius: { type: Number },
    tickPath_width: { type: Number },
    units_offset: { type: Number },
    _timeline: { type: Array },
    _timelineIndex: { type: Number },
    _data: { state: true },
    _maxGust: { state: true },
    _lastUpdated: { state: true },
    _noData: { state: true },
    show_graph: { type: Boolean }
  };

  constructor() {
    super();
    this.hass = null;
    this.config = null;
    this.windSpeed = 0;
    this.gust = 0;
    this.direction = 0;
    this.size = 200;
    this.gauge_radius = 40;
    this.gauge_width = 2;
    this.cardinal_offset = 4;
    this.tickPath_radius = 38;
    this.tickPath_width = 4;
    this.units_offset = 4;
    this._timeline = [];
    this._timelineIndex = 0;

    this._data = [];
    this._maxGust = 0;
    this._lastUpdated = null;
    this._noData = false;
    this._initialLoad = true;
    this.show_graph = true;
    this._hoverData = null;
    this._dragging = false;
    this._boundPointerMove = this._onGlobalPointerMove.bind(this);
    this._boundPointerUp = this._onGlobalPointerUp.bind(this);
    // Memoized unit label positions
    this._unitPositions = null;
    this._unitKey = '';
    // Time display state (updates every second unless hovering)
    this._displayTime = new Date();
  }

  setConfig(config) {

    if (!config.wind_entity || !config.gust_entity || !config.direction_entity) {
      this._noData = true;
      this._error = 'wind_entity, gust_entity and direction_entity must be set';
    }
    this.config = config;
    this.size = Number(config.size || 200);
    this.gauge_radius = Number(config.gauge_radius || 40);
    this.gauge_width = Number(config.gauge_width || 2);
    this.cardinal_offset = Number(config.cardinal_offset || 4);
    this.tickPath_radius = Number(config.tickPath_radius || 38);
    this.tickPath_width = Number(config.tickPath_width || 4);
    this.units_offset = Number(config.units_offset || 4);
    this.minutes = Number(config.minutes || 30);
    this.graph_height = Number(config.graph_height || 100);
    this.autoscale = config.autoscale !== false;
    this.multiplier = 'multiplier' in config ? Number(config.multiplier) : 1;
    this.show_graph = config.show_graph !== false;
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
    if (this.show_graph) {
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
  }

  _animateFromTimeline() {
    if (!this._isDataLive()) {
      this.windSpeed = 0;
      this.gust = 0;
      this.direction = 0;
      if (!this._hoverData) {
        this._displayTime = new Date();
      }
      return;
    }
    if (this._hoverData) {
      const frame = this._hoverData;
      this.windSpeed = frame.wind ?? this.windSpeed;
      this.gust = frame.gust ?? this.gust;
      if (typeof frame.direction === 'number') {
        this.direction = this._shortestAngle(this.direction, frame.direction);
      }
      // When hovering, keep showing the hovered time
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
    // Update time display to current time when not hovering
    this._displayTime = new Date();
  }

  _shortestAngle(current, target) {
    if (typeof current !== 'number') return target;
    const diff = ((target - current + 540) % 360) - 180;
    return current + diff;
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
    if (!this.show_graph) return;
    // Clear any pending timer before scheduling a new one
    if (this._timeout) clearTimeout(this._timeout);
    this._fetchData();
    const now = new Date();
    const ms = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    this._timeout = setTimeout(() => this._scheduleNextFetch(), ms);
  }

  async _fetchData() {
    if (!this.hass || !this.config) return;

    const minutes = this.minutes;
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
      let max = 0;

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

        max = Math.max(max, Math.ceil(gustFinal / 5) * 5);
        data.push({ wind: windFinal, gust: gustFinal, direction, time: mTime });
      }

      if (this._initialLoad) {
        this._data = data.map(() => ({ wind: 0, gust: 0, direction: 0 }));
        this._maxGust = max;
        this._lastUpdated = new Date();
        await this.updateComplete;
        this._initialLoad = false;
      }

      await this._updateDataRolling(data);
      this._maxGust = max;
      this._lastUpdated = new Date();
    } catch (err) {
      this._data = [];
      this._maxGust = 0;
      this._noData = true;
      console.error('Failed to fetch wind data', err);
    }
  }


  async _updateDataRolling(newData) {
    if (!Array.isArray(newData)) return;
    const current = Array.isArray(this._data)
      ? [...this._data]
      : newData.map(() => ({ wind: 0, gust: 0, direction: 0 }));

    for (let i = newData.length - 1; i >= 0; i--) {
      current[i] = newData[i];
      this._data = [...current];
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
  }

  _onBarEnter(data) {
    this._hoverData = data;
    this.windSpeed = data.wind;
    this.gust = data.gust;
    this.direction = this._shortestAngle(this.direction, data.direction);
    if (data.time) {
      this._displayTime = new Date(data.time);
    }
  }

  _onBarLeave() {
    this._hoverData = null;
    this._animateFromTimeline();
  }

  _onBarDown(e) {
    e.preventDefault();
    if (e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const idx = parseInt(e.currentTarget.dataset.index);
    const data = this._data[idx];
    if (data) {
      this._onBarEnter(data);
    }
    this._dragging = true;
    window.addEventListener('pointermove', this._boundPointerMove);
    window.addEventListener('pointerup', this._boundPointerUp);
  }

  _onSegmentEnter(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const data = this._data[idx];
    if (data) {
      this._onBarEnter(data);
    }
  }

  _onGlobalPointerMove(e) {
    if (!this._dragging) return;
    const graph = this.renderRoot.querySelector('.graph');
    if (!graph) return;
    const target = this.renderRoot.elementFromPoint(e.clientX, e.clientY);
    const segment = target?.closest('.wind-bar-segment');
    if (segment && graph.contains(segment)) {
      const idx = parseInt(segment.dataset.index);
      const data = this._data[idx];
      if (data) {
        this._onBarEnter(data);
      }
    }
  }

  _onGlobalPointerUp() {
    this._dragging = false;
    window.removeEventListener('pointermove', this._boundPointerMove);
    window.removeEventListener('pointerup', this._boundPointerUp);
    this._onBarLeave();
  }


  // Memoized calculation of unit label positions
  _computeUnitPositions() {
    const key = `${this.tickPath_radius}|${this.units_offset}`;
    if (this._unitKey === key && Array.isArray(this._unitPositions)) {
      return this._unitPositions;
    }
    const values = [5,10,15,20,25,30,35,40,45,50,55,60];
    const positions = values.map(v => this._polarToCartesian(50, 50, this.tickPath_radius + this.units_offset, v * 6));
    this._unitKey = key;
    this._unitPositions = positions;
    return positions;
  }

  _renderBar({ wind, gust, direction }, index) {
    const auto = this.autoscale;
    const scale = this._maxGust || 1;
    const height = this.graph_height;
    const multiplier = this.multiplier ?? 1;
    const avail = Math.max(0, height - height / this.minutes);
    const windHeight = auto ? Math.round((wind / scale) * avail) : Math.round(wind * multiplier);
    const gustHeight = auto ? Math.max(0, Math.round(((gust - wind) / scale) * avail)) : Math.max(0, Math.round((gust - wind) * multiplier));
    const colorWind = this._speedToColor(wind);
    const colorGust = this._speedToColor(gust);
    return html`
      <div class="wind-bar-segment" data-index="${index}"
           @pointerdown=${(e) => this._onBarDown(e)}
           @pointerenter=${(e) => this._onSegmentEnter(e)}
           @pointermove=${(e) => this._onSegmentEnter(e)}
           @pointerleave=${() => this._onBarLeave()}>
        <div class="bar-container">
          <div class="date-wind-bar-segment" style="background:${colorWind};height:${windHeight}px;width:100%;"></div>
          ${gustHeight > 0 ? html`<div class="date-gust-bar-segment" style="background:${colorGust};height:1px;margin-bottom:${gustHeight}px;width:100%;"></div>` : null}
        </div>
      </div>`;
  }


  render() {
    const dirText = this._directionToText(this.direction);
    const maxSpeed = 60;
    const radius = this.gauge_radius;
    const tickPath_radius = this.tickPath_radius;
    const tick_length_major = this.tickPath_width;
    const tick_length_minor = this.tickPath_width / 2;
    const cardinal_offset = this.cardinal_offset;
    const majorPath = this._buildTickPath(tickPath_radius, tick_length_major, 30, [0, 90, 180, 270]);
    const minorPath = this._buildTickPath(tickPath_radius, tick_length_minor, 6, [355,0,5,85,90,95,175,180,185,265,270,275]);
    const circumference = 2 * Math.PI * radius;
    const speedOffset = circumference * (1 - Math.min(this.windSpeed, maxSpeed) / maxSpeed);
    const gustOffset = circumference * (1 - Math.min(this.gust, maxSpeed) / maxSpeed);
    const windColor = this._speedToColor(this.windSpeed);
    const gustColor = this._addAlpha(this._speedToColor(this.gust), 0.5);

    // Clock hands angles based on display time
    const t = this._displayTime instanceof Date ? this._displayTime : new Date();
    const hours = t.getHours();
    const minutes = t.getMinutes();
    const seconds = t.getSeconds();
    const minuteAngle = 6 * (minutes + seconds / 60);
    const hourAngle = 30 * ((hours % 12) + minutes / 60);

    return html`
      <ha-card>
        <div class="container" style="width:100%; height:${this.size}px;">
          ${this.show_graph && !this._noData ? html`
            <div class="graph graph-behind" style="height:${this.graph_height}px">
              ${repeat(this._data, (_d, index) => index, (d, index) => this._renderBar(d, index))}
            </div>
          ` : ''}
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false" role="img" aria-hidden="true">
            <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${gustColor}" stroke-width="${this.gauge_width}" stroke-dasharray="${circumference}" stroke-dashoffset="${gustOffset}" style="transition: stroke-dashoffset 1s ease-in-out, stroke 1s ease-in-out;" transform="rotate(-90 50 50)" opacity="1"></circle>
            <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${windColor}" stroke-width="${this.gauge_width}" stroke-dasharray="${circumference}" stroke-dashoffset="${speedOffset}" style="transition: stroke-dashoffset 1s ease-in-out, stroke 1s ease-in-out;" transform="rotate(-90 50 50)" opacity="1"></circle>
            <g class="ring">
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 - tickPath_radius + cardinal_offset}" font-size="11">N</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 + tickPath_radius - cardinal_offset}" y="50" font-size="11">E</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 + tickPath_radius - cardinal_offset}" font-size="11">S</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 - tickPath_radius + cardinal_offset}" y="50" font-size="11">W</text>
              <path class="compass minor" stroke-width="0.5" fill="none" stroke="var(--secondary-text-color, #727272)" stroke-linecap="butt" stroke-opacity="1" d="${minorPath}"></path>
              <path class="compass major" stroke-width="1.4" fill="none" stroke="var(--primary-text-color, #212121)" stroke-linecap="butt" stroke-opacity="1" d="${majorPath}"></path>
            </g>
            <g class="unit-labels">
              ${(() => {
                const values = [5,10,15,20,25,30,35,40,45,50,55,60];
                const pts = this._computeUnitPositions();
                return pts.map((p, i) => svg`<text x="${p.x}" y="${p.y}" font-size="4" text-anchor="middle" dominant-baseline="middle">${values[i]}</text>`);
              })()}
            </g>
            <!-- Analog clock hands -->
            <g class="clock">
              <line class="clock-hand hour" x1="50" y1="50" x2="50" y2="40" stroke-width="1.8"
                style="transform: rotate(${hourAngle}deg);"></line>
              <line class="clock-hand minute" x1="50" y1="50" x2="50" y2="36" stroke-width="1.2"
                style="transform: rotate(${minuteAngle}deg);"></line>
              <circle cx="50" cy="50" r="0.8" class="clock-center" />
            </g>
            <g class="indicators">
              <path class="compass marker" stroke="var(--card-background-color, white)" stroke-linejoin="bevel" d="m 50,${tickPath_radius + 42} l 5,3 l -5,-12 l -5,12 z" fill="var(--primary-text-color, #212121)" stroke-width="0" style="transform: rotate(${this.direction + 180}deg);"></path>
            </g>
            <g class="info">
              <text class="direction" x="50" y="34">${dirText}</text>
              <text class="speed" x="50" y="50" fill="${windColor}">${this.windSpeed.toFixed(1)}</text>
              <text class="gust" x="50" y="66" fill="${gustColor}">${this.gust.toFixed(1)} kn</text>
            </g>
          </svg>
          ${this.show_graph && this._noData ? html`<div class="no-data">${this._error || 'No data available'}</div>` : ''}
        </div>
        ${this.show_graph && !this._noData ? html`
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
      pointer-events: none;
    }
    .graph-behind {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      display: flex;
      align-items: end;
      gap: 1px;
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
    .clock-hand {
      stroke: var(--primary-text-color, #212121);
      stroke-linecap: round;
      transform-origin: 50% 50%;
      transform-box: view-box;
      opacity: 0.6;
      transition: transform 0.4s linear;
    }
    .clock-hand.minute { opacity: 0.7; }
    .clock-center { fill: var(--primary-text-color, #212121); opacity: 0.7; }
    .graph {
      display: flex;
      align-items: end;
      gap: 1px;
      position: relative;
      touch-action: none;
    }
    .overlay-lines {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1;
    }
    .wind-bar-segment {
      flex: 1 1 0%;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .bar-container {
      width: 100%;
      display: flex;
      flex-direction: column-reverse;
      align-items: stretch;
      transition: height 0.6s ease;
    }
    .date-wind-bar-segment,
    .date-gust-bar-segment {
      display: inline-block;
      transition: height 0.6s ease, margin-bottom 0.6s ease, background-color 0.6s ease;
      will-change: height, margin-bottom, background-color;
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
