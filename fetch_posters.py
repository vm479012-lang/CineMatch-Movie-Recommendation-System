import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load the TMDB credential from the main project's .env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("TMDB_API_KEY")
access_token = os.getenv("TMDB_ACCESS_TOKEN")

if not api_key and not access_token:
    raise ValueError(
        "Add TMDB_API_KEY or TMDB_ACCESS_TOKEN to your .env file."
    )

headers = {"accept": "application/json"}
if access_token:
    headers["Authorization"] = f"Bearer {access_token}"

movies_file = BASE_DIR / "web_data" / "movies.json"

with open(movies_file, "r", encoding="utf-8") as f:
    movies = json.load(f)

session = requests.Session()
updated = 0
not_found = 0

for index, movie in enumerate(movies, start=1):
    if movie.get("poster_path"):
        continue

    params = {"query": movie["title"]}
    if api_key:
        params["api_key"] = api_key

    try:
        response = session.get(
            "https://api.themoviedb.org/3/search/movie",
            params=params,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        results = response.json().get("results", [])

        # Prefer an exact title match, ignoring case.
        exact = next(
            (
                result for result in results
                if result.get("title", "").casefold()
                == movie["title"].casefold()
                and result.get("poster_path")
            ),
            None,
        )

        # Fall back to the first result with a poster.
        match = exact or next(
            (result for result in results if result.get("poster_path")),
            None,
        )

        if match:
            movie["poster_path"] = match["poster_path"]
            updated += 1
        else:
            not_found += 1

    except requests.RequestException as error:
        print(f"Request failed for {movie['title']}: {error}")
        print("Stopping to avoid repeated failed requests.")
        break

    if index % 100 == 0:
        print(f"Checked {index}/{len(movies)} movies")
        with open(movies_file, "w", encoding="utf-8") as f:
            json.dump(movies, f, ensure_ascii=False)

    time.sleep(0.05)

# Save the latest results.
with open(movies_file, "w", encoding="utf-8") as f:
    json.dump(movies, f, ensure_ascii=False)

print("\nPoster lookup finished.")
print("Movies with posters added this run:", updated)
print("Movies without a matching poster:", not_found)
print("Updated file:", movies_file)