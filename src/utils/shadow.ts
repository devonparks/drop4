export function boxShadow(color: string, opacity: number, x: number, y: number, blur: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb(')) return `${x}px ${y}px ${blur}px ${color}`;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `${x}px ${y}px ${blur}px rgba(${r},${g},${b},${opacity})`;
}
