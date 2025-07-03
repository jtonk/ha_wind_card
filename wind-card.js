import { LitElement, html, css } from 'https://unpkg.com/lit-element/lit-element.js?module';

class WindCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      windSpeed: { type: Number },
      gust: { type: Number },
      direction: { type: Number },
      size: { type: Number },
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
      this.direction = frame.direction ?? this.direction;
    }
    this._timelineIndex = (this._timelineIndex + 1) % this._timeline.length;
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
    const i = Math.round(((deg % 360) / 22.5)) % 16;
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

  _buildUnitLabels(radius, offset) {
    const pos = (value) =>
      this._polarToCartesian(50, 50, radius + offset, value * 6);

    const p5 = pos(5);
    const p10 = pos(10);
    const p15 = pos(15);
    const p20 = pos(20);
    const p25 = pos(25);
    const p30 = pos(30);
    const p35 = pos(35);
    const p40 = pos(40);
    const p45 = pos(45);
    const p50 = pos(50);
    const p55 = pos(55);
    const p60 = pos(60);

    return html`
      <g class="unit-labels">
        <text
          x="${p5.x}"
          y="${p5.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >5</text>
        <text
          x="${p10.x}"
          y="${p10.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >10</text>
        <text
          x="${p15.x}"
          y="${p15.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >15</text>
        <text
          x="${p20.x}"
          y="${p20.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >20</text>
        <text
          x="${p25.x}"
          y="${p25.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >25</text>
        <text
          x="${p30.x}"
          y="${p30.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >30</text>
        <text
          x="${p35.x}"
          y="${p35.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >35</text>
        <text
          x="${p40.x}"
          y="${p40.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >40</text>
        <text
          x="${p45.x}"
          y="${p45.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >45</text>
        <text
          x="${p50.x}"
          y="${p50.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >50</text>
        <text
          x="${p55.x}"
          y="${p55.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >55</text>
        <text
          x="${p60.x}"
          y="${p60.y}"
          font-size="4"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black"
        >60</text>
      </g>
    `;
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
        transition: transform 1s linear;
      }
      .ring text {
        fill: var(--primary-text-color, #212121);
        font-weight: bold;
      }
    `;
  }

  render() {
    const dirText = this._directionToText(this.direction);
    const majorPath = this._buildTickPath(42, 3.5, 30, [0, 90, 180, 270]);
    const minorPath = this._buildTickPath(42, 1.5, 5, [355, 0, 5, 85, 90, 95, 175, 180, 185, 265, 270, 275]);
    const maxSpeed = 60;
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const speedOffset = circumference * (1 - Math.min(this.windSpeed, maxSpeed) / maxSpeed);
    const gustOffset = circumference * (1 - Math.min(this.gust, maxSpeed) / maxSpeed);

    return html`
      <ha-card>
        <div class="container" style="width:${this.size}px; height:${this.size}px;">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false" role="img" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="${radius}"
              fill="none"
              stroke="var(--primary-text-color, #212121)"
              stroke-width="2"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${speedOffset}"
              style="transition: stroke-dashoffset 1s linear;"
              transform="rotate(-90 50 50)"
            ></circle>
            <circle
              cx="50"
              cy="50"
              r="${radius}"
              fill="none"
              stroke="var(--primary-text-color, #212121)"
              stroke-width="2"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${gustOffset}"
              style="transition: stroke-dashoffset 1s linear;"
              transform="rotate(-90 50 50)"
              opacity="0.4"
            ></circle>

            <g class="ring">
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="89" font-size="11">S</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="12" y="50" font-size="11">W</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="12" font-size="11">N</text>
              <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="90" y="50" font-size="11">E</text>
              <path class="compass minor" stroke-width="0.5" fill="none" stroke="var(--secondary-text-color, #727272)" stroke-linecap="round" stroke-opacity="1" d="${minorPath}"></path>
              <path class="compass major" stroke-width="1.4" fill="none" stroke="var(--primary-text-color, #212121)" stroke-linecap="round" stroke-opacity="1" d="${majorPath}"></path>
            </g>

            ${this._buildUnitLabels(radius, 4)}

            <g class="indicators">
              <path class="compass marker" stroke="var(--card-background-color, white)" stroke-linejoin="bevel"
                d="M 50,86 55,88.91525 50,76.288132 45,88.91525 Z"
                fill="rgb(68,115,158)" stroke-width="0"
                transform="rotate(${this.direction + 180},50,50)">
              </path>
            </g>

            <g class="info">
              <text class="direction" x="50" y="34">${dirText}</text>
              <text class="speed" x="50" y="50">${this.windSpeed.toFixed(1)}</text>
              <text class="gust" x="50" y="66">${this.gust.toFixed(1)} kn</text>
            </g>
          </svg>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('wind-card', WindCard);
