import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/movie.dart';
import '../services/api_service.dart';
import 'details_screen.dart';

class ActorMoviesScreen extends StatefulWidget {
  final int actorId;
  final String actorName;

  ActorMoviesScreen({required this.actorId, required this.actorName});

  @override
  _ActorMoviesScreenState createState() => _ActorMoviesScreenState();
}

class _ActorMoviesScreenState extends State<ActorMoviesScreen> {
  List<Movie> actorMovies = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadActorMovies();
  }

  Future<void> _loadActorMovies() async {
    try {
      final movies = await ApiService.getActorMovies(widget.actorId);
      setState(() {
        actorMovies = movies;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading actor movies: $e')),
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
        title: Text(
          '${widget.actorName} Movies',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: isLoading
          ? Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : actorMovies.isEmpty
              ? Center(
                  child: Text(
                    'No movies found',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 18,
                    ),
                  ),
                )
              : GridView.builder(
                  padding: EdgeInsets.all(16),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.7,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: actorMovies.length,
                  itemBuilder: (context, index) {
                    final movie = actorMovies[index];
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
                    );
                  },
                ),
    );
  }
}
