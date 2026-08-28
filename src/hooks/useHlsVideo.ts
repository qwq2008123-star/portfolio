import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * Attaches an HLS stream to a <video> element.
 * Uses hls.js when Media Source Extensions are available,
 * otherwise falls back to native HLS playback (Safari/iOS).
 * Returns a ref to spread onto the <video> element.
 */
export function useHlsVideo(src: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src]);

  return videoRef;
}
