import { LitElement, html, css } from 'https://unpkg.com/lit-element/lit-element.js?module';

// Color scale used for wind and gust speeds.  This mirrors the palette used
// in the jtonk/ha_wind_stat_card project so the gauge transitions through a
// spectrum as speeds increase.
const wsColors = [
  '#9700ff', '#6400ff', '#3200ff', '#0032ff', '#0064ff', '#0096ff', '#00c7ff',
  '#00e6f0', '#25c192', '#11d411', '#00e600', '#00fa00', '#b8ff61', '#fffe00',
  '#ffe100', '#ffc800', '#ffaf00', '#ff9600', '#e67d00', '#e66400', '#dc4a1d',
  '#c8321d', '#b4191d', '#aa001d', '#b40032', '#c80064', '#fe0096'
];

class WindCard extends LitElement {
  static get properties() {
    return {
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
      _timelineIndex: { type: Number }
    };
  }

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
  }

  connectedCallback() {
    super.connectedCallback();
    this._animInterval = setInterval(() => this._animateFromTimeline(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._animInterval);
  }

  setConfig(config) {
    if (!config.entity) throw new Error('Entity is required');
    this.config = config;
    this.size = Number(config.size || 200);
    this.gauge_radius = Number(config.gauge_radius || 40);
    this.gauge_width = Number(config.gauge_width || 2);
    this.cardinal_offset = Number(config.cardinal_offset || 4);
    this.tickPath_radius = Number(config.tickPath_radius || 38);
    this.tickPath_width = Number(config.tickPath_width || 4);
    this.units_offset = Number(config.units_offset || 4);
  }

  set hass(hass) {
    this._hass = hass;
    this._updateFromEntity();
  }

  get hass() {
    return this._hass;
  }

  updated() {
    // Force repaint of SVG <text> nodes to fix Lit rendering bug
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

  _polarToCartesian(cx, cy, r, angleDeg) {
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  }

  _directionToText(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
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


  static get styles() {
    return css`
      :host {
        display: block;
      }
      .container {
        position: relative;
        margin: auto;
      }
      svg {
        width: 100%;
        height: 100%;
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
    `;
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
    const minorPath = this._buildTickPath(tickPath_radius, tick_length_minor, 5, [355, 0, 5, 85, 90, 95, 175, 180, 185, 265, 270, 275]);
    const circumference = 2 * Math.PI * radius;
    const speedOffset = circumference * (1 - Math.min(this.windSpeed, maxSpeed) / maxSpeed);
    const gustOffset = circumference * (1 - Math.min(this.gust, maxSpeed) / maxSpeed);
    const windColor = this._speedToColor(this.windSpeed);
    const gustColor = this._addAlpha(this._speedToColor(this.gust), 0.5);

    return html`
      <ha-card>
        <div class="container" style="width:${this.size}px; height:${this.size}px;">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false" role="img" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="${radius}"
              fill="none"
              stroke="${gustColor}"
              stroke-width="${this.gauge_width}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${gustOffset}"
              style="transition: stroke-dashoffset 1s ease-in-out, stroke 1s ease-in-out;"
              transform="rotate(-90 50 50)"
              opacity="1"
            ></circle>
            <circle
              cx="50"
              cy="50"
              r="${radius}"
              fill="none"
              stroke="${windColor}"
              stroke-width="${this.gauge_width}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${speedOffset}"
              style="transition: stroke-dashoffset 1s ease-in-out, stroke 1s ease-in-out;"
              transform="rotate(-90 50 50)"
              opacity="1"
            ></circle>


            <g class="ring">
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 - tickPath_radius + cardinal_offset}" font-size="11">N</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 + tickPath_radius - cardinal_offset}" y="50" font-size="11">E</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="${50 + tickPath_radius - cardinal_offset}" font-size="11">S</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="${50 - tickPath_radius + cardinal_offset}" y="50" font-size="11">W</text>              
              <path class="compass minor" stroke-width="0.5" fill="none" stroke="var(--secondary-text-color, #727272)" stroke-linecap="round" stroke-opacity="1" d="${minorPath}"></path>
              <path class="compass major" stroke-width="1.4" fill="none" stroke="var(--primary-text-color, #212121)" stroke-linecap="round" stroke-opacity="1" d="${majorPath}"></path>
            </g>


            <g class="unit-labels">
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 5 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 5 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >5</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 10 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 10 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >10</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 15 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 15 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >15</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 20 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 20 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >20</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 25 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 25 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >25</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 30 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 30 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >30</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 35 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 35 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >35</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 40 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 40 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >40</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 45 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 45 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >45</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 50 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 50 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >50</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 55 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 55 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >55</text>
              <text
                x="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 60 * 6).x}"
                y="${this._polarToCartesian(50, 50, tickPath_radius + this.units_offset, 60 * 6).y}"
                font-size="4"
                text-anchor="middle"
                dominant-baseline="middle"
                
              >60</text>
            </g>

            <g class="indicators">
              <path class="compass marker" stroke="var(--card-background-color, white)" stroke-linejoin="bevel"
                d="m 50,${tickPath_radius + 46} l 5,3 l -5,-12 l -5,12 z"
                fill="${windColor}" stroke-width="0"
                style="transform: rotate(${this.direction + 180}deg);">
              </path>
            </g>

            <g class="info">
              <text class="direction" x="50" y="34">${dirText}</text>
              <text class="speed" x="50" y="50" fill="${windColor}">${this.windSpeed.toFixed(1)}</text>
              <text class="gust" x="50" y="66" fill="${gustColor}">${this.gust.toFixed(1)} kn</text>
            </g>
          </svg>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('wind-card', WindCard);
