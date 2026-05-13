import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useAuthStore } from '../store/useAuthStore';

export default function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const template = location.state?.template;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [generated, setGenerated] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [customName, setCustomName] = useState(user?.name || '');
  const [customMessage, setCustomMessage] = useState('Wishing you a wonderful day!');
  const [showShare, setShowShare] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profilePicture || null);
  
  // Advanced Editor Controls
  const [photoX, setPhotoX] = useState(template?.overlayConfig?.profilePicture?.x || 35);
  const [photoY, setPhotoY] = useState(template?.overlayConfig?.profilePicture?.y || 20);
  const [photoSize, setPhotoSize] = useState(template?.overlayConfig?.profilePicture?.width || 30);

  // If no template in state, go back
  useEffect(() => {
    if (!template) navigate('/');
  }, [template]);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const renderCanvas = async () => {
    if (!canvasRef.current || !template) return;
    setRendering(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1080;

      // 1. Draw background template
      const bg = await loadImage(template.thumbnailUrl);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      // 2. Draw user profile picture
      if (photoPreview) {
        const { profilePicture: pc } = template.overlayConfig;
        const photo = await loadImage(photoPreview);
        const x = (photoX / 100) * canvas.width;
        const y = (photoY / 100) * canvas.height;
        const w = (photoSize / 100) * canvas.width;
        // Keep aspect ratio 1:1 for the mask
        const h = w;

        ctx.save();
        ctx.beginPath();
        if (pc.shape === 'circle') {
          ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        } else {
          ctx.roundRect(x, y, w, h, pc.shape === 'rounded' ? 20 : 0);
        }
        ctx.clip();
        ctx.drawImage(photo, x, y, w, h);
        ctx.restore();

        // White border
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw name text
      const { nameText } = template.overlayConfig;
      await document.fonts.ready;
      ctx.save();
      ctx.font = `bold ${nameText.fontSize * 2}px Inter, Arial, sans-serif`;
      ctx.fillStyle = nameText.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(
        customName,
        (nameText.x / 100) * canvas.width,
        (nameText.y / 100) * canvas.height
      );
      
      // 4. Draw Custom Message (Write whatever you want)
      ctx.font = `italic 500 ${nameText.fontSize * 1.2}px Inter, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      // Simple multi-line text wrapping logic
      const words = customMessage.split(' ');
      let line = '';
      let msgY = (nameText.y / 100) * canvas.height + 60;
      const maxWidth = canvas.width * 0.8;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, (nameText.x / 100) * canvas.width, msgY);
          line = words[i] + ' ';
          msgY += nameText.fontSize * 1.5;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, (nameText.x / 100) * canvas.width, msgY);
      
      ctx.restore();

      setGenerated(canvas.toDataURL('image/png', 1.0));
    } catch (err) {
      console.error('Canvas render error:', err);
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    if (template) renderCanvas();
  }, [template, customName, customMessage, photoPreview, photoX, photoY, photoSize]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generated) return;
    const link = document.createElement('a');
    link.href = generated;
    link.download = `greeting-${Date.now()}.png`;
    link.click();
  };

  const handleNativeShare = () => {
    setShowShare(!showShare);
  };

  const copyImageToClipboard = async (appName: string = '') => {
    if (!generated) return;
    try {
      const blob = await (await fetch(generated)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      const targetText = appName ? ` into ${appName}` : '';
      alert(`✅ Image copied! You can now paste (Ctrl+V) directly${targetText}.`);
    } catch {
      alert('⚠️ Failed to copy image. Please use Download instead.');
    }
  };

  if (!template) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6 transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to templates
        </button>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Canvas Preview */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{template.title}</h1>
            <div className="relative rounded overflow-hidden border border-gray-200 aspect-square bg-gray-100">
              <canvas ref={canvasRef} className="hidden" />
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <svg className="animate-spin h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
              {generated && (
                <img src={generated} alt="Generated greeting" className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">✏️ Customize</h2>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                />
              </div>

              {/* Custom Message */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1.5">Custom Message</label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Write whatever you want here..."
                  className="input-field min-h-[80px] resize-y"
                  maxLength={100}
                />
              </div>

              {/* Photo Upload & Advanced Controls */}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm text-gray-800 font-medium">Your Photo</label>
                  {photoPreview && (
                    <button 
                      onClick={() => setPhotoPreview(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
                    )}
                  </div>
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    📷 {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                {/* Sliders for moving the photo */}
                {photoPreview && (
                  <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-200">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Horizontal Position</span>
                        <span>{photoX}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={photoX} onChange={e => setPhotoX(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Vertical Position</span>
                        <span>{photoY}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={photoY} onChange={e => setPhotoY(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Size</span>
                        <span>{photoSize}%</span>
                      </div>
                      <input type="range" min="10" max="80" value={photoSize} onChange={e => setPhotoSize(Number(e.target.value))} className="w-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 mb-2">📤 Share</h2>
              <button onClick={handleNativeShare} disabled={!generated || rendering} className="btn-primary w-full py-3">
                🚀 Share Now
              </button>
              <button onClick={handleDownload} disabled={!generated || rendering} className="btn-secondary w-full py-3">
                ⬇️ Download PNG
              </button>
            </div>

            {/* Share Options Panel */}
            {showShare && generated && (
              <div className="glass-card p-5 mt-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Share via</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      const text = encodeURIComponent('Check out my personalized greeting! Paste the copied image here!');
                      copyImageToClipboard('WhatsApp').then(() => {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                        } else {
                          window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
                        }
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded transition-colors text-xs text-green-700"
                  >
                    <span className="text-xl">💬</span>WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent('My Customized Greeting');
                      const body = encodeURIComponent('I created this awesome greeting. Paste the copied image here!');
                      copyImageToClipboard('Gmail').then(() => {
                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors text-xs text-red-700"
                  >
                    <span className="text-xl">📧</span>Email
                  </button>
                  <button
                    onClick={() => {
                      copyImageToClipboard('Instagram').then(() => {
                        window.open('https://instagram.com/', '_blank');
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 rounded transition-colors text-xs text-fuchsia-700"
                  >
                    <span className="text-xl">📸</span>Instagram
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
