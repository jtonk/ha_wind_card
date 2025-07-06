# Wind Card

Wind Card is a [Home Assistant](https://www.home-assistant.io/) custom card for visualising wind data. The card animates direction, speed and gust values provided by an entity.

## Features
- Displays current wind speed and gusts in knots
- Animated direction arrow with radial speed and gust rings
- Wind rose with N/E/S/W indicators and tick marks
- Cycles through arrays of `direction`, `speed` and `gusts` exposed in an entity's `data` attribute
- Configurable time span (default 10 minutes) that uses 1&nbsp;minute averaged values

## Installation
### With HACS
1. In HACS, add this repository as a custom repository under the **Plugin** category.
2. Install **Wind Card** from HACS.
3. After installation click **Add to Lovelace** so that HACS creates the resource entry:
   ```yaml
   url: /hacsfiles/wind-card/wind-card.js
   type: module
   ```
   If you skip this step you must add the resource manually.

### Manual
Copy `wind-card.js` into your `www` folder and reference it as a module resource:
```yaml
resources:
  - url: /local/wind-card.js
    type: module
```

## Using the Card
Add a card of type `custom:wind-card` and point it to an entity containing wind data:
```yaml
type: custom:wind-card
entity: sensor.my_wind
size: 250
gauge_radius: 40
gauge_width: 2
cardinal_offset: 4
tickPath_radius: 38
tickPath_width: 4
units_offset: 4
timespan: 10
```
The optional parameters `size`, `gauge_radius`, `gauge_width`, `cardinal_offset`, `tickPath_radius`, `tickPath_width`, `units_offset` and `timespan` control the dimensions of the compass and the length of the timeline. `timespan` is the number of minutes shown and defaults to `10`.
The entity should have a `data` attribute with arrays named `direction`, `speed` and `gusts`. Values are averaged in one‑minute blocks and the card cycles through these averages once per second.
