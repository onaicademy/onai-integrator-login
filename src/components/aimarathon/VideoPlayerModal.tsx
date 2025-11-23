import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Maximize, Minimize, Play, Pause } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
}

const VideoPlayerModal = ({ isOpen, onClose, videoUrl }: VideoPlayerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = () => {
    const currentIndex = playbackSpeeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
    const newRate = playbackSpeeds[nextIndex];
    
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
    setPlaybackRate(newRate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-7xl w-[95vw] h-[95vh] p-0 bg-black border-2 border-[#b2ff2e]/30 overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoUrl}
            onClick={togglePlay}
          />

          {/* Play/Pause Overlay */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                onClick={togglePlay}
              >
                <motion.div
                  className="w-24 h-24 rounded-full bg-[#b2ff2e] flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-12 h-12 text-black ml-2" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6"
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#b2ff2e]"
                    style={{
                      background: `linear-gradient(to right, #b2ff2e 0%, #b2ff2e ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-[#b2ff2e] hover:bg-[#b2ff2e]/90 flex items-center justify-center transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-black" />
                      ) : (
                        <Play className="w-5 h-5 text-black ml-0.5" />
                      )}
                    </button>

                    {/* Speed Control */}
                    <button
                      onClick={changePlaybackRate}
                      className="px-3 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-sm font-semibold border border-[#b2ff2e]/30 hover:border-[#b2ff2e] transition-colors"
                    >
                      {playbackRate}x
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Fullscreen Button */}
                    <button
                      onClick={toggleFullscreen}
                      className="w-10 h-10 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center border border-[#b2ff2e]/30 hover:border-[#b2ff2e] transition-colors"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5 text-[#b2ff2e]" />
                      ) : (
                        <Maximize className="w-5 h-5 text-[#b2ff2e]" />
                      )}
                    </button>

                    {/* Close Button */}
                    <button
                      onClick={handleClose}
                      className="w-10 h-10 rounded-lg bg-black/60 hover:bg-red-500 flex items-center justify-center border border-[#b2ff2e]/30 hover:border-red-500 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerModal;

