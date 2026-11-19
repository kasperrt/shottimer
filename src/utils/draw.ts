interface Props {
  canvas: HTMLCanvasElement;
  x: number[];
  y: number[];
  drag: boolean[];
  color: string;
  full?: boolean;
}

export function draw({ canvas, x, y, drag, color, full }: Props) {
  const context = canvas.getContext('2d');
  if (!context || !x.length) return;
  context.strokeStyle = color;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.lineWidth = 5;
  context.beginPath();
  const first = full ? 0 : x.length - 1;
  for (let i = first; i < x.length; i++) {
    if (!drag[i] || i === 0) {
      context.moveTo(x[i] - 1, y[i]);
    } else if (i === first) {
      context.moveTo(x[i - 1], y[i - 1]);
    }
    context.lineTo(x[i], y[i]);
  }
  context.stroke();
}
