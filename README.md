# IC50 Cell Viability Platform

Web application for analyzing Tecan Spark MTT plate-reader exports: compute cell viability, fit 4-parameter logistic dose-response curves, estimate IC50 ± SE, and create publication-style overlay plots.

## Features

- Upload Tecan Spark `.xlsx` exports (raw absorbance at 550 nm)
- Auto-detect compound blocks and replicate rows
- Configure molecular weight, dilution series (default: 50 mg/L start, 2-fold, 10 doses)
- Select which replicate rows to include; mean ± SD when multiple rows selected
- Exclude individual dose points from fit and plot
- Overlay multiple compounds on one log-scale dose-response graph
- Customize colors, markers, axis titles, and legend
- Export PNG, SVG, and CSV

## Calculations

| Step | Formula |
|------|---------|
| µM conversion | `µM = (mg/L × 1000) / Mw` |
| Blank correction | `OD_corr = OD_sample − OD_blank` |
| Cell viability | `(OD_corr_sample / OD_corr_control) × 100` |
| IC50 | 4PL fit with bootstrap standard error |

## Local development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend.

### Run tests

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

## Docker (production-like)

```bash
docker build -t ic50-app .
docker run -p 8000:8000 ic50-app
```

Open http://localhost:8000

## Deploy to Render

1. Push this repository to GitHub.
2. In [Render](https://render.com), create a **New Blueprint** or **Web Service**.
3. Connect the GitHub repo; Render reads [`render.yaml`](render.yaml) and builds via [`Dockerfile`](Dockerfile).
4. Deploy — the service exposes the API and React UI on one URL.
5. Share the Render URL with your colleague.

Free tier note: the service may sleep after inactivity (~30 s cold start on wake).

## Project structure

```
backend/app/
  main.py           FastAPI routes + static file serving
  parsers/spark.py  Spark xlsx parser
  calc/             viability, dilution, IC50 fitting
frontend/src/
  components/       upload, config, data table, plot
```

## Input file format

Expects Tecan Spark MTT export with:
- Well layout section (RF/SM/BL labels in columns B–M)
- Absorbance grid for plate rows B–G
- Block 1: rows B–D (SM1–SM10), Block 2: rows E–G (SM11–SM20)
