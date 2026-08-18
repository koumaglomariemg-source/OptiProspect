import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:fl_chart/fl_chart.dart';

import '../config/app_theme.dart';

Widget _buildBottomTitle(String label, TextStyle style) {
  return Text(label, style: style, maxLines: 1, overflow: TextOverflow.ellipsis);
}

class BarChartWidget extends StatelessWidget {
  final String title;
  final List<(String label, int count)> data;
  final Color color;

  const BarChartWidget({
    super.key,
    required this.title,
    required this.data,
    this.color = kPrimary,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();
    final maxN = data.fold<int>(1, (m, d) => d.$2 > m ? d.$2 : m);
    final scheme = Theme.of(context).colorScheme;
    final labelStyle = TextStyle(fontSize: 10, color: scheme.onSurfaceVariant);

    return Card(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: scheme.onSurface)),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxN.toDouble() * 1.2,
                  barTouchData: BarTouchData(
                    enabled: !kIsWeb,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => scheme.surfaceContainerHighest,
                      tooltipBorderRadius: BorderRadius.circular(8),
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final label = data[groupIndex].$1;
                        return BarTooltipItem(
                          '$label\n${rod.toY.toInt()}',
                          TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600, fontSize: 12),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= data.length) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: _buildBottomTitle(data[value.toInt()].$1, labelStyle),
                          );
                        },
                        reservedSize: 36,
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        interval: (maxN / 4).ceilToDouble().clamp(1, maxN.toDouble()),
                        getTitlesWidget: (value, meta) => Text(
                          value.toInt().toString(),
                          style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: (maxN / 4).ceilToDouble().clamp(1, maxN.toDouble()),
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.3),
                      strokeWidth: 0.5,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: data.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.$2.toDouble(),
                          color: color,
                          width: 18,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                          backDrawRodData: BackgroundBarChartRodData(
                            show: true,
                            toY: maxN.toDouble() * 1.2,
                            color: color.withValues(alpha: 0.1),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOutCubic,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TimelineChart extends StatelessWidget {
  final String title;
  final List<(String day, int count)> data;
  final Color color;

  const TimelineChart({
    super.key,
    required this.title,
    required this.data,
    this.color = kPrimary,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();
    final maxN = data.fold<int>(1, (m, d) => d.$2 > m ? d.$2 : m);
    final scheme = Theme.of(context).colorScheme;
    final labelStyle = TextStyle(fontSize: 10, color: scheme.onSurfaceVariant);

    final spots = data.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.$2.toDouble());
    }).toList();

    return Card(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: scheme.onSurface)),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  minX: 0,
                  maxX: (data.length - 1).toDouble(),
                  minY: 0,
                  maxY: maxN.toDouble() * 1.2,
                  lineTouchData: LineTouchData(
                    enabled: !kIsWeb,
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipColor: (_) => scheme.surfaceContainerHighest,
                      tooltipBorderRadius: BorderRadius.circular(8),
                      getTooltipItems: (touchedSpots) {
                        return touchedSpots.map((spot) {
                          final idx = spot.x.toInt();
                          if (idx >= data.length) return null;
                          return LineTooltipItem(
                            '${data[idx].$1}\n${spot.y.toInt()}',
                            TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600, fontSize: 12),
                          );
                        }).whereType<LineTooltipItem>().toList();
                      },
                    ),
                    handleBuiltInTouches: true,
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: (data.length / 6).ceilToDouble().clamp(1, data.length.toDouble()),
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= data.length) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: _buildBottomTitle(data[idx].$1, labelStyle),
                          );
                        },
                        reservedSize: 30,
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        interval: (maxN / 4).ceilToDouble().clamp(1, maxN.toDouble()),
                        getTitlesWidget: (value, meta) => Text(
                          value.toInt().toString(),
                          style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: true,
                    verticalInterval: (data.length / 6).ceilToDouble().clamp(1, data.length.toDouble()),
                    horizontalInterval: (maxN / 4).ceilToDouble().clamp(1, maxN.toDouble()),
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.3),
                      strokeWidth: 0.5,
                    ),
                    getDrawingVerticalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.2),
                      strokeWidth: 0.5,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      curveSmoothness: 0.35,
                      color: color,
                      barWidth: 3,
                      isStrokeCapRound: true,
                      dotData: FlDotData(
                        show: true,
                        getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
                          radius: 4,
                          color: color,
                          strokeWidth: 2,
                          strokeColor: scheme.surface,
                        ),
                      ),
                      belowBarData: BarAreaData(
                        show: true,
                        color: color.withValues(alpha: 0.15),
                        gradient: LinearGradient(
                          colors: [color.withValues(alpha: 0.25), color.withValues(alpha: 0.02)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ],
                ),
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOutCubic,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const KpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: color.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 10),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 11, color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}