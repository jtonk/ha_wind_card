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
radius: 40
cardinal_offset: 4
radius_tickPath: 38
```
The optional parameters `size`, `radius`, `cardinal_offset` and `radius_tickPath` control the dimensions of the compass. If omitted their defaults are 200, 40, 4 and 38 respectively.
The entity should have a `data` attribute with arrays named `direction`, `speed` and `gusts`. The card cycles through these values once per second.
