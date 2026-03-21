import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/movie.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8000';

  static Future<MovieDetailsResponse> getRecommendations(String query) async {
    final encodedQuery = Uri.encodeComponent(query);
    final response = await http.get(
      Uri.parse('$baseUrl/recommend/$encodedQuery'),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonData = json.decode(response.body);
      return MovieDetailsResponse.fromJson(jsonData);
    } else {
      throw Exception('Failed to load recommendations');
    }
  }

  static Future<Map<String, List<Movie>>> getHomeMovies() async {
    final response = await http.get(
      Uri.parse('$baseUrl/home-movies'),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonData = json.decode(response.body);
      final Map<String, List<Movie>> result = {};
      
      jsonData.forEach((category, movies) {
        if (movies is List) {
          result[category] = movies.map((movie) => Movie.fromJson(movie)).toList();
        }
      });
      
      return result;
    } else {
      throw Exception('Failed to load home movies');
    }
  }

  static Future<List<String>> getSuggestions(String query) async {
    final encodedQuery = Uri.encodeComponent(query);
    final response = await http.get(
      Uri.parse('$baseUrl/suggestions?query=$encodedQuery'),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonData = json.decode(response.body);
      final List<dynamic> suggestions = jsonData['suggestions'] ?? [];
      return suggestions.map((item) => item.toString()).toList();
    } else {
      throw Exception('Failed to load suggestions');
    }
  }
}
