# Wind Card

Wind Card is a [Home Assistant](https://www.home-assistant.io/) custom card for visualising wind data. The card animates direction, speed and gust values provided by an entity.

## Features
- Displays current wind speed and gusts in knots
- Animated direction arrow with radial speed and gust rings
- Wind rose with N/E/S/W indicators and tick marks
- Cycles through arrays of `direction`, `speed` and `gusts` exposed in an entity's `data` attribute
- Hovering over the history bars displays that entry's values on the gauge

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
Add a card of type `custom:wind-card` and configure both the animated gauge and the history graph:
```yaml
type: custom:wind-card
entity: sensor.my_wind            # entity with arrays for the gauge
wind_entity: sensor.wind_speed    # entity used for history data
gust_entity: sensor.wind_gust
direction_entity: sensor.wind_direction
size: 250
gauge_radius: 40
gauge_width: 2
cardinal_offset: 4
tickPath_radius: 38
tickPath_width: 4
units_offset: 4
minutes: 30
graph_height: 100
show_graph: true
autoscale: true
multiplier: 1
```
The optional parameters `size`, `gauge_radius`, `gauge_width`, `cardinal_offset`, `tickPath_radius`, `tickPath_width` and `units_offset` control the dimensions of the compass. If omitted their defaults are 200, 40, 2, 4, 38, 4 and 4 respectively.
`minutes` controls how much history (in minutes) is displayed. `graph_height` sets the height of the bar chart. If `autoscale` is `true` the graph scales to the maximum gust value; otherwise values are scaled by `multiplier`.
Set `show_graph` to `false` to hide the bar chart entirely.
