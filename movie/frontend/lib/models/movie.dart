class Movie {
  final int id;
  final String title;
  final String poster;
  final double? rating;
  final String? overview;
  final List<Map<String, dynamic>>? cast;

  Movie({
    required this.id,
    required this.title, 
    required this.poster, 
    this.rating, 
    this.overview,
    this.cast
  });

  factory Movie.fromJson(Map<String, dynamic> json) {
    return Movie(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      poster: json['poster'] ?? '',
      rating: json['rating']?.toDouble(),
      overview: json['overview'],
      cast: (json['cast'] as List<dynamic>?)
          ?.map((item) => item as Map<String, dynamic>)
          .toList(),
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
