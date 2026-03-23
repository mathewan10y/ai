from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pickle
import pandas as pd
import requests
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import concurrent.futures

app = FastAPI()

# Enable CORS so your Flutter app can communicate with this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_movie_details(movie_id):
    """Fetches poster, rating, overview, and CAST (names + images) from TMDB."""
    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=en-US&append_to_response=credits"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        # NEW: Extract the top 4 cast members' names AND profile pictures
        cast_list = []
        for actor in data.get('credits', {}).get('cast', [])[:4]:
            profile_path = actor.get('profile_path')
            # Using w200 resolution since these will be small avatars
            image_url = "https://image.tmdb.org/t/p/w200" + profile_path if profile_path else "https://via.placeholder.com/200x300?text=No+Photo"
            
            cast_list.append({
                "name": actor.get('name'),
                "image": image_url
            })

        return {
            "poster": "https://image.tmdb.org/t/p/w500/" + data.get('poster_path', '') if data.get('poster_path') else "https://via.placeholder.com/500x750?text=No+Poster",
            "rating": round(data.get('vote_average', 0.0), 1),
            "overview": data.get('overview', 'No overview available.'),
            "cast": cast_list  # Sending the rich cast list to Flutter
        }
    except Exception:
        return {
            "poster": "https://via.placeholder.com/500x750?text=Error", 
            "rating": 0.0, 
            "overview": "Could not fetch details.", 
            "cast": []
        }
# 1. Load the AI Brain into memory
# Ensure these files are in the same folder as main.py
try:
    movies = pickle.load(open('movies_list.pkl', 'rb'))
    similarity = pickle.load(open('similarity.pkl', 'rb'))
except FileNotFoundError:
    print("ERROR: .pkl files not found. Please ensure movies_list.pkl and similarity.pkl are in the backend folder.")

# --- TMDB API CONFIGURATION ---
API_KEY = "0c7e2d408eb00df2559f2f0d8486432e" 

def fetch_poster(movie_id):
    """Fetches the official poster URL from TMDB."""
    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=en-US"
        response = requests.get(url, timeout=5)
        data = response.json()
        if data.get('poster_path'):
            return "https://image.tmdb.org/t/p/w500/" + data.get('poster_path')
    except Exception:
        pass
    return "https://via.placeholder.com/500x750?text=No+Poster"

def simplify(text):
    """Standardizes strings to ignore spaces and hyphens for better matching."""
    return str(text).lower().replace(" ", "").replace("-", "").strip()

def fetch_and_add_movie(movie_title):
    """Downloads a new movie from TMDB and updates the local AI matrix."""
    global movies, similarity 
    
    # Search for the movie ID
    search_url = f"https://api.themoviedb.org/3/search/movie?api_key={API_KEY}&query={movie_title}"
    search_res = requests.get(search_url).json()
    
    if not search_res.get('results'):
        return False 
        
    movie_id = search_res['results'][0]['id']
    
    # Check if we already have it (by ID) to avoid duplicates
    if movie_id in movies['id'].values:
        return True
        
    # Fetch full details for the 'Soup'
    details_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&append_to_response=credits,keywords"
    data = requests.get(details_url).json()
    
    genres = [g['name'].lower().replace(" ", "") for g in data.get('genres', [])]
    keywords = [k['name'].lower().replace(" ", "") for k in data.get('keywords', {}).get('keywords', [])]
    cast = [c['name'].lower().replace(" ", "") for c in data.get('credits', {}).get('cast', [])[:3]]
    
    crew = []
    for c in data.get('credits', {}).get('crew', []):
        if c['job'] == 'Director':
            crew.append(c['name'].lower().replace(" ", ""))
            break
            
    overview = data.get('overview', '')
    title = data.get('title')
    
    # Create the heavily weighted Metadata Soup
    soup = ' '.join(keywords) + ' ' + (' '.join(cast) * 3) + ' ' + (' '.join(crew) * 3) + ' ' + (' '.join(genres) * 3) + ' ' + str(overview)
    
    # Append to DataFrame
    new_movie = pd.DataFrame([{
        'id': movie_id, 'title': title, 'overview': overview,
        'genres': genres, 'keywords': keywords, 'cast': cast,
        'crew': crew, 'soup': soup
    }])
    movies = pd.concat([movies, new_movie], ignore_index=True)
    
    # Update the Similarity Matrix
    count = CountVectorizer(stop_words='english')
    count_matrix = count.fit_transform(movies['soup'])
    similarity = cosine_similarity(count_matrix, count_matrix)
    
    # Save the updated state to disk
    pickle.dump(movies, open('movies_list.pkl', 'wb'))
    pickle.dump(similarity, open('similarity.pkl', 'wb'))
    
    return True

@app.get("/recommend/{movie_title}")
def get_recommendations(movie_title: str):
    """The main endpoint for the Flutter app."""
    # ALWAYS start with a clean results list
    results = []
    
    # 1. Fuzzy match against our local database
    matches = movies[movies['title'].apply(simplify) == simplify(movie_title)]
    
    if matches.empty:
        # 2. Try to learn the movie if not found
        success = fetch_and_add_movie(movie_title)
        if not success:
            return {"recommendations": [], "error": "Movie not found"}
        
        # Point to the most recently added movie (the one we just fetched)
        movie_index = len(movies) - 1
    else:
        movie_index = matches.index[0]
    
# 3. Calculate Recommendations
    try:
        distances = similarity[movie_index]
        movie_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]
        
        # Helper function to fetch recommendations in parallel
        def fetch_rec(i):
            movie_row = movies.iloc[i[0]]
            return {
                "title": movie_row.title,
                "poster": fetch_poster(movie_row.id)
            }
            
        # Multithread the 5 recommendations
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(fetch_rec, movie_list))
            
        # Get full details for the searched movie
        searched_row = movies.iloc[movie_index]
        searched_details = fetch_movie_details(searched_row.id)
        searched_details["title"] = searched_row.title
            
        return {
            "searched_movie": searched_details, 
            "recommendations": results
        }
    
    except Exception as e:
        return {"recommendations": [], "error": f"Internal Error: {str(e)}"}
    # 3. Calculate Recommendations
    # ... (Keep the math/similarity logic the same) ...
    

@app.get("/suggestions")
def get_suggestions(query: str):
    """Returns top 5 movie titles that match the user's typing."""
    if not query:
        return {"suggestions": []}
    # Find titles containing the typed letters
    matches = movies[movies['title'].str.contains(query, case=False, na=False)]
    return {"suggestions": matches['title'].head(5).tolist()}

@app.get("/home-movies")
def get_home_movies():
    """Returns 15 random movies per category, fetched in parallel for extreme speed."""
    categories = ["Trending Today", "Action & Adventure", "Critically Acclaimed"]
    home_data = {}
    
    # Helper function for the thread pool
    def process_movie(row_tuple):
        index, row = row_tuple
        return {
            "title": row.title,
            "poster": fetch_poster(row.id)
        }

    for cat in categories:
        # 1. Increased from 5 to 15 to fill wide desktop screens
        sample = movies.sample(15) 
        
        # 2. Multithreading: Fetch all 15 posters simultaneously instead of one by one
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            results = list(executor.map(process_movie, sample.iterrows()))
            
        home_data[cat] = results
        
    return home_data
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)