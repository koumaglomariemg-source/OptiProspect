import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/api_config.dart';
import 'config/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

class OptiProspectApp extends StatelessWidget {
  const OptiProspectApp({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    final auth = context.watch<AuthProvider>();
    final mode = theme.loaded ? theme.mode : ThemeMode.light;

    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(Brightness.light),
      darkTheme: buildAppTheme(Brightness.dark),
      themeMode: mode,
      home: auth.booting
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : auth.isLoggedIn
              ? const MainShell()
              : const LoginScreen(),
    );
  }
}