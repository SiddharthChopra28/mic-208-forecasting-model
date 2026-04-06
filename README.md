# Forecasting Model for MIC-208 assignment.


React based web app for time-series forecasting using **SMA** and **EWMA**.

## Features
- Upload **CSV/XLSX** (20–30 rows)
- Validates time-series format:
  - 2 columns (Date/Time + Numeric Value)
  - Strictly increasing time column
- Two-page flow:
  - Upload & validation → Forecast view
- Methods:
  - **SMA (n slider)**
  - **EWMA (α slider)**
- Auto-updating forecast
- Output:
  - Final predicted value
  - Graph (data + forecast)

## Format Example
```csv
Date,Value
2026-01-01,120
2026-01-02,125
2026-01-03,123
```

## Try it out
[https://mic-208-forecasting-model.vercel.app/](https://mic-208-forecasting-model.vercel.app/)

## Run it locally
```bash
npm i
npm start
```
