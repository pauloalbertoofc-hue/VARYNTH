export type BezierFrame = { x: number; y: number; width: number; height: number };

export function cubicBezierPath(frame: BezierFrame): string {
  return `M ${frame.x} ${frame.y + frame.height} C ${frame.x + frame.width * 0.25} ${frame.y - frame.height * 0.2}, ${frame.x + frame.width * 0.75} ${frame.y + frame.height * 1.2}, ${frame.x + frame.width} ${frame.y}`;
}

