import { useEffect, useMemo, useState } from "react";
import "./App.css";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";
const WATCHLIST_KEY = "cinematch-watchlist-v1";

function getPosterUrl(movie) {
  return movie?.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : "";
}

function getBackdropUrl(movie) {
  return movie?.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : getPosterUrl(movie);
}

function getReleaseYear(movie) {
  if (!movie?.release_date) return null;
  const year = String(movie.release_date).slice(0, 4);
  return /^\d{4}$/.test(year) ? Number(year) : null;
}

function getRating(movie) {
  const rating = Number(movie?.vote_average);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
}

function getGenres(movie) {
  if (Array.isArray(movie?.genres)) {
    return movie.genres.map((genre) => typeof genre === "string" ? genre : genre?.name).filter(Boolean);
  }
  if (typeof movie?.genres === "string") {
    return movie.genres.split(",").map((genre) => genre.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRecommendations(data, title) {
  if (!data) return [];
  let entries;
  if (Array.isArray(data)) {
    entries = data;
  } else {
    entries = data[title] ??
      data[title.toLowerCase()] ??
      Object.entries(data).find(([key]) => key.toLowerCase() === title.toLowerCase())?.[1];
  }
  if (!Array.isArray(entries)) return [];
  return entries.map((item) => {
    if (typeof item === "string") return { title: item, score: null };
    return {
      title: item?.title ?? item?.movie_title ?? item?.recommended_movie ?? item?.name ?? "",
      score: item?.score ?? item?.similarity_score ?? item?.similarity ?? item?.similarity_percentage ?? null,
    };
  }).filter((item) => item.title);
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") return null;
  const number = Number(score);
  if (!Number.isFinite(number)) return null;
  return `${(number >= 0 && number <= 1 ? number * 100 : number).toFixed(1)}%`;
}

function readWatchlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Poster({ movie, className = "", alt }) {
  const [failed, setFailed] = useState(false);
  const posterUrl = getPosterUrl(movie);
  useEffect(() => setFailed(false), [posterUrl]);

  if (!posterUrl || failed) {
    return <div className={`poster-placeholder ${className}`}><span aria-hidden="true">🎬</span><small>Poster unavailable</small></div>;
  }
  return <img className={className} src={posterUrl} alt={alt || `${movie?.title || "Movie"} poster`} loading="lazy" onError={() => setFailed(true)} />;
}

function Metadata({ movie }) {
  const year = getReleaseYear(movie);
  const rating = getRating(movie);
  return (
    <div className="metadata">
      {year && <span>{year}</span>}
      {rating && <span className="rating">★ {rating}<small>/10</small></span>}
    </div>
  );
}

function MovieCard({ movie, onOpen, isSaved, onToggleSaved, score, explanation, rank }) {
  return (
    <article className="movie-card">
      <button className="poster-action" type="button" onClick={() => onOpen(movie)} aria-label={`View details for ${movie.title}`}>
        <Poster movie={movie} className="movie-poster" />
        {rank && <span className="rank-badge">{String(rank).padStart(2, "0")}</span>}
        <span className="poster-hover">View details ↗</span>
      </button>
      <button className={`heart-button ${isSaved ? "saved" : ""}`} type="button" onClick={() => onToggleSaved(movie)} aria-label={isSaved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`} title={isSaved ? "Remove from watchlist" : "Add to watchlist"}>
        {isSaved ? "♥" : "♡"}
      </button>
      <div className="movie-card-content">
        <button className="movie-title-button" type="button" onClick={() => onOpen(movie)}>{movie.title}</button>
        <Metadata movie={movie} />
        {score && <div className="similarity-line"><span>Content similarity</span><strong>{score}</strong></div>}
        {explanation && <p className="card-explanation">{explanation}</p>}
      </div>
    </article>
  );
}

export default function App() {
  const [movies, setMovies] = useState([]);
  const [recommendationData, setRecommendationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState(readWatchlist);
  const [activeView, setActiveView] = useState("discover");
  const [genreFilter, setGenreFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [showAllMovies, setShowAllMovies] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [movieResponse, recommendationResponse] = await Promise.all([
          fetch("/movies.json"),
          fetch("/recommendations.json"),
        ]);
        if (!movieResponse.ok || !recommendationResponse.ok) {
          throw new Error("Could not load movie data. Check that movies.json and recommendations.json exist in frontend/public.");
        }
        const [movieData, recData] = await Promise.all([movieResponse.json(), recommendationResponse.json()]);
        if (!Array.isArray(movieData)) throw new Error("Movie data must be a JSON array.");
        if (!cancelled) {
          setMovies(movieData);
          setRecommendationData(recData);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "Unable to load CineMatch data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistIds)); } catch { /* private browsing/storage disabled */ }
  }, [watchlistIds]);

  const movieIndex = useMemo(() => {
    const index = new Map();
    movies.forEach((movie) => {
      if (movie?.title) index.set(movie.title.toLowerCase().trim(), movie);
    });
    return index;
  }, [movies]);

  const genres = useMemo(() => [...new Set(movies.flatMap(getGenres))].sort((a, b) => a.localeCompare(b)), [movies]);
  const years = useMemo(() => [...new Set(movies.map(getReleaseYear).filter(Boolean))].sort((a, b) => b - a), [movies]);
  const watchlistMovies = useMemo(() => watchlistIds.map((id) => movies.find((movie) => String(movie.id ?? movie.title) === String(id))).filter(Boolean), [watchlistIds, movies]);

  const searchSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (query.length < 2) return [];
    return movies.filter((movie) => movie.title?.toLowerCase().includes(query))
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        if (aTitle.startsWith(query) !== bTitle.startsWith(query)) return aTitle.startsWith(query) ? -1 : 1;
        return aTitle.localeCompare(bTitle);
      }).slice(0, 6);
  }, [searchText, movies]);

  const filteredMovies = useMemo(() => {
    let result = activeView === "watchlist" ? watchlistMovies : movies;
    result = result.filter((movie) => {
      const matchesGenre = genreFilter === "all" || getGenres(movie).includes(genreFilter);
      const year = getReleaseYear(movie);
      const matchesYear = yearFilter === "all" || year === Number(yearFilter);
      const matchesRating = Number(movie?.vote_average || 0) >= Number(ratingFilter);
      const query = searchText.trim().toLowerCase();
      const matchesSearch = activeView === "watchlist" || !query || movie.title?.toLowerCase().includes(query);
      return matchesGenre && matchesYear && matchesRating && matchesSearch;
    });
    result = [...result];
    if (sortBy === "rating") result.sort((a, b) => Number(b.vote_average || 0) - Number(a.vote_average || 0));
    else if (sortBy === "year") result.sort((a, b) => (getReleaseYear(b) || 0) - (getReleaseYear(a) || 0));
    else if (sortBy === "title") result.sort((a, b) => a.title.localeCompare(b.title));
    else result.sort((a, b) => Number(b.popularity || b.vote_count || 0) - Number(a.popularity || a.vote_count || 0));
    return result;
  }, [activeView, watchlistMovies, movies, genreFilter, yearFilter, ratingFilter, searchText, sortBy]);

  const featuredMovie = useMemo(() => {
    const known = movieIndex.get("interstellar") || movieIndex.get("inception") || movies[0];
    return known;
  }, [movieIndex, movies]);

  function toggleWatchlist(movie) {
    const key = String(movie.id ?? movie.title);
    setWatchlistIds((current) => current.includes(key) ? current.filter((id) => id !== key) : [...current, key]);
  }
  function isSaved(movie) {
    return watchlistIds.includes(String(movie.id ?? movie.title));
  }
  function clearWatchlist() {
    if (!watchlistMovies.length) return;
    const confirmed = window.confirm(`Clear all ${watchlistMovies.length} saved movie${watchlistMovies.length === 1 ? "" : "s"} from your watchlist? This cannot be undone.`);
    if (confirmed) setWatchlistIds([]);
  }
  function resetFilters() {
    setGenreFilter("all"); setYearFilter("all"); setRatingFilter(0); setSortBy("popular"); setSearchText(""); setShowAllMovies(false);
  }
  function goHome() {
    setActiveView("discover"); setSelectedMovie(null); setRecommendations([]); setSearchError(""); setSearchText(""); setSuggestionsOpen(true); resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openMovie(movie) {
    if (!movie) return;
    setSelectedMovie(movie);
    setSearchText(movie.title);
    setSearchError("");
    setSuggestionsOpen(false);
    const list = normalizeRecommendations(recommendationData, movie.title)
      .filter((item) => item.title.toLowerCase() !== movie.title.toLowerCase())
      .map((item) => ({ ...item, movie: movieIndex.get(item.title.toLowerCase().trim()) }))
      .filter((item) => item.movie);
    setRecommendations(list);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function submitSearch(event) {
    event.preventDefault();
    const query = searchText.trim().toLowerCase();
    if (!query) { setSearchError("Type a movie title to start discovering."); return; }
    const found = movieIndex.get(query) || searchSuggestions[0];
    if (!found) { setSearchError(`We couldn't find "${searchText.trim()}". Try another title.`); setSelectedMovie(null); return; }
    openMovie(found);
  }
  function recommendationExplanation(sourceMovie, targetMovie, score) {
    const sourceGenres = getGenres(sourceMovie);
    const targetGenres = getGenres(targetMovie);
    const shared = sourceGenres.filter((genre) => targetGenres.includes(genre));
    if (shared.length) return `Shares ${shared.slice(0, 2).join(" and ")} genre${shared.length > 1 ? "s" : ""} with ${sourceMovie.title}.`;
    if (score) return `Ranked by content-feature similarity to ${sourceMovie.title}; this is not a probability of enjoyment.`;
    return `Selected by the precomputed content-based recommendation list for ${sourceMovie.title}.`;
  }
  const featuredBackdrop = getBackdropUrl(featuredMovie);
  const detailGenres = getGenres(selectedMovie);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="CineMatch home">
          <span className="brand-mark">C</span><span>CINE<span className="brand-accent">MATCH</span></span>
        </button>
        <nav className="top-nav" aria-label="Main navigation">
          <button className={activeView === "discover" ? "nav-active" : ""} onClick={() => { setActiveView("discover"); setSelectedMovie(null); }}>Discover</button>
          <button className={activeView === "watchlist" ? "nav-active" : ""} onClick={() => { setActiveView("watchlist"); setSelectedMovie(null); setSearchText(""); }}>My Watchlist <span className="nav-count">{watchlistIds.length}</span></button>
        </nav>
        <span className="topbar-note"><span className="live-dot" /> AI-POWERED DISCOVERY</span>
      </header>

      {!selectedMovie && activeView === "discover" && (
        <section className="cinema-hero" style={featuredBackdrop ? { backgroundImage: `linear-gradient(90deg, #09090f 0%, rgba(9,9,15,.88) 36%, rgba(9,9,15,.35) 72%, #09090f 100%), linear-gradient(0deg,#09090f 0%,transparent 45%), url("${featuredBackdrop}")` } : undefined}>
          <div className="hero-content">
            <p className="eyebrow"><span className="live-dot" /> YOUR NEXT FAVORITE FILM IS HERE</p>
            <h1>Find your next<br /><span>movie obsession.</span></h1>
            <p className="hero-copy">Explore a collection of films and discover your next watch through content-based machine learning.</p>
            <div className="search-wrap">
              <form className="search-form" onSubmit={submitSearch}>
                <span className="search-symbol" aria-hidden="true">⌕</span>
                <input value={searchText} onChange={(event) => { setSearchText(event.target.value); setSuggestionsOpen(true); setSearchError(""); }} onFocus={() => setSuggestionsOpen(true)} placeholder="Search movies, e.g. Interstellar..." aria-label="Search movies" autoComplete="off" />
                {searchText && <button type="button" className="clear-search" onClick={() => { setSearchText(""); setSearchError(""); setSuggestionsOpen(false); }} aria-label="Clear search">×</button>}
                <button className="search-submit" type="submit">Discover <span>→</span></button>
              </form>
              {suggestionsOpen && searchText.trim().length >= 2 && searchSuggestions.length > 0 && !selectedMovie && (
                <div className="autocomplete">
                  {searchSuggestions.map((movie) => <button key={movie.id ?? movie.title} onClick={() => openMovie(movie)} type="button"><Poster movie={movie} className="suggestion-poster" /><span>{movie.title}<small>{getReleaseYear(movie) || "Year unavailable"}</small></span><b>↗</b></button>)}
                </div>
              )}
            </div>
            {searchError && <p className="search-error" role="alert">{searchError}</p>}
            <div className="hero-footnote"><span>✦ Content-based ML</span><span>•</span><span>4,803 movie dataset</span><span>•</span><span>Instant discovery</span></div>
          </div>
          <div className="hero-side-label">CURATED BY CINE<span>MATCH</span></div>
        </section>
      )}

      {selectedMovie ? (
        <main className="page-container detail-page">
          <button className="back-button" onClick={() => { setSelectedMovie(null); setSearchText(""); setSuggestionsOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>← Back to discovery</button>
          <section className="detail-hero">
            <div className="detail-poster"><Poster movie={selectedMovie} /></div>
            <div className="detail-copy">
              <p className="eyebrow">MOVIE PROFILE</p>
              <h1>{selectedMovie.title}</h1>
              <Metadata movie={selectedMovie} />
              <div className="genre-chips">{detailGenres.map((genre) => <span key={genre}>{genre}</span>)}</div>
              <p className="overview">{selectedMovie.overview || "No synopsis is available in the current dataset."}</p>
              <div className="detail-actions">
                <button className={`primary-action ${isSaved(selectedMovie) ? "is-saved" : ""}`} onClick={() => toggleWatchlist(selectedMovie)}>{isSaved(selectedMovie) ? "♥ Saved to watchlist" : "♡ Add to watchlist"}</button>
                <span className="detail-id">Dataset ID: {selectedMovie.id ?? "N/A"}</span>
              </div>
            </div>
          </section>
          <section className="section-block">
            <div className="section-heading"><div><p className="eyebrow">BECAUSE YOU EXPLORED</p><h2>More films like <em>{selectedMovie.title}</em></h2><p>Ranked by the project's precomputed content similarity.</p></div><span className="section-count">{recommendations.length} matches</span></div>
            {recommendations.length ? <div className="movie-grid">{recommendations.slice(0, 10).map((item, index) => <MovieCard key={`${item.title}-${index}`} movie={item.movie} onOpen={openMovie} isSaved={isSaved(item.movie)} onToggleSaved={toggleWatchlist} score={formatScore(item.score)} explanation={recommendationExplanation(selectedMovie, item.movie, formatScore(item.score))} rank={index + 1} />)}</div> : <div className="empty-state"><h3>No recommendation entries found</h3><p>This title may not have an entry in recommendations.json.</p></div>}
          </section>
        </main>
      ) : (
        <main className="page-container">
          {activeView === "watchlist" ? (
            <section className="section-block watchlist-page">
              <div className="section-heading watchlist-heading"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h1>My Watchlist</h1><p>Saved in this browser, so you can return to these films later.</p></div><div className="watchlist-heading-actions"><span className="section-count">{watchlistMovies.length} saved</span>{watchlistMovies.length > 0 && <button className="clear-watchlist-button" type="button" onClick={clearWatchlist}>Clear watchlist</button>}</div></div>
              {watchlistMovies.length ? <div className="movie-grid">{watchlistMovies.map((movie, index) => <MovieCard key={movie.id ?? movie.title} movie={movie} onOpen={openMovie} isSaved={isSaved(movie)} onToggleSaved={toggleWatchlist} rank={index + 1} />)}</div> : <div className="empty-state"><div className="empty-icon">♡</div><h3>Your watchlist is waiting</h3><p>Open any movie and save it to keep it here.</p><button className="primary-action" onClick={goHome}>Explore movies</button></div>}
            </section>
          ) : (
            <>
              <section className="section-block featured-strip">
                <div><p className="eyebrow">THE CINE MATCH COLLECTION</p><h2>Discover something unforgettable.</h2><p>Explore, filter, save, and find your next movie.</p></div>
                <div className="collection-stat"><strong>{movies.length.toLocaleString()}</strong><span>FILMS IN THE COLLECTION</span></div>
              </section>
              <section className="filter-panel" aria-label="Movie filters">
                <div className="filter-title"><div><p className="eyebrow">REFINE YOUR SEARCH</p><h2>Find your kind of movie</h2></div><button className="text-button" onClick={resetFilters}>Reset filters ↺</button></div>
                <div className="filters-grid">
                  <label>Genre<select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}><option value="all">All genres</option>{genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></label>
                  <label>Release year<select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">All years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                  <label>Minimum rating<select value={ratingFilter} onChange={(event) => setRatingFilter(Number(event.target.value))}><option value={0}>Any rating</option><option value={5}>5.0+</option><option value={6}>6.0+</option><option value={7}>7.0+</option><option value={8}>8.0+</option></select></label>
                  <label>Sort by<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="popular">Popularity (when available)</option><option value="rating">Highest rating</option><option value="year">Newest release</option><option value="title">Title A–Z</option></select></label>
                </div>
                <p className="filter-results">Showing <strong>{filteredMovies.length.toLocaleString()}</strong> matching films</p>
              </section>
              {loading && <div className="loading-state"><span className="spinner" /> Loading movie collection…</div>}
              {loadError && <div className="error-state" role="alert">{loadError}</div>}
              {!loading && !loadError && filteredMovies.length === 0 && <div className="empty-state"><h3>No movies match those filters</h3><p>Try changing the genre, year, rating or search term.</p><button className="primary-action" onClick={resetFilters}>Clear filters</button></div>}
              {!loading && !loadError && filteredMovies.length > 0 && <section className="section-block">
                <div className="movie-grid">{filteredMovies.slice(0, showAllMovies ? 100 : 20).map((movie, index) => <MovieCard key={movie.id ?? movie.title} movie={movie} onOpen={openMovie} isSaved={isSaved(movie)} onToggleSaved={toggleWatchlist} rank={index + 1} />)}</div>
                {filteredMovies.length > (showAllMovies ? 100 : 20) && <div className="load-more-wrap"><button className="secondary-action" onClick={() => setShowAllMovies(true)}>Load more movies ↓</button></div>}
                {showAllMovies && filteredMovies.length > 100 && <p className="results-note">Showing the first 100 matching movies for performance.</p>}
              </section>}
            </>
          )}
        </main>
      )}

      <footer className="site-footer"><button className="brand footer-brand" onClick={goHome}><span className="brand-mark">C</span><span>CINE<span className="brand-accent">MATCH</span></span></button><p>Built with content-based machine learning · TF-IDF + cosine similarity</p><span>Movie data and poster paths from TMDB dataset</span></footer>
    </div>
  );
}
