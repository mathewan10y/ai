import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/movie.dart';
import '../services/api_service.dart';
import 'actor_movies_screen.dart';

class DetailsScreen extends StatefulWidget {
  final String movieTitle;

  DetailsScreen({required this.movieTitle});

  @override
  _DetailsScreenState createState() => _DetailsScreenState();
}

class _DetailsScreenState extends State<DetailsScreen> {
  MovieDetailsResponse? movieDetails;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMovieDetails();
  }

  Future<void> _loadMovieDetails() async {
    try {
      final details = await ApiService.getRecommendations(widget.movieTitle);
      setState(() {
        movieDetails = details;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading movie details: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: isLoading
          ? Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : movieDetails == null
              ? Center(
                  child: Text(
                    'Movie not found',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 18,
                    ),
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top Section: Movie Details
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Movie Poster
                            Container(
                              height: 250,
                              width: 170,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: CachedNetworkImage(
                                  imageUrl: movieDetails!.searchedMovie.poster,
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
                                      size: 50,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            SizedBox(width: 16),
                            // Movie Info
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    movieDetails!.searchedMovie.title,
                                    style: GoogleFonts.poppins(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  if (movieDetails!.searchedMovie.rating != null)
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.star,
                                          color: Colors.amber,
                                          size: 16,
                                        ),
                                        SizedBox(width: 4),
                                        Text(
                                          movieDetails!.searchedMovie.rating!.toStringAsFixed(1),
                                          style: GoogleFonts.poppins(
                                            color: Colors.white,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
                                    ),
                                  SizedBox(height: 12),
                                  if (movieDetails!.searchedMovie.overview != null)
                                    Text(
                                      movieDetails!.searchedMovie.overview!,
                                      style: GoogleFonts.poppins(
                                        color: Colors.white.withOpacity(0.8),
                                        fontSize: 14,
                                        height: 1.4,
                                      ),
                                      maxLines: 6,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  SizedBox(height: 20),
                                  // Cast Section
                                  if (movieDetails!.searchedMovie.cast != null && movieDetails!.searchedMovie.cast!.isNotEmpty)
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Cast',
                                          style: GoogleFonts.poppins(
                                            color: Colors.white,
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        SizedBox(height: 12),
                                        Container(
                                          height: 120,
                                          child: ListView.builder(
                                            scrollDirection: Axis.horizontal,
                                            itemCount: movieDetails!.searchedMovie.cast!.length,
                                            itemBuilder: (context, index) {
                                              final castMember = movieDetails!.searchedMovie.cast![index];
                                              return GestureDetector(
                                                onTap: () {
                                                  if (castMember['id'] != null) {
                                                    Navigator.push(
                                                      context,
                                                      MaterialPageRoute(
                                                        builder: (context) => ActorMoviesScreen(
                                                          actorId: castMember['id'],
                                                          actorName: castMember['name'] ?? 'Unknown Actor',
                                                        ),
                                                      ),
                                                    );
                                                  }
                                                },
                                                child: Container(
                                                  margin: EdgeInsets.only(right: 16),
                                                  child: Column(
                                                    children: [
                                                      CircleAvatar(
                                                        radius: 35,
                                                        backgroundImage: castMember['image'] != null
                                                            ? CachedNetworkImageProvider(castMember['image'])
                                                            : null,
                                                        backgroundColor: Colors.grey[600],
                                                        child: castMember['image'] == null
                                                            ? Icon(
                                                                Icons.person,
                                                                size: 30,
                                                                color: Colors.white,
                                                              )
                                                            : null,
                                                      ),
                                                      SizedBox(height: 8),
                                                      SizedBox(
                                                        width: 80,
                                                        child: Text(
                                                          castMember['name'] ?? 'Unknown',
                                                          style: GoogleFonts.poppins(
                                                            color: Colors.white,
                                                            fontSize: 12,
                                                          ),
                                                          textAlign: TextAlign.center,
                                                          maxLines: 2,
                                                          overflow: TextOverflow.ellipsis,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 24),
                      // Bottom Section: Recommended Movies
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Text(
                          'Recommended Movies',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      SizedBox(height: 12),
                      // Horizontal List of Recommendations
                      Container(
                        height: 180,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          itemCount: movieDetails!.recommendations.length,
                          itemBuilder: (context, index) {
                            final movie = movieDetails!.recommendations[index];
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
                                width: 120,
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
                  ),
                ),
    );
  }
}
