# 🎬 CineMatch — Movie Recommendation System

**🚀 Live Demo:** [Try CineMatch Movie Recommendation System](https://cine-match-movie-recommendation-sys-eight.vercel.app/)

**💻 GitHub Repository:** [CineMatch on GitHub](https://github.com/vm479012-lang/CineMatch-Movie-Recommendation-System)

CineMatch is a movie-discovery web application powered by a content-based movie recommendation system. It combines exported movie metadata and precomputed recommendations with a responsive React and Vite interface.

Discover movies, explore their details, find similar titles, apply filters, and manage your personal watchlist.

## ✨ Features

- 🔎 Movie search with title autocomplete
- 🎞️ Movie details, posters, release year, rating, overview, and genres
- 🎯 Content-based recommendations loaded from `recommendations.json`
- 📊 Similarity scores with an explanation that they are not probabilities of enjoyment
- 🧩 Genre, release-year, and minimum-rating filters
- ↕️ Sorting by rating, release year, title, or popularity when available
- ❤️ Browser-local watchlist with add, remove, and clear options
- 💡 Recommendation explanations based on shared genres where available
- 📱 Responsive user interface

## 📸 Screenshots

### Home Page
![CineMatch Home Page](Screenshots/home.png)

### Movie Details and Recommendations
![Movie Details](Screenshots/movie-details.png)

### Personal Watchlist
![CineMatch Watchlist](Screenshots/watchlist.png)

## 🛠️ Technology

- **Machine learning:** Python, pandas, scikit-learn
- **Recommendation methods:** TF-IDF vectorization and cosine similarity
- **Frontend:** React, Vite, JavaScript, CSS
- **Data delivery:** JSON exports
- **Deployment:** Vercel
