from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pickle
import pandas as pd
import requests
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import concurrent.futures

from pymongo import MongoClient
import numpy as np

# --- MONGODB CONFIGURATION ---
# TODO: Replace <db_password> with your actual MongoDB password
MONGO_URI = "mongodb+srv://mathewan10y_db_user:c6.MZDZVpuurdjr@cluster0.cbgv8ok.mongodb.net/?appName=Cluster0"
mongo_client = None
db = None
users_collection = None

try:
    # Check if password is still placeholder
    if "<db_password>" in MONGO_URI or "YOUR_NEW_PASSWORD" in MONGO_URI:
        print("WARNING: MongoDB password not configured. Using fallback storage.")
        raise Exception("MongoDB not configured")
    
    mongo_client = MongoClient(MONGO_URI, 
                             serverSelectionTimeoutMS=10000,
                             connectTimeoutMS=10000,
                             socketTimeoutMS=10000)
    # Test the connection
    mongo_client.server_info()
    db = mongo_client.movie_app
    users_collection = db.users
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"MongoDB Connection Error: {e}")
    print("Using in-memory fallback storage (clicks won't persist after server restart)")
    print("To fix: Check your internet connection and MongoDB Atlas network access settings")
    # Create fallback storage
    users_collection = {}  # Simple dict as fallback

app = FastAPI()

# Enable CORS so your Flutter app can communicate with this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- TMDB API CONFIGURATION ---
API_KEY = "0c7e2d408eb00df2559f2f0d8486432e" 

# --- LOAD AI MATRIX ---
try:
    movies = pickle.load(open('movies_list.pkl', 'rb'))
    similarity = pickle.load(open('similarity.pkl', 'rb'))
except FileNotFoundError:
    print("ERROR: .pkl files not found. Please ensure movies_list.pkl and similarity.pkl are in the backend folder.")


# --- HELPER FUNCTIONS ---
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
    return "https://via.placeholder.com/500x750.png?text=No+Poster"

def fetch_movie_details(movie_id):
    """Fetches poster, rating, overview, and CAST (names + images) from TMDB."""
    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=en-US&append_to_response=credits"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        # Extract the top 4 cast members' names AND profile pictures
        cast_list = []
        for actor in data.get('credits', {}).get('cast', [])[:4]:
            profile_path = actor.get('profile_path')
            image_url = f"https://image.tmdb.org/t/p/w200{profile_path}" if profile_path else "https://via.placeholder.com/200x300.png?text=No+Photo"
            
            cast_list.append({
                "id": actor.get('id'),    
                "name": actor.get('name'),
                "image": image_url
            })

        return {
            "id": int(movie_id),
            "poster": f"https://image.tmdb.org/t/p/w500{data.get('poster_path', '')}" if data.get('poster_path') else "https://via.placeholder.com/500x750.png?text=No+Poster",
            "rating": round(data.get('vote_average', 0.0), 1),
            "overview": data.get('overview', 'No overview available.'),
            "cast": cast_list 
        }
    except Exception:
        return {
            "id": 0,
            "poster": "https://via.placeholder.com/500x750.png?text=Error", 
            "rating": 0.0, 
            "overview": "Could not fetch details.", 
            "cast": []
        }

def simplify(text):
    """Standardizes strings to ignore spaces and hyphens for better matching."""
    return str(text).lower().replace(" ", "").replace("-", "").strip()

def fetch_and_add_movie(movie_title):
    """Downloads a new movie from TMDB and updates the local AI matrix."""
    global movies, similarity 
    
    search_url = f"https://api.themoviedb.org/3/search/movie?api_key={API_KEY}&query={movie_title}"
    search_res = requests.get(search_url).json()
    
    if not search_res.get('results'):
        return False 
        
    movie_id = search_res['results'][0]['id']
    
    if movie_id in movies['id'].values:
        return True
        
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
    
    soup = ' '.join(keywords) + ' ' + (' '.join(cast) * 3) + ' ' + (' '.join(crew) * 3) + ' ' + (' '.join(genres) * 3) + ' ' + str(overview)
    
    new_movie = pd.DataFrame([{
        'id': movie_id, 'title': title, 'overview': overview,
        'genres': genres, 'keywords': keywords, 'cast': cast,
        'crew': crew, 'soup': soup
    }])
    movies = pd.concat([movies, new_movie], ignore_index=True)
    
    count = CountVectorizer(stop_words='english')
    count_matrix = count.fit_transform(movies['soup'])
    similarity = cosine_similarity(count_matrix, count_matrix)
    
    pickle.dump(movies, open('movies_list.pkl', 'wb'))
    pickle.dump(similarity, open('similarity.pkl', 'wb'))
    
    return True


# --- API ENDPOINTS ---

@app.post("/track/click")
def track_click(user_id: str, movie_id: int):
    """Saves the clicked movie to the user's history in MongoDB."""
    try:
        if isinstance(users_collection, dict):
            # Fallback storage (in-memory dict)
            if user_id not in users_collection:
                users_collection[user_id] = {"_id": user_id, "click_history": []}
            
            if movie_id not in users_collection[user_id]["click_history"]:
                users_collection[user_id]["click_history"].append(movie_id)
            
            print(f"Fallback: Tracked click for user {user_id}, movie {movie_id}")
            return {"status": "success", "message": "Click tracked (fallback)"}
        else:
            # MongoDB storage
            users_collection.update_one(
                {"_id": user_id},
                {"$addToSet": {"click_history": movie_id}},
                upsert=True
            )
            return {"status": "success", "message": "Click tracked"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/recommend/{movie_title}")
def get_recommendations(movie_title: str):
    """The main endpoint for the Flutter app."""
    results = []
    matches = movies[movies['title'].apply(simplify) == simplify(movie_title)]
    
    if matches.empty:
        success = fetch_and_add_movie(movie_title)
        if not success:
            return {"recommendations": [], "error": "Movie not found"}
        movie_index = len(movies) - 1
    else:
        movie_index = matches.index[0]
    
    try:
        distances = similarity[movie_index]
        movie_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]
        
        def fetch_rec(i):
            movie_row = movies.iloc[i[0]]
            return {
                "id": int(movie_row.id),
                "title": movie_row.title,
                "poster": fetch_poster(movie_row.id)
            }
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(fetch_rec, movie_list))
            
        searched_row = movies.iloc[movie_index]
        searched_details = fetch_movie_details(searched_row.id)
        searched_details["title"] = searched_row.title
        searched_details["id"] = int(searched_row.id)
            
        return {
            "searched_movie": searched_details, 
            "recommendations": results
        }
    except Exception as e:
        return {"recommendations": [], "error": f"Internal Error: {str(e)}"}

@app.get("/suggestions")
def get_suggestions(query: str):
    """Returns top 5 movie titles that match the user's typing."""
    if not query:
        return {"suggestions": []}
    matches = movies[movies['title'].str.contains(query, case=False, na=False)]
    return {"suggestions": matches['title'].head(5).tolist()}

@app.get("/home-movies")
def get_home_movies():
    """Returns 15 random movies per category, fetched in parallel for extreme speed."""
    categories = ["Trending Today", "Action & Adventure", "Critically Acclaimed"]
    home_data = {}
    
    def process_movie(row_tuple):
        index, row = row_tuple
        return {
            "id": int(row.id),
            "title": row.title,
            "poster": fetch_poster(row.id)
        }

    for cat in categories:
        sample = movies.sample(15) 
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            results = list(executor.map(process_movie, sample.iterrows()))
        home_data[cat] = results
        
    return home_data

@app.get("/special-picks/{user_id}")
def get_special_picks(user_id: str):
    """ADVANCED: Returns personalized recommendations using Vector Averaging based on click history."""
    try:
        click_history = []
        
        # 1. Get user history
        if isinstance(users_collection, dict):
            # Fallback storage (in-memory dict)
            if user_id in users_collection:
                click_history = users_collection[user_id].get("click_history", [])
            print(f"Fallback: User {user_id} has {len(click_history)} clicks: {click_history}")
        else:
            # MongoDB storage
            user_doc = users_collection.find_one({"_id": user_id})
            click_history = user_doc.get('click_history', []) if user_doc else []
        
        if not click_history:
            print(f"No click history found for user {user_id}")
            return {"recommendations": []}
        
        # 2. Find the matrix indices for all clicked movies
        user_indices = movies[movies['id'].isin(click_history)].index.tolist()
        print(f"Found {len(user_indices)} movies in database for click history: {user_indices}")
        
        if not user_indices:
            print(f"No matching movies found in database for click history {click_history}")
            return {"recommendations": []}

        # 3. VECTOR AVERAGING (The Frankenstein Taste Profile)
        user_sim_rows = [similarity[idx] for idx in user_indices]
        avg_sim = np.mean(user_sim_rows, axis=0)
        print(f"Created average similarity vector with shape: {avg_sim.shape}")
        
        # 4. Remove movies the user has already clicked from the suggestions
        for idx in user_indices:
            avg_sim[idx] = -1
        print(f"Removed {len(user_indices)} already-watched movies from recommendations")
            
        # 5. Get the top 7 closest matches to their overall taste profile
        top_indices = np.argsort(avg_sim)[::-1][:7]
        print(f"Top recommendation indices: {top_indices}")
        
        def fetch_rec(idx):
            movie_row = movies.iloc[idx]
            return {
                "id": int(movie_row.id),
                "title": movie_row.title,
                "poster": fetch_poster(movie_row.id)
            }
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
            results = list(executor.map(fetch_rec, top_indices))
            
        print(f"Calculated {len(results)} special picks using Vector Averaging for user {user_id}")
        return {"recommendations": results}
        
    except Exception as e:
        print(f"Error in special picks: {e}")
        import traceback
        traceback.print_exc()
        return {"recommendations": [], "error": str(e)}

@app.get("/actor-movies/{actor_id}")
def get_actor_movies(actor_id: int):
    """Fetches the top 10 most popular movies for a specific actor from TMDB."""
    try:
        url = f"https://api.themoviedb.org/3/person/{actor_id}/movie_credits?api_key={API_KEY}&language=en-US"
        response = requests.get(url, timeout=5).json()
        
        cast_movies = response.get('cast', [])
        sorted_movies = sorted(cast_movies, key=lambda x: x.get('popularity', 0), reverse=True)[:10]
        
        results = []
        for m in sorted_movies:
            if m.get('poster_path'):
                results.append({
                    "id": int(m.get('id')),
                    "title": m.get('title'),
                    "poster": "https://image.tmdb.org/t/p/w500/" + m.get('poster_path')
                })
                
        return {"recommendations": results}
    except Exception as e:
        return {"recommendations": [], "error": str(e)}    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)