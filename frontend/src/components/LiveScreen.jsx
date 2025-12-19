import { useEffect, useRef, useState } from "react";

export default function LiveScreen() {
  const videoRef = useRef(null);

  const [fpsDisplay, setFpsDisplay] = useState(0);
  const [resolution, setResolution] = useState("");

  const startCapture = async () => {
    try {
      const sourceId = await window.electron.captureScreen();
      
      if (!sourceId) {
        throw new Error('No screen source available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 15,
            maxFrameRate: 15
          }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error capturing screen:", error);
      alert(`Failed to start screen capture: ${error.message}`);
    }
  };

  // FPS calculation
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const measure = () => {
      if (!videoRef.current || !videoRef.current.srcObject) {
        animationId = requestAnimationFrame(measure);
        return;
      }

      frameCount++;
      const now = performance.now();

      if (now - lastTime >= 1000) {
        setFpsDisplay(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      if (videoRef.current && 'requestVideoFrameCallback' in videoRef.current) {
        videoRef.current.requestVideoFrameCallback(measure);
      } else {
        animationId = requestAnimationFrame(measure);
      }
    };

    if (videoRef.current && 'requestVideoFrameCallback' in videoRef.current) {
      videoRef.current.requestVideoFrameCallback(measure);
    } else {
      animationId = requestAnimationFrame(measure);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Resolution detection
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.videoWidth) {
        setResolution(`${video.videoWidth} × ${video.videoHeight}`);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Screenshot capture every 5 seconds
  useEffect(() => {
    const captureAndSend = async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Send to backend
        const formData = new FormData();
        formData.append('screenshot', blob, 'screenshot.png');

        try {
          const response = await fetch('http://localhost:3001/api/screenshot', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          console.log('Screenshot sent:', data);
        } catch (error) {
          console.error('Error sending screenshot:', error);
        }
      }, 'image/png');
    };

    const interval = setInterval(captureAndSend, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    startCapture();
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        style={{
          width: "100%",
          borderRadius: 8,
        }}
        autoPlay
        muted
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.6)",
          color: "#0f0",
          padding: "6px 10px",
          fontFamily: "monospace",
          borderRadius: 6,
        }}
      >
        <div>FPS: {fpsDisplay}</div>
        <div>RES: {resolution}</div>
      </div>
    </div>
  );
}

