import 'package:flutter/material.dart';

import '../services/auth_service.dart';

class ThemeProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  ThemeMode _mode = ThemeMode.light;
  bool _loaded = false;

  ThemeMode get mode => _mode;
  bool get isDark => _mode == ThemeMode.dark;
  bool get loaded => _loaded;

  Future<void> load() async {
    final dark = await _authService.isDarkTheme();
    _mode = dark ? ThemeMode.dark : ThemeMode.light;
    _loaded = true;
    notifyListeners();
  }

  Future<void> toggle() async {
    _mode = _mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await _authService.setDarkTheme(_mode == ThemeMode.dark);
    notifyListeners();
  }
}