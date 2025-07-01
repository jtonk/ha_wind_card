# Wind Card

This repository provides a Home Assistant custom card for displaying wind data from [ksnoordwijkwind.nl](https://www.ksnoordwijkwind.nl/currentwind).

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
```

The card fetches new data every 15 seconds and animates wind speed, gusts and direction using the `timeLineLast15sec` data from the API.
It understands both the original `windKn`/`gustKn`/`windDir` fields and the alternative
`wind`/`vlagen`/`richting` names found in some responses.

