import { useEffect, useRef, useState } from 'react';
import './FloatingVideo.css';

export function FloatingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (activated) return;

    const activate = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        video.play().catch(() => {});
      }
      setActivated(true);
    };

    document.addEventListener('click', activate, { once: true });
    return () => document.removeEventListener('click', activate);
  }, [activated]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setActivated(true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setActivated(true);
  };

  return (
    <div className="floating-video-wrapper">
      <video
        ref={videoRef}
        className="floating-video"
        src="/paraguay.mp4"
        autoPlay
        loop
        muted
        playsInline
        onClick={toggleMute}
        title="Click para silenciar/activar el audio"
      />
      <input
        type="range"
        className="floating-video-volume"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={handleVolumeChange}
        aria-label="Volumen del video"
        title="Volumen"
      />
    </div>
  );
}
