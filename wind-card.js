// Wind card custom element
import { LitElement, html, css } from 'https://unpkg.com/lit-element/lit-element.js?module';

class WindCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      windSpeed: { type: Number },
      gust: { type: Number },
      direction: { type: Number },
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
    if (!config.entity) {
      throw new Error('Entity is required');
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._updateFromEntity();
  }

  get hass() {
    return this._hass;
  }

  _updateFromEntity() {
    if (!this._hass || !this.config) return;
    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj || !stateObj.attributes || !stateObj.attributes.data) return;
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

  static get styles() {
    return css`
      :host {
        display: block;
      }
      .container {
        position: relative;
        width: 200px;
        height: 200px;
        margin: auto;
      }
      svg {
        width: 100%;
        height: 100%;
      }
      .info {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-family: var(--ha-card-font-family, var(--paper-font-body1_-_font-family));
        color: var(--primary-text-color, #212121);
      }
      .info .direction,
      .info .gust {
        font-size: 0.75em;
      }
      .info .speed {
        font-size: 3.5em;
        font-weight: 800;
        line-height: 1;
      }
      .compass {
        transition: transform 1s linear;
        -webkit-transition: -webkit-transform 1s linear;
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
    const minorPath = this._buildTickPath(42, 1.5, 5, [355,0,5,85,90,95,175,180,185,265,270,275]);

    const maxSpeed = 60;
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const speedOffset = circumference * (1 - Math.min(this.windSpeed, maxSpeed) / maxSpeed);
    const gustOffset = circumference * (1 - Math.min(this.gust, maxSpeed) / maxSpeed);

    return html`
      <div class="container">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false" role="img" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="${radius}"
            fill="none"
            stroke="var(--divider-color, #eee)"
            stroke-width="4"
            opacity="0"
          ></circle>
          <circle
            cx="50"
            cy="50"
            r="${radius}"
            fill="none"
            stroke="var(--primary-text-color, #212121)"
            stroke-width="4"
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
            stroke-width="4"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${gustOffset}"
            style="transition: stroke-dashoffset 1s linear;"
            transform="rotate(-90 50 50)"
            opacity="0.6"
          ></circle>
          <g class="ring">
            <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="96" font-size="11">S</text>
            <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="4" y="50" font-size="11">W</text>
            <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="50" y="4" font-size="11">N</text>
            <text class="compass cardinal" text-anchor="middle" alignment-baseline="central" x="96" y="50" font-size="11">E</text>
            <path class="compass major" stroke-width="1.4" fill="none" stroke="var(--primary-text-color, #212121)" stroke-linecap="round" stroke-opacity="1" d="${majorPath}"></path>
            <path class="compass minor" stroke-width="0.8" fill="none" stroke="var(--secondary-text-color, #727272)" stroke-linecap="round" stroke-opacity="1" d="${minorPath}"></path>
          </g>
          <g class="indicators">
            <g class="marker compass" transform="rotate(${this.direction + 180},50,50)">
              <path stroke="var(--card-background-color, white)" stroke-linejoin="bevel" d="M 50 97 l 9 -15 l -9 3 l -9 -3 Z" fill="rgb(68,115,158)" stroke-width="0" transform="rotate(180 50 90)"></path>
            </g>
          </g>
        
        </svg>
        <div class="info">
          <div class="direction">${dirText}</div>
          <div class="speed">${this.windSpeed.toFixed(1)}</div>
          <div class="gust">${this.gust.toFixed(1)} kn</div>
        </div>
      </div>
    `;
  }
}

customElements.define('wind-card', WindCard);
