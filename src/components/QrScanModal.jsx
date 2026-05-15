import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function QrScanModal({ open, title = 'Scan QR', onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [errorText, setErrorText] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const canUseDetector = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }, []);

  useEffect(() => {
    if (!open) return;
    setErrorText('');
    if (!canUseDetector) {
      setErrorText('QR scanning is not supported in this browser. Please paste the QR text instead.');
      return;
    }

    let cancelled = false;
    let timer = null;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      const s = streamRef.current;
      streamRef.current = null;
      if (s) {
        for (const t of s.getTracks()) t.stop();
      }
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };

    const start = async () => {
      setIsStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }

        timer = setInterval(async () => {
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return;
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h) return;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, w, h);
            const results = await detector.detect(canvas);
            const first = Array.isArray(results) ? results[0] : null;
            const rawValue = first?.rawValue ? String(first.rawValue) : '';
            if (rawValue) {
              stop();
              onScan?.(rawValue);
              onClose?.();
            }
          } catch {
            // keep scanning
          }
        }, 250);
      } catch (err) {
        setErrorText(err?.message || 'Could not access camera.');
      } finally {
        setIsStarting(false);
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, canUseDetector, onClose, onScan]);

  if (!open) return null;

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(520px, 96vw)',
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 30px 80px rgba(0,0,0,0.28)',
          padding: '14px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 1100, color: '#111827' }}>{title}</div>
          <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 12px', fontWeight: 900 }}>
            Close
          </button>
        </div>

        {errorText ? (
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 900, color: '#dc2626' }}>{errorText}</div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                background: '#0b1220',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280', fontWeight: 900 }}>
              {isStarting ? 'Starting camera...' : 'Point the camera at the QR code.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

