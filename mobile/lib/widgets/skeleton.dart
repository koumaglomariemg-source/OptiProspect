import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class Skeleton extends StatefulWidget {
  final double width;
  final double height;
  final double radius;

  const Skeleton({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.radius = AppSpacing.radiusSm,
  });

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
        ..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.07);
    final highlight = isDark ? Colors.white.withValues(alpha: 0.14) : Colors.black.withValues(alpha: 0.035);

    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.radius),
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final t = _controller.value;
            return CustomPaint(
              painter: _ShimmerPainter(
                progress: t,
                base: base,
                highlight: highlight,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ShimmerPainter extends CustomPainter {
  final double progress;
  final Color base;
  final Color highlight;

  _ShimmerPainter({required this.progress, required this.base, required this.highlight});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = base);
    final bandWidth = size.width * 0.6;
    final x = -bandWidth + (size.width + bandWidth * 2) * progress;
    final rect = Rect.fromLTWH(x, 0, bandWidth, size.height);
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: [highlight.withValues(alpha: 0), highlight, highlight.withValues(alpha: 0)],
      ).createShader(rect);
    canvas.drawRect(rect, paint);
  }

  @override
  bool shouldRepaint(_ShimmerPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.base != base || oldDelegate.highlight != highlight;
}

class SkeletonStatGrid extends StatelessWidget {
  final int count;

  const SkeletonStatGrid({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      const gap = AppSpacing.md;
      final columns = constraints.maxWidth > 560 ? 4 : 2;
      final itemWidth = (constraints.maxWidth - gap * (columns - 1)) / columns;
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: [
          for (var i = 0; i < count; i++)
            Container(
              width: itemWidth,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(child: Skeleton(height: 12)),
                      Skeleton(width: 40, height: 40, radius: AppSpacing.radiusMd),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Skeleton(width: itemWidth * 0.55, height: 26),
                  const SizedBox(height: 8),
                  Skeleton(width: itemWidth * 0.35, height: 11),
                ],
              ),
            ),
        ],
      );
    });
  }
}

class SkeletonList extends StatelessWidget {
  final int count;

  const SkeletonList({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < count; i++)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Skeleton(width: 44, height: 44, radius: 22),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Skeleton(width: double.infinity, height: 13),
                      const SizedBox(height: 8),
                      Skeleton(width: 180, height: 11),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Skeleton(width: 64, height: 22, radius: 11),
              ],
            ),
          ),
      ],
    );
  }
}

class SkeletonScreen extends StatelessWidget {
  final bool showStats;

  const SkeletonScreen({super.key, this.showStats = true});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.only(top: AppSpacing.md, bottom: AppSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showStats) ...[
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Skeleton(width: 160, height: 20),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              const SkeletonStatGrid(),
              const SizedBox(height: AppSpacing.lg),
            ],
            const SkeletonList(count: 5),
          ],
        ),
      ),
    );
  }
}
