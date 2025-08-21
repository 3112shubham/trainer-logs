// QRCodeGenerator.jsx
import { useEffect, useRef } from 'react';

const QRCodeGenerator = ({ value, size = 200 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const generateQRCode = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      
      // Simple QR code simulation (in a real app, use a library like qrcode)
      const cellSize = size / 21;
      
      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      
      // Position markers
      ctx.fillStyle = '#000000';
      
      // Top-left
      ctx.fillRect(0, 0, 7*cellSize, 7*cellSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cellSize, cellSize, 5*cellSize, 5*cellSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect(2*cellSize, 2*cellSize, 3*cellSize, 3*cellSize);
      
      // Top-right
      ctx.fillStyle = '#000000';
      ctx.fillRect(size - 7*cellSize, 0, 7*cellSize, 7*cellSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(size - 6*cellSize, cellSize, 5*cellSize, 5*cellSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect(size - 5*cellSize, 2*cellSize, 3*cellSize, 3*cellSize);
      
      // Bottom-left
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, size - 7*cellSize, 7*cellSize, 7*cellSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cellSize, size - 6*cellSize, 5*cellSize, 5*cellSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect(2*cellSize, size - 5*cellSize, 3*cellSize, 3*cellSize);
      
      // Add text at the bottom
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to register', size/2, size - 10);
    };

    generateQRCode();
  }, [value, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-gray-200 rounded-lg"
      />
      <p className="text-sm text-gray-600 mt-2">Trainer Registration QR Code</p>
    </div>
  );
};

export default QRCodeGenerator;