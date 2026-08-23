import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import 'audit_log_screen.dart';
import 'clients_screen.dart';
import 'dashboard_screen.dart';
import 'day_screen.dart';
import 'devis_screen.dart';
import 'kanban_screen.dart';
import 'meetings_screen.dart';
import 'notifications_screen.dart';
import 'map_screen.dart';
import 'pipeline_templates_screen.dart';
import 'portefeuilles_screen.dart';
import 'profile_screen.dart';
import 'referentiels_screen.dart';
import 'reports_screen.dart';
import 'search_screen.dart';
import 'team_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadUnread();
  }

  Future<void> _loadUnread() async {
    final api = context.read<AuthProvider>().api;
    try {
      final count = await api.unreadCount();
      if (mounted) setState(() => _unreadCount = count);
    } catch (_) {}
  }

  List<Destination> _tabs(AuthProvider auth) {
    final u = auth.user;
    if (u == null) return [];
    if (u.isAdmin) {
      return const [
        Destination(DashboardScreen(), Icons.dashboard_outlined, Icons.dashboard, 'Dashboard', section: 'Pilotage'),
        Destination(TeamScreen(), Icons.people_outline, Icons.people, 'Équipe', section: 'Pilotage'),
        Destination(ReferentielsScreen(), Icons.storage_outlined, Icons.storage, 'Référentiels', section: 'Configuration'),
        Destination(PipelineTemplatesScreen(), Icons.linear_scale_outlined, Icons.linear_scale, 'Modèles', section: 'Configuration'),
        Destination(AuditLogScreen(), Icons.history_outlined, Icons.history, 'Audit', section: 'Configuration'),
        Destination(ProfileScreen(), Icons.person_outline, Icons.person, 'Profil', section: 'Compte'),
      ];
    }
    if (u.isManager) {
      return [
        const Destination(DashboardScreen(), Icons.dashboard_outlined, Icons.dashboard, 'Dashboard'),
        const Destination(DayScreen(), Icons.today_outlined, Icons.today, 'Ma journée'),
        const Destination(MapScreen(embedded: true), Icons.map_outlined, Icons.map, 'Carte'),
        const Destination(DevisScreen(), Icons.request_quote_outlined, Icons.request_quote, 'Devis'),
        const Destination(SearchScreen(), Icons.search_outlined, Icons.search, 'Recherche', section: 'Clientèle'),
        const Destination(ClientsScreen(), Icons.verified_outlined, Icons.verified, 'Clients', section: 'Clientèle'),
        const Destination(PortefeuillesScreen(), Icons.people_alt_outlined, Icons.people_alt, 'Portefeuilles', section: 'Clientèle'),
        const Destination(ReportsScreen(), Icons.description_outlined, Icons.description, 'Rapports', section: 'Pilotage'),
        const Destination(MeetingsScreen(), Icons.event_outlined, Icons.event, 'Réunions', section: 'Animation'),
        const Destination(ProfileScreen(), Icons.person_outline, Icons.person, 'Profil', section: 'Compte'),
      ];
    }
    return const [
      Destination(KanbanScreen(), Icons.table_chart_outlined, Icons.table_chart, 'Tableau'),
      Destination(DayScreen(), Icons.today_outlined, Icons.today, 'Ma journée'),
      Destination(MapScreen(), Icons.map_outlined, Icons.map, 'Carte'),
      Destination(DevisScreen(), Icons.request_quote_outlined, Icons.request_quote, 'Devis'),
      Destination(DashboardScreen(), Icons.dashboard_outlined, Icons.dashboard, 'Dashboard', section: 'Pilotage'),
      Destination(ReportsScreen(), Icons.description_outlined, Icons.description, 'Rapports', section: 'Pilotage'),
      Destination(SearchScreen(), Icons.search_outlined, Icons.search, 'Recherche', section: 'Clientèle'),
      Destination(ClientsScreen(), Icons.verified_outlined, Icons.verified, 'Clients', section: 'Clientèle'),
      Destination(MeetingsScreen(), Icons.event_outlined, Icons.event, 'Réunions', section: 'Clientèle'),
      Destination(ProfileScreen(), Icons.person_outline, Icons.person, 'Profil', section: 'Compte'),
    ];
  }

  void _openNotifications() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const NotificationsScreen()))
        .then((_) => _loadUnread());
  }

  void _openProfile() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final user = auth.user;
    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final tabs = _tabs(auth);
    final visible = tabs.length > 5 ? tabs.sublist(0, 5) : tabs;
    final more = tabs.length > 5 ? tabs.sublist(5) : <Destination>[];
    final active = _index < visible.length ? _index : 0;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 19,
          fontWeight: FontWeight.w700,
        ),
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [kPrimaryDark, kPrimary, kAccent],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              stops: const [0.0, 0.55, 1.0],
            ),
          ),
        ),
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset('assets/icons/icon-192.png', width: 24, height: 24, fit: BoxFit.cover),
            ),
            const SizedBox(width: 8),
            Text(visible[active].label),
          ],
        ),
        actions: [
          if (user.role != 'admin')
            IconButton(
              icon: const Icon(Icons.search),
              tooltip: 'Rechercher',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SearchScreen()),
              ),
            ),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                tooltip: 'Notifications',
                onPressed: _openNotifications,
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: IgnorePointer(
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      child: Text(
                        _unreadCount > 9 ? '9+' : '$_unreadCount',
                        style: const TextStyle(
                            color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: Icon(theme.isDark ? Icons.light_mode : Icons.dark_mode),
            tooltip: theme.isDark ? 'Mode clair' : 'Mode sombre',
            onPressed: theme.toggle,
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'profile') _openProfile();
              if (value == 'logout') auth.logout();
            },
            itemBuilder: (context) {
              final scheme = Theme.of(context).colorScheme;
              return [
                PopupMenuItem(
                  value: 'profile',
                  child: Row(
                    children: [
                      Icon(Icons.person, color: scheme.onSurface),
                      const SizedBox(width: 12),
                      Text('Profil', style: TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'logout',
                  child: Row(
                    children: [
                      Icon(Icons.logout, color: scheme.error),
                      const SizedBox(width: 12),
                      Text('Se déconnecter', style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ];
            },
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
            color: Theme.of(context).colorScheme.surface,
            elevation: 8,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(
                  user.initials(),
                  style: const TextStyle(color: kPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: active, children: [for (final t in visible) t.screen]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: active,
        onDestinationSelected: (i) {
          if (more.isNotEmpty && i == visible.length) {
            _openMore(user.name, more);
            return;
          }
          setState(() => _index = i);
        },
        destinations: [
          for (final t in visible)
            NavigationDestination(
              icon: Icon(t.icon),
              selectedIcon: Icon(t.selectedIcon),
              label: t.label,
            ),
          if (more.isNotEmpty)
            const NavigationDestination(
              icon: Icon(Icons.more_horiz),
              selectedIcon: Icon(Icons.more_horiz),
              label: 'Plus',
            ),
        ],
      ),
    );
  }

  void _openMore(String userName, List<Destination> more) {
    final scheme = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      backgroundColor: scheme.surfaceContainerHigh,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: kPrimary.withValues(alpha: 0.15),
                    child: Text(
                      userName.isEmpty ? '?' : userName[0].toUpperCase(),
                      style: const TextStyle(color: kPrimary, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      userName,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Divider(color: scheme.outlineVariant),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < more.length; i++) ...[
                      if (more[i].section != null &&
                          (i == 0 || more[i].section != more[i - 1].section))
                        Padding(
                          padding: EdgeInsets.only(left: 16, top: i == 0 ? 4 : 12, bottom: 2),
                          child: Text(
                            more[i].section!.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
                            ),
                          ),
                        ),
                      ListTile(
                        leading: Icon(more[i].icon, color: kPrimary),
                        title: Text(more[i].label, style: TextStyle(color: scheme.onSurface)),
                        onTap: () {
                          Navigator.pop(ctx);
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => more[i].screen));
                        },
                      ),
                    ],
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Destination {
  final Widget screen;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String? section;

  const Destination(this.screen, this.icon, this.selectedIcon, this.label, {this.section});
}