import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

class AuthService {
  static const _tokenKey = 'optiprospect_token';
  static const _userKey = 'optiprospect_user';
  static const _themeKey = 'pf_theme_dark';

  Future<void> saveSession(String token, User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode({
      'id': user.id,
      'name': user.name,
      'email': user.email,
      'role': user.role,
      'first_name': user.first_name,
      'last_name': user.last_name,
      'avatar': user.avatar,
      'manager_id': user.manager_id,
      'manager_name': user.manager_name,
    }));
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveUser(User user) => saveSessionForUser(user);

  Future<void> saveSessionForUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode({
      'id': user.id,
      'name': user.name,
      'email': user.email,
      'role': user.role,
      'first_name': user.first_name,
      'last_name': user.last_name,
      'avatar': user.avatar,
      'manager_id': user.manager_id,
      'manager_name': user.manager_name,
    }));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  Future<bool> isDarkTheme() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_themeKey) ?? false;
  }

  Future<void> setDarkTheme(bool dark) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_themeKey, dark);
  }
}