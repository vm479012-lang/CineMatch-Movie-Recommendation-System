

import { useEffect, useMemo, useState } from "react";

import "./App.css";



const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";



function getPosterUrl(movie) {

  return movie?.poster_path

    ? `${IMAGE_BASE_URL}${movie.poster_path}`

    : "";

}



function getReleaseYear(movie) {

  if (!movie?.release_date) return null;



  const year = String(movie.release_date).slice(0, 4);

  return /^\d{4}$/.test(year) ? year : null;

}



function getRating(movie) {

  if (

    movie?.vote_average === null ||

    movie?.vote_average === undefined ||

    movie.vote_average === "" ||

    !Number.isFinite(Number(movie.vote_average)) ||

    Number(movie.vote_average) <= 0

  ) {

    return null;

  }



  return Number(movie.vote_average).toFixed(1);

}



function getGenres(movie) {

  if (Array.isArray(movie?.genres)) {

    return movie.genres

      .map((genre) =>

        typeof genre === "string" ? genre : genre?.name

      )

      .filter(Boolean);

  }



  if (typeof movie?.genres === "string") {

    return movie.genres

      .split(",")

      .map((genre) => genre.trim())

      .filter(Boolean);

  }



  return [];

}



function normalizeRecommendations(data, title) {

  if (!data) return [];



  let entries;



  if (Array.isArray(data)) {

    entries = data;

  } else {

    entries =

      data[title] ??

      data[title.toLowerCase()] ??

      Object.entries(data).find(

        ([key]) => key.toLowerCase() === title.toLowerCase()

      )?.[1];

  }



  if (!Array.isArray(entries)) return [];



  return entries

    .map((item) => {

      if (typeof item === "string") {

        return { title: item, score: null };

      }



      return {

        title:

          item?.title ??

          item?.movie_title ??

          item?.recommended_movie ??

          item?.name ??

          "",

        score:

          item?.score ??

          item?.similarity_score ??

          item?.similarity ??

          item?.similarity_percentage ??

          null,

      };

    })

    .filter((item) => item.title);

}



function formatScore(score) {

  if (score === null || score === undefined || score === "") {

    return null;

  }



  const number = Number(score);

  if (!Number.isFinite(number)) return null;



  const percentage =

    number >= 0 && number <= 1 ? number * 100 : number;



  return `${percentage.toFixed(1)}%`;

}



function Poster({ movie, className = "" }) {

  const [imageFailed, setImageFailed] = useState(false);

  const posterUrl = getPosterUrl(movie);



  useEffect(() => {

    setImageFailed(false);

  }, [posterUrl]);



  if (!posterUrl || imageFailed) {

    return (

      <div className={`poster-placeholder ${className}`}>

        <span aria-hidden="true">🎬</span>

        <small>Poster unavailable</small>

      </div>

    );

  }



  return (

    <img

      className={className}

      src={posterUrl}

      alt={`${movie.title} movie poster`}

      loading="lazy"

      onError={() => setImageFailed(true)}

    />

  );

}



function MovieMetadata({ movie, card = false }) {

  const year = getReleaseYear(movie);

  const rating = getRating(movie);



  if (!year && !rating) return null;



  return (

    <div

      className={`movie-metadata${card ? " card-metadata" : ""}`}

    >

      {year && <span className="metadata-item">{year}</span>}



      {rating && (

        <span className="rating-badge">

          <span aria-hidden="true">★</span>

          {rating}

          {!card && " / 10"}

        </span>

      )}

    </div>

  );

}



export default function App() {

  const [movies, setMovies] = useState([]);

  const [recommendationData, setRecommendationData] = useState({});

  const [searchText, setSearchText] = useState("");

  const [selectedMovie, setSelectedMovie] = useState(null);

  const [recommendations, setRecommendations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [suggestionsOpen, setSuggestionsOpen] = useState(true);



  useEffect(() => {

    async function loadData() {

      try {

        setLoading(true);

        setError("");



        const [moviesResponse, recommendationsResponse] =

          await Promise.all([

            fetch("/movies.json"),

            fetch("/recommendations.json"),

          ]);



        if (!moviesResponse.ok || !recommendationsResponse.ok) {

          throw new Error(

            "Could not load movie data. Check the JSON files in frontend/public."

          );

        }



        const [moviesData, recommendationsData] = await Promise.all([

          moviesResponse.json(),

          recommendationsResponse.json(),

        ]);



        if (!Array.isArray(moviesData)) {

          throw new Error("The movie data format is incorrect.");

        }



        setMovies(moviesData);

        setRecommendationData(recommendationsData);

      } catch (err) {

        setError(

          err.message || "Something went wrong while loading movie data."

        );

      } finally {

        setLoading(false);

      }

    }



    loadData();

  }, []);



  const movieIndex = useMemo(() => {

    const index = new Map();



    movies.forEach((movie) => {

      if (movie?.title) {

        index.set(movie.title.toLowerCase().trim(), movie);

      }

    });



    return index;

  }, [movies]);



  const searchSuggestions = useMemo(() => {

    const query = searchText.trim().toLowerCase();



    if (query.length < 2) return [];



    return movies

      .filter((movie) =>

        movie.title?.toLowerCase().includes(query)

      )

      .sort((a, b) => {

        const aTitle = a.title.toLowerCase();

        const bTitle = b.title.toLowerCase();

        const aStarts = aTitle.startsWith(query);

        const bStarts = bTitle.startsWith(query);



        if (aStarts !== bStarts) return aStarts ? -1 : 1;



        return aTitle.localeCompare(bTitle);

      })

      .slice(0, 6);

  }, [searchText, movies]);



  function loadMovie(movie) {

    setError("");

    setSelectedMovie(movie);

    setSearchText(movie.title);

    setSuggestionsOpen(false);



    const results = normalizeRecommendations(

      recommendationData,

      movie.title

    );



    const filteredResults = results

      .filter(

        (item) =>

          item.title.toLowerCase() !== movie.title.toLowerCase()

      )

      .map((item) => ({

        ...item,

        movie: movieIndex.get(item.title.toLowerCase().trim()),

      }));



    setRecommendations(filteredResults);

  }



  function searchMovie(event) {

    event.preventDefault();



    const query = searchText.trim();



    if (!query) {

      setError("Enter a movie title to get recommendations.");

      setSelectedMovie(null);

      setRecommendations([]);

      setSuggestionsOpen(false);

      return;

    }



    const foundMovie = movieIndex.get(query.toLowerCase());



    if (foundMovie) {

      loadMovie(foundMovie);

      return;

    }



    const firstSuggestion = searchSuggestions[0];



    if (firstSuggestion) {

      loadMovie(firstSuggestion);

      return;

    }



    setSelectedMovie(null);

    setRecommendations([]);

    setSuggestionsOpen(false);

    setError(`We couldn't find "${query}". Try another movie title.`);

  }



  function chooseMovie(movie) {

    loadMovie(movie);

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  function clearSearch() {
    setSearchText("");
    setError("");
    setSuggestionsOpen(false);
  }

  function goBackHome() {
    setSelectedMovie(null);
    setRecommendations([]);
    setSearchText("");
    setError("");
    setSuggestionsOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetHome() {

    setSelectedMovie(null);

    setRecommendations([]);

    setSearchText("");

    setError("");

    setSuggestionsOpen(true);

  }



  const genres = getGenres(selectedMovie);



  return (

    <main className="app" id="home">

      <header className="navbar">

        <a className="brand" href="#home" onClick={resetHome}>

          <span className="brand-icon">▶</span>

          <span>

            Cine<span className="brand-highlight">Match</span>

          </span>

        </a>



        <a className="nav-link" href="#home" onClick={resetHome}>

          Discover

        </a>

      </header>



      <section className="hero">

        <div className="hero-glow" />



        <div className="hero-content">

          <span className="eyebrow">

            <span className="eyebrow-dot" />

            YOUR PERSONAL MOVIE GUIDE

          </span>



          <h1>

            Find your next

            <br />

            <span className="gradient-text">favorite movie.</span>

          </h1>



          <p className="hero-description">

            Discover movies you'll love with intelligent content-based

            recommendations powered by machine learning.

          </p>



          <div className="search-area">

            <form className="search-form" onSubmit={searchMovie}>

              <span className="search-icon" aria-hidden="true">

                ⌕

              </span>



              <input

                type="text"

                value={searchText}

                onFocus={() => setSuggestionsOpen(true)}

                onChange={(event) => {

                  setSearchText(event.target.value);

                  setSuggestionsOpen(true);

                  setError("");

                }}

                placeholder="Search a movie, e.g. Avatar..."

                aria-label="Movie title"

                autoComplete="off"

              />
              {searchText && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  ×
                </button>
              )}

              <button type="submit" disabled={loading}>
                Find Movies <span aria-hidden="true">→</span>
              </button>

            </form>



            {suggestionsOpen &&

              searchText.trim().length >= 2 &&

              searchSuggestions.length > 0 && (

                <div className="search-suggestions">

                  <p className="suggestions-heading">

                    MOVIES YOU CAN SEARCH

                  </p>



                  {searchSuggestions.map((movie) => (

                    <button

                      className="suggestion-option"

                      type="button"

                      key={movie.id ?? movie.title}

                      onClick={() => chooseMovie(movie)}

                    >

                      <Poster

                        movie={movie}

                        className="suggestion-thumbnail"

                      />



                      <span className="suggestion-option-title">

                        {movie.title}

                        <small className="suggestion-meta">

                          {getReleaseYear(movie) || "Release year unavailable"}

                        </small>

                      </span>



                      <span className="suggestion-option-arrow">

                        ↗

                      </span>

                    </button>

                  ))}

                </div>

              )}

          </div>



          <div className="hero-meta">

            <span>✦ Content-based AI</span>

            <span>•</span>

            <span>Movie similarity matching</span>

          </div>

        </div>

      </section>



      <section className="content-section">

        {loading && (

          <div className="status-message">

            <span className="loader" />

            Loading your movie collection...

          </div>

        )}



        {!loading && error && (

          <div className="error-message" role="alert">

            <span>ⓘ</span> {error}

          </div>

        )}



        {!loading && !selectedMovie && !error && (

          <section className="welcome-section">

            <div className="section-heading">

              <div>

                <span className="section-kicker">GET STARTED</span>

                <h2>Start with a movie you love</h2>

                <p>Search a title to explore similar movies.</p>

              </div>



              <span className="collection-count">

                {movies.length.toLocaleString()} movies

              </span>

            </div>



            <div className="suggestion-grid">

              {["Avatar", "The Dark Knight Rises", "John Carter"].map(

                (title) => {

                  const movie = movieIndex.get(title.toLowerCase());



                  if (!movie) return null;



                  return (

                    <button

                      className="suggestion-card"

                      key={title}

                      onClick={() => chooseMovie(movie)}

                    >

                      <Poster

                        movie={movie}

                        className="suggestion-poster"

                      />



                      <span className="suggestion-info">

                        <strong>{movie.title}</strong>

                        <MovieMetadata movie={movie} card />

                        <small>Explore recommendations →</small>

                      </span>

                    </button>

                  );

                }

              )}

            </div>

          </section>

        )}



        {selectedMovie && (

          <>

            <button
              type="button"
              className="back-button"
              onClick={goBackHome}
            >
              ← Back to Home
            </button>

            <section className="selected-movie">
              <div className="selected-poster-wrap">

                <Poster

                  movie={selectedMovie}

                  className="selected-poster"

                />

              </div>



              <div className="selected-details">

                <span className="section-kicker">

                  YOUR SELECTED MOVIE

                </span>



                <h2>{selectedMovie.title}</h2>



                <MovieMetadata movie={selectedMovie} />



                {genres.length > 0 && (

                  <div className="genre-list">

                    {genres.map((genre) => (

                      <span className="genre-tag" key={genre}>

                        {genre}

                      </span>

                    ))}

                  </div>

                )}



                <p className="selected-overview">

                  {selectedMovie.overview ||

                    "No overview is available for this movie."}

                </p>



                <div className="selected-stats">

                  <span className="stat-icon">✦</span>

                  <span>

                    <strong>{recommendations.length}</strong>

                    <small> similar movies found</small>

                  </span>

                </div>

              </div>

            </section>



            <section className="results-section">

              <div className="section-heading">

                <div>

                  <span className="section-kicker">

                    HANDPICKED FOR YOU

                  </span>



                  <h2>Movies you might love</h2>



                  <p>

                    Because you searched for{" "}

                    <strong>{selectedMovie.title}</strong>

                  </p>

                </div>



                <span className="results-count">

                  {recommendations.length} results

                </span>

              </div>



              {recommendations.length === 0 ? (

                <div className="empty-state">

                  <span>🎞️</span>

                  <h3>No recommendations found</h3>

                  <p>

                    No recommendations are available for this title in

                    the current dataset.

                  </p>

                </div>

              ) : (

                <div className="movie-grid">

                  {recommendations.map((item, index) => {

                    const movie = item.movie;

                    const displayTitle = item.title;

                    const score = formatScore(item.score);



                    return (

                      <article

                        className="movie-card"

                        key={`${displayTitle}-${index}`}

                      >

                        <button

                          className="poster-button"

                          type="button"

                          onClick={() => {

                            if (movie) chooseMovie(movie);

                          }}

                          aria-label={`Find movies similar to ${displayTitle}`}

                          disabled={!movie}

                        >

                          {movie ? (

                            <Poster

                              movie={movie}

                              className="movie-poster"

                            />

                          ) : (

                            <div className="poster-placeholder movie-poster">

                              <span aria-hidden="true">🎬</span>

                              <small>Poster unavailable</small>

                            </div>

                          )}



                          <span className="movie-number">

                            {String(index + 1).padStart(2, "0")}

                          </span>



                          {movie && (

                            <span className="poster-overlay">

                              View similar movies ↗

                            </span>

                          )}

                        </button>



                        <div className="movie-card-info">

                          <h3>{displayTitle}</h3>



                          {movie && (

                            <MovieMetadata movie={movie} card />

                          )}



                          <div className="movie-card-footer">

                            <span className="similarity-label">

                              <span className="similarity-dot" />

                              Similarity

                            </span>



                            <span className="similarity-score">

                              {score || "N/A"}

                            </span>

                          </div>

                        </div>

                      </article>

                    );

                  })}

                </div>

              )}



              <p className="method-note">

                Similarity scores measure text-feature similarity, not

                the probability that you will enjoy a movie. Ratings

                represent the dataset's TMDB vote averages.

              </p>

            </section>

          </>

        )}

      </section>



      <footer className="footer">

        <a className="brand footer-brand" href="#home" onClick={resetHome}>

          <span className="brand-icon">▶</span>

          <span>

            Cine<span className="brand-highlight">Match</span>

          </span>

        </a>



        <p>Made with machine learning and a love for movies.</p>

        <span className="footer-credit">Movie data & posters: TMDB</span>

      </footer>

    </main>

  );

}
