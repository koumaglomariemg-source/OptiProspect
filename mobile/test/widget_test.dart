import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:optiprospect_app/providers/auth_provider.dart';
import 'package:optiprospect_app/providers/theme_provider.dart';
import 'package:optiprospect_app/services/api_client.dart';

void main() {
  testWidgets('App boots to login when no session', (WidgetTester tester) async {
    final theme = ThemeProvider();
    final auth = AuthProvider(api: ApiClient(baseUrl: 'http://127.0.0.1:1'));
    await theme.load();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: theme),
          ChangeNotifierProvider.value(value: auth),
        ],
        child: const MaterialApp(home: SizedBox()),
      ),
    );

    expect(theme.loaded, isTrue);
    expect(auth.booting, isFalse);
  });
}