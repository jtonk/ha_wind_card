# Wind Card

This repository provides a Home Assistant custom card for displaying wind data stored in a Home Assistant entity. The card reads arrays of `direction`, `speed` and `gusts` from the entity's `data` attribute and animates the values.

Place `wind-card.js` in your Home Assistant `www` directory or install it via HACS.
If you use [HACS](https://hacs.xyz/) copy this repository's URL in the "Custom repositories" section and select the "Plugin" category.
After installation add it as a resource:

```yaml
resources:
  - url: /local/wind-card.js
    type: module
```

Then use the card in your dashboard:

```yaml
type: custom:wind-card
entity: sensor.my_wind
```

The card updates whenever the entity state changes. The entity's `data` attribute should contain three arrays named `direction`, `speed` and `gusts` with the latest values.

