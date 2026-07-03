import { useEffect, useRef, useState } from 'react';
import './FloatingVideo.css';

export function FloatingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);

  useEffect(() => {
    if (unmuted) return;

    const unmute = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        video.play().catch(() => {});
      }
      setUnmuted(true);
    };

    document.addEventListener('click', unmute, { once: true });
    return () => document.removeEventListener('click', unmute);
  }, [unmuted]);

  return (
    <video
      ref={videoRef}
      className="floating-video"
      src="/paraguay.mp4"
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
