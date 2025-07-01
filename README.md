# Wind Card

This repository provides a Home Assistant custom card for displaying wind data from [ksnoordwijkwind.nl](https://www.ksnoordwijkwind.nl/currentwind).

Place `wind-card.js` in your Home Assistant `www` directory and add it as a resource:

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

