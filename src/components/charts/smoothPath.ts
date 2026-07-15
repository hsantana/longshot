/**
 * Monotone cubic interpolation (Fritsch–Carlson, like d3's curveMonotoneX):
 * smooth but never overshoots the data, so close-together points with big
 * jumps can't produce loops the way Catmull-Rom does. Shared by every line
 * chart in the app.
 */
export function smoothPath(pts: { x: number; y: number }[]): string {
  // Collapse duplicate x values (e.g. same-day points) to keep slopes finite.
  const p = pts.filter((pt, i) => i === 0 || pt.x > pts[i - 1].x + 1e-6);
  if (p.length === 0) return "";
  if (p.length === 1) return `M${p[0].x},${p[0].y}`;
  const n = p.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(p[i + 1].x - p[i].x);
    slope.push((p[i + 1].y - p[i].y) / dx[i]);
  }
  const t: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      t.push(0);
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  t.push(slope[n - 2]);

  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = p[i].x + dx[i] / 3;
    const c1y = p[i].y + (t[i] * dx[i]) / 3;
    const c2x = p[i + 1].x - dx[i] / 3;
    const c2y = p[i + 1].y - (t[i + 1] * dx[i]) / 3;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p[i + 1].x.toFixed(1)},${p[i + 1].y.toFixed(1)}`;
  }
  return d;
}
