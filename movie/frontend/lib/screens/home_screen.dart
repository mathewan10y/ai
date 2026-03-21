import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/movie.dart';
import '../services/api_service.dart';
import 'details_screen.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, List<Movie>> homeMovies = {};
  bool isLoading = true;
  final TextEditingController _searchController = TextEditingController();
  List<String> suggestions = [];
  bool showSuggestions = false;

  @override
  void initState() {
    super.initState();
    _loadHomeMovies();
  }

  Future<void> _loadHomeMovies() async {
    try {
      final movies = await ApiService.getHomeMovies();
      setState(() {
        homeMovies = movies;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading home movies: $e')),
      );
    }
  }

  Future<void> _fetchSuggestions(String query) async {
    if (query.length < 2) {
      setState(() {
        suggestions = [];
        showSuggestions = false;
      });
      return;
    }
    
    try {
      final fetchedSuggestions = await ApiService.getSuggestions(query);
      setState(() {
        suggestions = fetchedSuggestions;
        showSuggestions = true;
      });
    } catch (e) {
      setState(() {
        suggestions = [];
        showSuggestions = false;
      });
    }
  }

  void _selectSuggestion(String suggestion) {
    _searchController.text = suggestion;
    setState(() {
      showSuggestions = false;
    });
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DetailsScreen(movieTitle: suggestion),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Background Image
          Container(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: AssetImage('assets/background.png'),
                fit: BoxFit.cover,
              ),
            ),
          ),
          // Darkened Overlay
          Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.8),
            ),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                // Search Bar with Custom Suggestions
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.2),
                          ),
                        ),
                        child: TextField(
                          controller: _searchController,
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                          onChanged: _fetchSuggestions,
                          onSubmitted: (value) {
                            if (value.isNotEmpty) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => DetailsScreen(movieTitle: value),
                                ),
                              );
                            }
                          },
                          decoration: InputDecoration(
                            hintText: 'Search movies...',
                            hintStyle: GoogleFonts.poppins(
                              color: Colors.white.withOpacity(0.7),
                            ),
                            prefixIcon: Icon(
                              Icons.search,
                              color: Colors.white.withOpacity(0.7),
                            ),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 15,
                            ),
                          ),
                        ),
                      ),
                      if (showSuggestions && suggestions.isNotEmpty)
                        Container(
                          margin: EdgeInsets.only(top: 8),
                          decoration: BoxDecoration(
                            color: Colors.grey[850],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                            ),
                          ),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: suggestions.length,
                            itemBuilder: (context, index) {
                              return ListTile(
                                title: Text(
                                  suggestions[index],
                                  style: GoogleFonts.poppins(
                                    color: Colors.white,
                                    fontSize: 14,
                                  ),
                                ),
                                onTap: () => _selectSuggestion(suggestions[index]),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),
                // Home Content
                Expanded(
                  child: isLoading
                      ? Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : homeMovies.isEmpty
                          ? Center(
                              child: Text(
                                'No movies available',
                                style: GoogleFonts.poppins(
                                  color: Colors.white,
                                  fontSize: 16,
                                ),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              itemCount: homeMovies.keys.length,
                              itemBuilder: (context, index) {
                                final category = homeMovies.keys.elementAt(index);
                                final movies = homeMovies[category]!;
                                
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    SizedBox(height: 16),
                                    // Category Title
                                    Text(
                                      category,
                                      style: GoogleFonts.poppins(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    // Horizontal List of Movies
                                    Container(
                                      height: 150,
                                      child: ListView.builder(
                                        scrollDirection: Axis.horizontal,
                                        itemCount: movies.length,
                                        itemBuilder: (context, movieIndex) {
                                          final movie = movies[movieIndex];
                                          return GestureDetector(
                                            onTap: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) => DetailsScreen(
                                                    movieTitle: movie.title,
                                                  ),
                                                ),
                                              );
                                            },
                                            child: Container(
                                              width: 100,
                                              margin: EdgeInsets.only(right: 12),
                                              child: ClipRRect(
                                                borderRadius: BorderRadius.circular(8),
                                                child: CachedNetworkImage(
                                                  imageUrl: movie.poster,
                                                  fit: BoxFit.cover,
                                                  placeholder: (context, url) => Container(
                                                    color: Colors.grey[300],
                                                    child: Center(
                                                      child: CircularProgressIndicator(),
                                                    ),
                                                  ),
                                                  errorWidget: (context, url, error) => Container(
                                                    color: Colors.grey[300],
                                                    child: Icon(
                                                      Icons.movie,
                                                      size: 30,
                                                      color: Colors.grey[600],
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}
