# Wind Card

Wind Card is a [Home Assistant](https://www.home-assistant.io/) custom card for visualising wind data. The card animates direction, speed and gust values provided by an entity.

## Features
- Displays current wind speed and gusts in knots
- Animated direction arrow with radial wind speed and gust history
- Wind rose with N/E/S/W indicators and tick marks
- Cycles through arrays of `direction`, `speed` and `gusts` exposed in an entity's `data` attribute
- Hovering over the radial history graph displays that entry's values on the gauge
- Touch support to view values by sliding across the radial history graph
- Automatically zeros the gauge when the configured wind, gust and direction sensors are older than a minute

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
entity: sensor.my_wind            # entity with direction, speed and gusts arrays
wind_entity: sensor.wind_speed    # numeric wind speed entity used for history data
gust_entity: sensor.wind_gust
direction_entity: sensor.wind_direction
size: 250
cardinal_offset: 4
tickPath_radius: 38
tickPath_width: 4
minutes: 30
show_radialgraph: true
autoscale: true
```

The `entity` must expose arrays at `attributes.data.direction`, `attributes.data.speed` and `attributes.data.gusts`. The card cycles through those arrays once per second for the animated gauge.

The `wind_entity`, `gust_entity` and `direction_entity` values are required numeric sensor entities. They are used for the radial history graph and to decide whether live data is fresh enough to display.

Optional settings:

| Option | Default | Description |
| --- | --- | --- |
| `size` | `200` | Card height in pixels. |
| `cardinal_offset` | `4` | Offset for the N/E/S/W labels. |
| `tickPath_radius` | `38` | Radius for the compass tick marks and radial history graph. |
| `tickPath_width` | `4` | Length of the major tick marks. Minor tick marks use half this value. |
| `minutes` | `60` | Number of history minutes to fetch, clamped from `1` to `60`. |
| `show_radialgraph` | `true` | Shows or hides the radial history graph. |
| `autoscale` | `true` | Scales radial history bars to recent data when enabled. |

If `autoscale` is `true`, the radial history graph maps the smallest positive wind speed to the minimum visible bar and the maximum gust value to the full bar length. If `autoscale` is `false`, values are scaled against 60 knots.
Set `show_radialgraph` to `false` to hide the radial history graph entirely. `show_graph: false` is also supported as a compatibility alias.
