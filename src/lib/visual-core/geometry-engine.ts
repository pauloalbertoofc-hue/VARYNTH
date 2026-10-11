export interface Point2D { x: number; y: number }
export interface Transform2D { x: number; y: number; scaleX: number; scaleY: number; rotation: number }

export function transformPoint(point: Point2D, transform: Transform2D, origin: Point2D = { x: 0, y: 0 }): Point2D {
  const radians = transform.rotation * Math.PI / 180;
  const scaled = { x: (point.x - origin.x) * transform.scaleX, y: (point.y - origin.y) * transform.scaleY };
  return { x: scaled.x * Math.cos(radians) - scaled.y * Math.sin(radians) + origin.x + transform.x, y: scaled.x * Math.sin(radians) + scaled.y * Math.cos(radians) + origin.y + transform.y };
}

export function boundingBox(points: Point2D[]): { x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function snap(value: number, grid: number): number {
  if (!Number.isFinite(grid) || grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

