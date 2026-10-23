# Frontend Editing Guide — F1 Strategy Lab

This guide is for changing the website UI while keeping the simulation engine working.

## Files to edit

- `templates/index.html` — page structure, text, section order, IDs, and script/style references.
- `static/style.css` — colours, spacing, typography, cards, responsive layout, buttons, and visual styling.
- `static/app.js` — form interactions, API calls, result rendering, pit-stop details, and the lap-time chart.
- `static/f1-car-hero.jpg` — hero image asset if you want to replace the visual.

## Files to avoid changing for visual-only work

- `app.py` — Flask server and API endpoints.
- `engine/*.m` — Octave simulation, tyre model, and strategy optimizer.
- `f1_strategy_lab.m` — standalone Octave entry point/reference.

Change the backend or engine only when you intentionally want to change simulation behaviour.

## Frontend/backend contract

- `GET /api/health` returns health information, including `octaveAvailable`.
- `POST /api/optimize` accepts JSON:
  `{"laps": 30, "pitLoss": 22, "requireTwoCompounds": true}`
- Successful responses include `success`, `nLaps`, `pitLoss`, `totalTime`, `averageLap`, `bestStrategy`, `lapTimes`, `tyreAges`, `fuelLoads`, `topStrategies`, and `candidatesEvaluated`.
- `bestStrategy.pitLaps` may be a number or an array depending on the response shape. The current `static/app.js` normalizes this to an array in both result rendering and chart rendering. Preserve that handling when editing those sections.
- Strategy tyre codes are `1 = Soft`, `2 = Medium`, `3 = Hard`.

If you rename an element ID in `templates/index.html`, update every matching `getElementById(...)` reference in `static/app.js`.

## Quick UI workflow

1. Start the app using the instructions in `README.md`.
2. Make one small change at a time.
3. Save the file and refresh the browser. Flask's static files may be cached; use a hard refresh if your changes don't appear.
4. Click **Optimize Strategy** and confirm the result card, stint display, comparison table, and chart still work.
5. Open the browser developer console if the page fails; record the first error before changing more code.

## Run locally

Install Python 3.10+ and GNU Octave. In a terminal opened in this folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000/`.

Do not include your local `.venv` folder in shared ZIPs. Each developer should create their own environment.
