# Wind Card

Wind Card is a [Home Assistant](https://www.home-assistant.io/) custom card for visualising wind data. The card animates direction, speed and gust values provided by an entity.

## Features
- Displays current wind speed and gusts in knots
- Animated direction arrow with radial speed and gust rings
- Wind rose with N/E/S/W indicators and tick marks
- Cycles through arrays of `direction`, `speed` and `gusts` exposed in an entity's `data` attribute

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
```
The optional parameters `size`, `gauge_radius`, `gauge_width`, `cardinal_offset`, `tickPath_radius`, `tickPath_width` and `units_offset` control the dimensions of the compass. If omitted their defaults are 200, 40, 2, 4, 38, 4 and 4 respectively.
The entity should have a `data` attribute with arrays named `direction`, `speed` and `gusts`. The card cycles through these values once per second.
