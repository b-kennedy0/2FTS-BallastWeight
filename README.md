# 2FTS Ballast Weight App

Static GitHub Pages version of the ballast weight calculator lives in `index.html` with browser logic in `assets/app.js`.

Aircraft data is fetched from the live Google Sheet first, with a bundled fallback at `assets/aircraft_weights.csv` for hosts or browsers that block the cross-site Google download request.

The original Shiny prototype is still available in `app.R` for reference.
