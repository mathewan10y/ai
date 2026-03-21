class Movie {
  final String title;
  final String poster;
  final double? rating;
  final String? overview;

  Movie({
    required this.title, 
    required this.poster, 
    this.rating, 
    this.overview
  });

  factory Movie.fromJson(Map<String, dynamic> json) {
    return Movie(
      title: json['title'] ?? '',
      poster: json['poster'] ?? '',
      rating: json['rating']?.toDouble(),
      overview: json['overview'],
    );
  }
}

class MovieDetailsResponse {
  final Movie searchedMovie;
  final List<Movie> recommendations;

  MovieDetailsResponse({
    required this.searchedMovie,
    required this.recommendations,
  });

  factory MovieDetailsResponse.fromJson(Map<String, dynamic> json) {
    return MovieDetailsResponse(
      searchedMovie: Movie.fromJson(json['searched_movie']),
      recommendations: (json['recommendations'] as List<dynamic>?)
          ?.map((item) => Movie.fromJson(item))
          .toList() ?? [],
    );
  }
}
