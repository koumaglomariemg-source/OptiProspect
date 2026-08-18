import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient api;
  final AuthService _authService = AuthService();

  User? _user;
  String? _token;
  bool _initialized = false;
  bool _booting = true;

  AuthProvider({required this.api}) {
    api.token = null;
  }

  User? get user => _user;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty;
  bool get initialized => _initialized;
  bool get booting => _booting;

  Future<void> bootstrap() async {
    try {
      final token = await _authService.getToken();
      final cachedUser = await _authService.getUser();
      if (token == null || token.isEmpty) return;
      _token = token;
      api.token = token;
      _user = cachedUser;
      try {
        final fresh = await api.me();
        _user = fresh;
        await _authService.saveUser(fresh);
      } catch (_) {
        // Réseau indisponible : on garde l'utilisateur en cache.
      }
    } finally {
      _initialized = true;
      _booting = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    final result = await api.login(email, password);
    await _applyAuth(result.token, result.user);
  }

  Future<void> register(String name, String email, String password) async {
    final result = await api.register(name, email, password);
    await _applyAuth(result.token, result.user);
  }

  Future<void> _applyAuth(String token, User user) async {
    _token = token;
    _user = user;
    api.token = token;
    await _authService.saveSession(token, user);
    notifyListeners();
  }

  Future<void> refreshUser() async {
    if (_token == null) return;
    final fresh = await api.me();
    _user = fresh;
    await _authService.saveUser(fresh);
    notifyListeners();
  }

  Future<void> updateUser(User user) async {
    _user = user;
    await _authService.saveUser(user);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    api.token = null;
    await _authService.clear();
    notifyListeners();
  }
}