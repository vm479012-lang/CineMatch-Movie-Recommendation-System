# CineMatch — Movie Recommendation System

CineMatch is a movie-discovery web application backed by a content-based recommendation pipeline. It combines exported movie metadata and precomputed recommendations with a responsive React + Vite interface.

## Features

- Search with title autocomplete.
- Movie detail view with poster, release year, rating, overview and genres.
- Content-based recommendations loaded from `recommendations.json`.
- Similarity score display with a note explaining that a score is not a probability of enjoyment.
- Genre, release-year and minimum-rating filters.
- Sort by rating, release year, title, or popularity when the field is present.
- Browser-local watchlist stored in `localStorage`.
- Recommendation explanations based on shared genres where available.
- Offline evaluation script for catalog coverage, valid recommendation rate, self-matches, duplicates, and a clearly labelled genre-overlap proxy.

## Technology

- Python, pandas, scikit-learn (for the model/notebook workflow)
- TF-IDF vectorization and cosine similarity
- React, Vite, JavaScript and CSS
- JSON exports for static frontend delivery

## Project structure

```text
Movie_Recommendation_System/
├── data/                         # Original source datasets (check licensing before publishing)
├── frontend/
│   ├── public/
│   │   ├── movies.json
│   │   └── recommendations.json
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── ...
├── web_data/
│   ├── movies.json
│   └── recommendations.json
├── movie_recommendation.ipynb
├── evaluate_recommendations.py
├── requirements.txt
└── README.md
```

## Run the website locally

Requirements: a recent Node.js LTS release and npm.

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, commonly `http://localhost:5173/`.

The frontend reads `/movies.json` and `/recommendations.json` from `frontend/public/`. Keep those files in sync with the exported files in `web_data/` when you regenerate model outputs:

```powershell
Copy-Item ..\web_data\movies.json .\public\movies.json -Force
Copy-Item ..\web_data\recommendations.json .\public\recommendations.json -Force
```

## Run the Python environment and notebook

Create a virtual environment in the repository root and install the listed dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Then open `movie_recommendation.ipynb` in VS Code or Jupyter.

## Evaluate the exported recommendations

Run from the repository root:

```powershell
python evaluate_recommendations.py --k 10
```

The script reports coverage and data-quality checks. Genre overlap is a weak proxy only; it is not a ground-truth accuracy measure. A stronger offline evaluation needs human relevance labels or user interaction data.

## Important notes

- Watchlist items are saved in the current browser only. They do not sync between laptops or browsers.
- The static frontend uses the precomputed JSON files, so the recommendation UI does not require a live Python server.
- Do not commit `.env` files, API keys, access tokens, virtual environments, `node_modules`, or build output.
- Confirm the source dataset's license and redistribution terms before publishing the raw CSV files.
- TMDB-style poster paths are rendered using the image CDN. Images may be unavailable for some records or in case of network restrictions.
- The displayed similarity score is a content-feature similarity score, not a calibrated probability that someone will enjoy the recommended movie.
