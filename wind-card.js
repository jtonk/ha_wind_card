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
      dateTime: { type: String },
      isLive: { type: Boolean },
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
    this.dateTime = '';
    this.isLive = false;
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

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: Arial, sans-serif;
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
        transform: rotate(-90deg);
      }
      .center-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }
      .date {
        position: absolute;
        bottom: 4px;
        right: 4px;
        font-size: 0.7em;
      }
      .arrow {
        transform-origin: 50% 50%;
        transition: transform 1s linear;
      }
    `;
  }

  render() {
    const maxSpeed = 60; // knots
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const speedOffset = circumference * (1 - Math.min(this.windSpeed, maxSpeed) / maxSpeed);
    const gustOffset = circumference * (1 - Math.min(this.gust, maxSpeed) / maxSpeed);
    return html`
      <div class="container">
        <svg viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#eee"
            stroke-width="10"
          ></circle>
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#0af"
            stroke-width="10"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${speedOffset}"
            style="transition: stroke-dashoffset 1s linear;"
          ></circle>
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#f80"
            stroke-width="4"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${gustOffset}"
            style="transition: stroke-dashoffset 1s linear;"
          ></circle>
          <g class="arrow" transform="rotate(${this.direction} 100 100)">
            <polygon points="100,40 94,70 106,70" fill="#333"></polygon>
            <line x1="100" y1="70" x2="100" y2="140" stroke="#333" stroke-width="4"></line>
          </g>
        </svg>
        <div class="center-text">
          <div style="font-size: 2em; font-weight: bold;">${this.windSpeed} kn</div>
          <div style="font-size: 1em;">gust ${this.gust} kn</div>
        </div>
        <div class="date">${this.dateTime} ${this.isLive ? '(live)' : ''}</div>
      </div>
    `;
  }
}

customElements.define('wind-card', WindCard);

