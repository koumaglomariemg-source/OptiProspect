import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/models.dart';
import '../utils/formatters.dart';

class ApiException implements Exception {
  final String message;
  final bool unauthorized;
  ApiException(this.message, {this.unauthorized = false});

  @override
  String toString() => message;
}

class ApiClient {
  final String baseUrl;
  String? token;

  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  Map<String, String> _headers({bool json = false}) {
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (token != null && token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final q = query != null && query.isNotEmpty ? query : null;
    return Uri.parse('$baseUrl$path').replace(
      queryParameters: q?.map((key, value) {
        if (value is Iterable) {
          return MapEntry(key, value.map((e) => e.toString()).toList());
        }
        return MapEntry(key, value.toString());
      }),
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final res = await http.get(_uri(path, query), headers: _headers());
    return _decode(res);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final res = await http.post(
      _uri(path),
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    final res = await http.patch(
      _uri(path),
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> put(String path, {Object? body}) async {
    final res = await http.put(
      _uri(path),
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await http.delete(_uri(path), headers: _headers());
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final data = res.body.isEmpty ? null : _tryJson(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    final message = (data is Map && data['error'] is String)
        ? data['error'] as String
        : 'Erreur serveur (${res.statusCode})';
    throw ApiException(message, unauthorized: res.statusCode == 401);
  }

  dynamic _tryJson(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  List<Map<String, dynamic>> _rows(dynamic data) {
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  // --- Auth ---
  Future<({User user, String token})> login(
    String email,
    String password,
  ) async {
    final data = await post(
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return _authResult(data);
  }

  Future<({User user, String token})> register(
    String name,
    String email,
    String password,
  ) async {
    final data = await post(
      '/api/auth/register',
      body: {'name': name, 'email': email, 'password': password},
    );
    return _authResult(data);
  }

  ({User user, String token}) _authResult(dynamic data) {
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    final t = data['token'] as String;
    token = t;
    return (user: user, token: t);
  }

  Future<User> me() async {
    final data = await get('/api/auth/me');
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  // --- Profil ---
  Future<User> profile() async {
    final data = await get('/api/users/me');
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<User> updateProfile(Map<String, dynamic> body) async {
    final data = await patch('/api/users/me', body: body);
    return User.fromJson(data as Map<String, dynamic>);
  }

  // --- Prospects ---
  Future<(List<Prospect>, int?)> prospects({
    String? search,
    String? stage,
    String? source,
    int? assignedToId,
    String? dateFrom,
    String? dateTo,
    String? nextActionFrom,
    String? nextActionTo,
    bool? contratDepose,
    bool? contratSigne,
    bool? optionFraisScolaire,
    int? page,
    int? limit,
  }) async {
    final query = <String, dynamic>{};
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (stage != null && stage.isNotEmpty) query['stage'] = stage;
    if (source != null && source.isNotEmpty) query['source'] = source;
    if (assignedToId != null) query['assigned_to'] = assignedToId;
    if (dateFrom != null && dateFrom.isNotEmpty)
      query['dateProspectionFrom'] = dateFrom;
    if (dateTo != null && dateTo.isNotEmpty)
      query['dateProspectionTo'] = dateTo;
    if (nextActionFrom != null && nextActionFrom.isNotEmpty)
      query['prochainRdvFrom'] = nextActionFrom;
    if (nextActionTo != null && nextActionTo.isNotEmpty)
      query['prochainRdvTo'] = nextActionTo;
    if (contratDepose != null)
      query['contrat_depose'] = contratDepose ? 'true' : 'false';
    if (contratSigne != null)
      query['contrat_signe'] = contratSigne ? 'true' : 'false';
    if (optionFraisScolaire != null) {
      query['option_frais_scolaire'] = optionFraisScolaire ? 'true' : 'false';
    }
    if (page != null) query['page'] = page;
    if (limit != null) query['limit'] = limit;
    final data = await get('/api/prospects', query: query);
    if (data is Map && data['data'] is List) {
      final rows = (data['data'] as List)
          .whereType<Map<String, dynamic>>()
          .toList();
      final total = toInt(data['total']);
      return (rows.map((e) => Prospect.fromJson(e)).toList(), total);
    }
    final rows = data is List
        ? data.whereType<Map<String, dynamic>>().toList()
        : <Map<String, dynamic>>[];
    return (rows.map((e) => Prospect.fromJson(e)).toList(), null);
  }

  Future<Prospect> prospect(int id) async {
    final data = await get('/api/prospects/$id');
    return Prospect.fromJson(data as Map<String, dynamic>);
  }

  Future<Prospect> createProspect(Map<String, dynamic> body) async {
    final data = await post('/api/prospects', body: body);
    return Prospect.fromJson(data as Map<String, dynamic>);
  }

  Future<Prospect> updateProspect(int id, Map<String, dynamic> body) async {
    final data = await patch('/api/prospects/$id', body: body);
    return Prospect.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteProspect(int id) async {
    await delete('/api/prospects/$id');
  }

  Future<void> updateProspectStage(int id, String stage) async {
    await patch('/api/prospects/$id', body: {'stage': stage});
  }

  Future<Prospect> markRelanceDone(int id) async {
    final data = await post('/api/prospects/$id/relance-done');
    return Prospect.fromJson(data as Map<String, dynamic>);
  }

  // --- Étapes pipeline ---
  Future<List<StepProgress>> steps(int prospectId) async {
    final data = await get('/api/prospects/$prospectId/steps');
    return _rows(data).map((e) => StepProgress.fromJson(e)).toList();
  }

  Future<void> saveStep(int progressId, Map<String, dynamic> data) async {
    await put('/api/steps/$progressId', body: {'data': data});
  }

  Future<void> validateStep(int progressId) async {
    await post('/api/steps/$progressId/validate');
  }

  Future<void> unvalidateStep(int progressId) async {
    await post('/api/steps/$progressId/unvalidate');
  }

  // --- Interactions & historique ---
  Future<List<Interaction>> interactions(int prospectId) async {
    final data = await get('/api/prospects/$prospectId/interactions');
    return _rows(data).map((e) => Interaction.fromJson(e)).toList();
  }

  Future<Interaction> addInteraction(
    int prospectId,
    Map<String, dynamic> body,
  ) async {
    final data = await post(
      '/api/prospects/$prospectId/interactions',
      body: body,
    );
    return Interaction.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteInteraction(int id) async {
    await delete('/api/interactions/$id');
  }

  Future<List<ProspectEvent>> events(int prospectId) async {
    final data = await get('/api/prospects/$prospectId/events');
    return _rows(data).map((e) => ProspectEvent.fromJson(e)).toList();
  }

  // --- Messages ---
  Future<MessageSuggestion> suggestMessage(int id) async {
    final data = await get('/api/prospects/$id/suggest-message');
    return MessageSuggestion.fromJson(data as Map<String, dynamic>);
  }

  Future<MessageResult> sendMessage(int id, Map<String, dynamic> body) async {
    final data = await post('/api/prospects/$id/send-message', body: body);
    if (data is Map<String, dynamic>) return MessageResult.fromJson(data);
    return const MessageResult(
      channel: 'email',
      delivered: false,
      skipped: true,
    );
  }

  // --- Devis ---
  Future<List<Devis>> devis({
    int? prospectId,
    String? statut,
    String? search,
  }) async {
    final query = <String, dynamic>{};
    if (prospectId != null) query['prospect_id'] = prospectId;
    if (statut != null && statut.isNotEmpty) query['statut'] = statut;
    if (search != null && search.isNotEmpty) query['search'] = search;
    final data = await get('/api/devis', query: query);
    return _rows(data).map((e) => Devis.fromJson(e)).toList();
  }

  Future<Devis> createDevis(Map<String, dynamic> body) async {
    final data = await post('/api/devis', body: body);
    return Devis.fromJson(data as Map<String, dynamic>);
  }

  Future<Devis> updateDevis(int id, Map<String, dynamic> body) async {
    final data = await patch('/api/devis/$id', body: body);
    return Devis.fromJson(data as Map<String, dynamic>);
  }

  Future<Devis> submitDevis(int id) async {
    final data = await post('/api/devis/$id/submit');
    return Devis.fromJson(data as Map<String, dynamic>);
  }

  Future<Devis> validateDevis(int id, {String comment = ''}) async {
    final data = await post(
      '/api/devis/$id/validate',
      body: {'comment': comment},
    );
    return Devis.fromJson(data as Map<String, dynamic>);
  }

  Future<Devis> refuseDevis(int id, {String comment = ''}) async {
    final data = await post(
      '/api/devis/$id/refuse',
      body: {'comment': comment},
    );
    return Devis.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteDevis(int id) async {
    await delete('/api/devis/$id');
  }

  // --- Réunions ---
  Future<List<Meeting>> meetings({String? type}) async {
    final query = type != null && type.isNotEmpty ? {'type': type} : null;
    final data = await get('/api/meetings', query: query);
    return _rows(data).map((e) => Meeting.fromJson(e)).toList();
  }

  Future<Meeting> createMeeting(Map<String, dynamic> body) async {
    final data = await post('/api/meetings', body: body);
    return Meeting.fromJson(data as Map<String, dynamic>);
  }

  Future<Meeting> updateMeeting(int id, Map<String, dynamic> body) async {
    final data = await put('/api/meetings/$id', body: body);
    return Meeting.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteMeeting(int id) async {
    await delete('/api/meetings/$id');
  }

  // --- Notifications ---
  Future<List<AppNotification>> notifications() async {
    final data = await get('/api/notifications');
    return _rows(data).map((e) => AppNotification.fromJson(e)).toList();
  }

  Future<int> unreadCount() async {
    final data = await get('/api/notifications/unread-count');
    return toInt(data['count']) ?? 0;
  }

  Future<void> markNotificationRead(int id) async {
    await patch('/api/notifications/$id/read');
  }

  Future<void> readAllNotifications() async {
    await post('/api/notifications/read-all');
  }

  Future<void> deleteNotification(int id) async {
    await delete('/api/notifications/$id');
  }

  // --- Rappels ---
  Future<List<Prospect>> reminders() async {
    final data = await get('/api/reminders');
    return _rows(data).map((e) => Prospect.fromJson(e)).toList();
  }

  // --- Stats / Dashboard ---
  Future<StatsOverview> statsOverview([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/overview',
      query: params.isEmpty ? null : params,
    );
    return StatsOverview.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ByUserStat>> statsByUser([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/by-user',
      query: params.isEmpty ? null : params,
    );
    return _rows(data).map((e) => ByUserStat.fromJson(e)).toList();
  }

  Future<List<TimelinePoint>> statsTimeline(
    int days, [
    Map<String, dynamic> params = const {},
  ]) async {
    final query = {'days': days, ...params};
    final data = await get('/api/stats/timeline', query: query);
    return _rows(data).map((e) => TimelinePoint.fromJson(e)).toList();
  }

  Future<Forecast> statsForecast([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/forecast',
      query: params.isEmpty ? null : params,
    );
    return Forecast.fromJson(data as Map<String, dynamic>);
  }

  Future<TargetsResult> statsTargets(
    String yearMonth, [
    Map<String, dynamic> params = const {},
  ]) async {
    final query = {'year_month': yearMonth, ...params};
    final data = await get('/api/stats/targets', query: query);
    return TargetsResult.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ClientInfo>> clients([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/clients',
      query: params.isEmpty ? null : params,
    );
    return _rows(data).map((e) => ClientInfo.fromJson(e)).toList();
  }

  Future<List<AtRiskItem>> statsAtRisk([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/at-risk',
      query: params.isEmpty ? null : params,
    );
    return _rows(data).map((e) => AtRiskItem.fromJson(e)).toList();
  }

  Future<AgingStats> statsAging([
    Map<String, dynamic> params = const {},
  ]) async {
    final data = await get(
      '/api/stats/aging',
      query: params.isEmpty ? null : params,
    );
    return AgingStats.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> statsCounts() async {
    final data = await get('/api/stats/counts');
    return data is Map<String, dynamic> ? data : {};
  }

  Future<Map<String, dynamic>> statsProspection([
    int days = 30,
    Map<String, dynamic> params = const {},
  ]) async {
    final query = {'days': days, ...params};
    final data = await get('/api/stats/prospection', query: query);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<DayData> day() async {
    final data = await get('/api/day');
    return DayData.fromJson(data as Map<String, dynamic>);
  }

  Future<void> setTarget(
    int userId,
    String yearMonth,
    double targetValue,
  ) async {
    await put(
      '/api/users/$userId/target',
      body: {'year_month': yearMonth, 'target_value': targetValue},
    );
  }

  Future<void> deleteTarget(int userId, String yearMonth) async {
    await delete('/api/users/$userId/target/$yearMonth');
  }

  // --- Public (sans authentification requise) ---
  Future<Map<String, dynamic>> publicProspectInfo(int id, String token) async {
    final data = await get(
      '/api/public/prospects/$id/info',
      query: {'token': token},
    );
    return data is Map<String, dynamic> ? data : {};
  }

  Future<Map<String, dynamic>> publicRespond(
    int id,
    Map<String, dynamic> body,
  ) async {
    final data = await post('/api/public/prospects/$id/respond', body: body);
    return data is Map<String, dynamic> ? data : {};
  }

  // --- Rapports ---
  Future<List<Report>> reports({String? status}) async {
    final query = status != null && status.isNotEmpty
        ? {'status': status}
        : null;
    final data = await get('/api/reports', query: query);
    return _rows(data).map((e) => Report.fromJson(e)).toList();
  }

  Future<Report> createReport(Map<String, dynamic> body) async {
    final data = await post('/api/reports', body: body);
    return Report.fromJson(data as Map<String, dynamic>);
  }

  Future<Report> reviewReport(
    int id,
    String decision, {
    String comment = '',
  }) async {
    final data = await post(
      '/api/reports/$id/review',
      body: {'decision': decision, 'comment': comment},
    );
    return Report.fromJson(data as Map<String, dynamic>);
  }

  // --- Réglages / Admin ---
  Future<Settings> settings() async {
    final data = await get('/api/settings');
    return Settings.fromJson(data as Map<String, dynamic>);
  }

  Future<List<StageSetting>> stages() async {
    final data = await get('/api/settings/stages');
    return _rows(data).map((e) => StageSetting.fromJson(e)).toList();
  }

  Future<void> updateSetting(String key, dynamic value) async {
    await put('/api/settings/$key', body: {'value': value});
  }

  Future<List<AuditLogEntry>> auditLog() async {
    final data = await get('/api/settings/audit');
    return _rows(data).map((e) => AuditLogEntry.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> backup() async {
    final data = await get('/api/settings/backup');
    return data is Map<String, dynamic> ? data : {};
  }

  // --- Pipeline templates ---
  Future<List<PipelineTemplate>> pipelineTemplates() async {
    final data = await get('/api/pipeline-templates');
    return _rows(data).map((e) => PipelineTemplate.fromJson(e)).toList();
  }

  Future<PipelineTemplate> createPipelineTemplate(
    Map<String, dynamic> body,
  ) async {
    final data = await post('/api/pipeline-templates', body: body);
    return PipelineTemplate.fromJson(data as Map<String, dynamic>);
  }

  Future<PipelineTemplate> updatePipelineTemplate(
    int id,
    Map<String, dynamic> body,
  ) async {
    final data = await put('/api/pipeline-templates/$id', body: body);
    return PipelineTemplate.fromJson(data as Map<String, dynamic>);
  }

  Future<void> setDefaultPipelineTemplate(int id) async {
    await post('/api/pipeline-templates/$id/default');
  }

  Future<void> deletePipelineTemplate(int id) async {
    await delete('/api/pipeline-templates/$id');
  }

  // --- Utilisateurs ---
  Future<List<User>> users() async {
    final data = await get('/api/users');
    return _rows(data).map((e) => User.fromJson(e)).toList();
  }

  Future<UserDetail> userDetail(int id) async {
    final data = await get('/api/users/$id');
    return UserDetail.fromJson(data as Map<String, dynamic>);
  }

  Future<({User user, String emailStatus})> createUser(
    Map<String, dynamic> body,
  ) async {
    final data = await post('/api/users', body: body);
    final m = data as Map<String, dynamic>;
    return (
      user: User.fromJson(m),
      emailStatus: (m['email_status'] as String?) ?? 'unknown',
    );
  }

  Future<User> updateUser(int id, Map<String, dynamic> body) async {
    final data = await patch('/api/users/$id', body: body);
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteUser(int id) async {
    await delete('/api/users/$id');
  }

  Future<Map<String, dynamic>> importProspects(List<int> bytes) async {
    final uri = Uri.parse('$baseUrl/api/prospects/import');
    final request = http.MultipartRequest('POST', uri)
      ..headers.addAll(_headers())
      ..files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: 'prospects.csv'),
      );
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _decode(response);
  }
}
