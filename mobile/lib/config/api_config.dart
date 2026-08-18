import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  static const String _defined = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    if (_defined.isNotEmpty) return _defined;
    if (kIsWeb) return 'http://localhost:4000';
    return 'http://10.0.2.2:4000';
  }

  static const String appName = 'OptiProspect';
  static const String tagline = 'Gestion de prospection commerciale';
}