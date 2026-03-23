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

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  Map<String, List<Movie>> homeMovies = {};
  bool isLoading = true;
  final TextEditingController _searchController = TextEditingController();
  List<String> suggestions = [];
  bool showSuggestions = false;
  Future<List<Movie>>? _specialPicksFuture;
  List<Movie> specialPicks = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _specialPicksFuture = _refreshSpecialPicks();
    _loadHomeMovies();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Refresh Special Picks when app becomes visible (user returns from details screen)
      setState(() {
        _specialPicksFuture = _refreshSpecialPicks();
      });
    }
  }

  Future<List<Movie>> _refreshSpecialPicks() async {
    try {
      final picks = await ApiService.getSpecialPicks();
      setState(() {
        specialPicks = picks;
      });
      return picks;
    } catch (e) {
      print('Error refreshing special picks: $e');
      return [];
    }
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
    }
  }

  void _fetchSuggestions(String query) {
    if (query.isEmpty) {
      setState(() {
        suggestions = [];
        showSuggestions = false;
      });
      return;
    }
    ApiService.getSuggestions(query).then((suggestionsList) {
      setState(() {
        suggestions = suggestionsList;
        showSuggestions = true;
      });
    });
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
    ).then((_) {
      // Refresh Special Picks when user returns from details screen
      setState(() {
        _specialPicksFuture = _refreshSpecialPicks();
      });
    });
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
                image: AssetImage('assets/images/home_background.jpg'),
                fit: BoxFit.cover,
              ),
            ),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                // Search Bar
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search movies...',
                            hintStyle: GoogleFonts.poppins(
                              color: Colors.white.withOpacity(0.7),
                            ),
                            prefixIcon: Icon(
                              Icons.search,
                              color: Colors.white.withOpacity(0.7),
                            ),
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.1),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(30),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 15,
                            ),
                          ),
                          onChanged: _fetchSuggestions,
                          onSubmitted: (value) {
                            if (value.isNotEmpty) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => DetailsScreen(movieTitle: value),
                                ),
                              ).then((_) {
                                // Refresh Special Picks when user returns from details screen
                                setState(() {
                                  _specialPicksFuture = _refreshSpecialPicks();
                                });
                              });
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                // Suggestions Dropdown
                if (showSuggestions && suggestions.isNotEmpty)
                  Container(
                    margin: EdgeInsets.only(top: 8, left: 16, right: 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: suggestions.length,
                      itemBuilder: (context, index) {
                        return ListTile(
                          leading: Icon(Icons.movie, color: Colors.white),
                          title: Text(
                            suggestions[index],
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                          onTap: () => _selectSuggestion(suggestions[index]),
                        );
                      },
                    ),
                  ),
                // Home Content
                if (isLoading)
                  Expanded(
                    child: Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.white,
                        ),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: homeMovies.isEmpty
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
                            itemCount: homeMovies.keys.length + (specialPicks.isNotEmpty ? 1 : 0),
                            itemBuilder: (context, index) {
                              // Show Special Picks first if available
                              if (specialPicks.isNotEmpty && index == 0) {
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    SizedBox(height: 16),
                                    // Category Title with Refresh Button
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Special Picks for You',
                                          style: GoogleFonts.poppins(
                                            color: Colors.white,
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        IconButton(
                                          icon: Icon(Icons.refresh, color: Colors.white, size: 20),
                                          onPressed: () {
                                            setState(() {
                                              _specialPicksFuture = _refreshSpecialPicks();
                                            });
                                          },
                                          tooltip: 'Refresh Special Picks',
                                        ),
                                      ],
                                    ),
                                    SizedBox(height: 8),
                                    // Horizontal List of Movies
                                    Container(
                                      height: 150,
                                      child: ListView.builder(
                                        scrollDirection: Axis.horizontal,
                                        itemCount: specialPicks.length,
                                        itemBuilder: (context, movieIndex) {
                                          final movie = specialPicks[movieIndex];
                                          return GestureDetector(
                                            onTap: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) => DetailsScreen(
                                                    movieTitle: movie.title,
                                                  ),
                                                ),
                                              ).then((_) {
                                                // Refresh Special Picks when user returns from details screen
                                                setState(() {
                                                  _specialPicksFuture = _refreshSpecialPicks();
                                                });
                                              });
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
                              }
                              
                              // Adjust index for regular categories
                              final categoryIndex = specialPicks.isNotEmpty ? index - 1 : index;
                              final category = homeMovies.keys.elementAt(categoryIndex);
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
                                            ).then((_) {
                                              // Refresh Special Picks when user returns from details screen
                                              setState(() {
                                                _specialPicksFuture = _refreshSpecialPicks();
                                              });
                                            });
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
}
