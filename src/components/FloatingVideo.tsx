import { useEffect, useRef, useState } from 'react';
import './FloatingVideo.css';

export function FloatingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false);

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

  return (
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
  );
}
