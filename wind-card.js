// Wind card custom element
import { LitElement, html, css } from 'https://unpkg.com/lit-element/lit-element.js?module';

class WindCard extends LitElement {
  static get properties() {
    return {
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
    this._fetchData();
    this._fetchInterval = setInterval(() => this._fetchData(), 15000);
    this._animInterval = setInterval(() => this._animateFromTimeline(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._fetchInterval);
    clearInterval(this._animInterval);
  }

  async _fetchData() {
    try {
      const res = await fetch('https://www.ksnoordwijkwind.nl/currentwind');
      const data = await res.json();
      this.windSpeed = data.windKn ?? data.wind ?? 0;
      this.gust = data.gustKn ?? data.vlagen ?? 0;
      this.direction = data.windDir ?? data.richting ?? data.direction ?? 0;
      this.dateTime = data.dateTime;
      this.isLive = data.isLive;
      this._timeline = data.timeLineLast15sec || [];
      this._timelineIndex = 0;
    } catch (e) {
      // ignore fetch errors
      console.error(e);
    }
  }

  _animateFromTimeline() {
    if (!this._timeline || this._timeline.length === 0) return;
    const frame = this._timeline[this._timelineIndex];
    if (frame) {
      this.windSpeed = frame.windKn ?? frame.wind ?? this.windSpeed;
      this.gust = frame.gustKn ?? frame.vlagen ?? this.gust;
      this.direction =
        frame.windDir ?? frame.richting ?? frame.direction ?? this.direction;
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

