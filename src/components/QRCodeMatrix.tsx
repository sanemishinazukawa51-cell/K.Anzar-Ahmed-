import { useMemo } from 'react';
import QRCode from 'qrcode';

interface QRCodeMatrixProps {
  payload: string;
  size?: number;
  className?: string;
}

export function QRCodeMatrix({
  payload,
  size = 180,
  className = '',
}: QRCodeMatrixProps) {
  const matrix = useMemo(() => {
    try {
      const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const data = qr.modules.data;
      const cells: { x: number; y: number }[] = [];
      for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
          if (data[y * count + x]) {
            cells.push({ x, y });
          }
        }
      }
      return { count, cells };
    } catch {
      return { count: 21, cells: [] };
    }
  }, [payload]);

  const quietZone = 2;
  const viewBoxSize = matrix.count + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={`block bg-white ${className}`}
      role="img"
      aria-label={`QR pickup pass for ${payload}`}
      shapeRendering="crispEdges"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />
      {matrix.cells.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.x + quietZone}
          y={cell.y + quietZone}
          width={1}
          height={1}
          fill="#092118"
        />
      ))}
    </svg>
  );
}
