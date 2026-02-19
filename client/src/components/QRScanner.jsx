import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        videoConstraints: {
            facingMode: "environment"
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    );
    
    scanner.render((decodedText) => {
        if (onScan) onScan(decodedText);
        scanner.clear();
    }, (error) => {
        // console.warn(error);
    });

    return () => {
        try {
            scanner.clear();
        } catch (e) {
            // ignore
        }
    };
  }, [onScan]);

  return <div id="reader" style={{ width: '100%' }}></div>;
};

export default QRScanner;
