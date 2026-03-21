import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
void main() {
  runApp(const MovieRecommenderApp());
}

class MovieRecommenderApp extends StatelessWidget {
  const MovieRecommenderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Movie Recommender',
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
