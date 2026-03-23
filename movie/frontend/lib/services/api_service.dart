import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/movie.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:8000';
  static String? userId;
  static final Uuid _uuid = Uuid();
  static String? _fallbackUserId; // Fallback for web/unsupported platforms

  static Future<void> initUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      userId = prefs.getString('user_id');
      
      if (userId == null) {
        userId = _uuid.v4();
        await prefs.setString('user_id', userId!);
      }
    } catch (e) {
      // Fallback for web or platforms where shared_preferences isn't available
      print('SharedPreferences not available, using fallback: $e');
      if (_fallbackUserId == null) {
        _fallbackUserId = _uuid.v4();
      }
      userId = _fallbackUserId;
    }
  }

  static Future<void> trackClick(int movieId) async {
    if (userId == null || userId!.isEmpty) return;
    
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/track/click?user_id=$userId&movie_id=$movieId'),
      );

      if (response.statusCode != 200) {
        print('Failed to track click: ${response.statusCode}');
      }
    } catch (e) {
      print('Error tracking click: $e');
      // Don't throw error - just log it for development
    }
  }

  static Future<List<Movie>> getSpecialPicks() async {
    if (userId == null || userId!.isEmpty) return [];
    
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/special-picks/$userId'),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonData = json.decode(response.body);
        final List<dynamic> recommendations = jsonData['recommendations'] ?? [];
        return recommendations.map((movie) => Movie.fromJson(movie)).toList();
      } else {
        print('Failed to load special picks: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Error loading special picks: $e');
      return []; // Return empty list on error so UI doesn't break
    }
  }

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

  static Future<List<Movie>> getActorMovies(int actorId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/actor-movies/$actorId'),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonData = json.decode(response.body);
      final List<dynamic> recommendations = jsonData['recommendations'] ?? [];
      return recommendations.map((movie) => Movie.fromJson(movie)).toList();
    } else {
      throw Exception('Failed to load actor movies');
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
