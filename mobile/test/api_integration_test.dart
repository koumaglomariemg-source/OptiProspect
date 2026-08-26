// Test d'intégration : ApiClient mobile contre l'API locale live.
// Lancer : flutter test test/api_integration_test.dart
// Prérequis : API démarrée sur http://localhost:4000 (npm run dev à la racine).
import 'package:flutter_test/flutter_test.dart';
import 'package:optiprospect_app/services/api_client.dart';

void main() {
  final api = ApiClient(baseUrl: 'http://localhost:4000');

  group('API live — auth', () {
    test('login invalide rejeté', () async {
      expect(
        () => api.login('faux@test.io', 'mauvais'),
        throwsA(isA<ApiException>()),
      );
    });

    test('login commercial OK', () async {
      final res = await api.login('commercial@test.io', 'commercial123');
      expect(res.user.role, 'commercial');
      expect(res.token, isNotEmpty);
    });

    test('me() renvoie le profil', () async {
      final user = await api.me();
      expect(user.email, 'commercial@test.io');
    });
  });

  group('API live — prospects (commercial)', () {
    test('liste des prospects', () async {
      final (rows, _) = await api.prospects();
      expect(rows, isNotEmpty);
      expect(rows.first.name, isNotEmpty);
    });

    test('recherche paginée (bug LIMIT corrigé)', () async {
      final (rows, total) = await api.prospects(
        search: 'Prospect2',
        page: 1,
        limit: 25,
      );
      expect(total, isNotNull);
      expect(rows.any((p) => p.name.contains('Prospect2')), isTrue);
    });

    test('création + mise à jour + suppression', () async {
      final created = await api.createProspect({
        'first_name': 'Api',
        'last_name': 'MobileTest',
        'company': 'TestCo',
        'product': 'Logiciel',
        'value': 50000,
      });
      expect(created.id, greaterThan(0));
      final updated = await api.updateProspect(created.id, {'value': 75000});
      expect(updated.value, 75000);
      await api.deleteProspect(created.id);
    });

    test('étapes du pipeline chargées', () async {
      final (rows, _) = await api.prospects(limit: 1, page: 1);
      final steps = await api.steps(rows.first.id);
      expect(steps, isNotEmpty);
    });
  });

  group('API live — stats & journée', () {
    test('statsOverview', () async {
      final s = await api.statsOverview();
      expect(s, isNotNull);
    });

    test('statsTargets (bug GROUP BY/ordre params corrigé)', () async {
      final t = await api.statsTargets('2026-08');
      expect(t.users, isNotEmpty);
    });

    test('statsCounts (nouvel endpoint mobile)', () async {
      final c = await api.statsCounts();
      expect(c['users'], greaterThan(0));
    });

    test('statsProspection (nouvel endpoint mobile)', () async {
      final p = await api.statsProspection(30);
      expect(p, isA<Map<String, dynamic>>());
    });

    test('day() agrège la journée', () async {
      final d = await api.day();
      expect(d, isNotNull);
    });
  });

  group('API live — réglages & devis', () {
    test('stages du tunnel', () async {
      final stages = await api.stages();
      expect(stages, isNotEmpty);
    });

    test('settings avec automatisations (modèle étendu)', () async {
      final s = await api.settings();
      expect(s.stages, isNotEmpty);
      expect(s.automationRelanceDays, isNotEmpty);
    });

    test('liste des devis', () async {
      final devis = await api.devis();
      expect(devis, isA<List>());
    });

    test('notifications + compteur', () async {
      final count = await api.unreadCount();
      expect(count, greaterThanOrEqualTo(0));
    });
  });
}
