import { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (onScan) onScan(decodedText);
          },
          () => {}
        );
      } catch {}
    };
    start();

    return () => {
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear(); } catch {}
        });
    };
  }, [onScan]);

  return (
    <div id="reader" style={{ width: '100%' }}>
      <style>{`
        #reader button {
          background: #0084ff !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 10px 14px !important;
          font-weight: 600 !important;
        }
        #reader select, #reader input {
          background: #1f1f1f !important;
          color: #f0f0f0 !important;
          border: 1px solid #333 !important;
          border-radius: 6px !important;
          padding: 6px 8px !important;
        }
        #reader__dashboard_section_csr, #reader__camera_permission_button {
          display: flex; 
          flex-direction: column; 
          gap: 8px;
          align-items: center;
        }
        #reader__scan_region video {
          object-fit: cover !important;
          width: 100% !important;
          height: auto !important;
          max-height: 60vh !important;
          border-radius: 8px !important;
          background: #000 !important;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
