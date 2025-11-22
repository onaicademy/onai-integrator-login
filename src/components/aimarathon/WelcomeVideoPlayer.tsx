import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface WelcomeVideoPlayerProps {
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = [
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
];

const WelcomeVideoPlayer = ({ className = "" }: WelcomeVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState("720p");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative group bg-black rounded-xl overflow-hidden border-2 border-[#00ff00]/30 hover:border-[#00ff00] transition-all duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      style={{
        boxShadow: "0 0 40px rgba(177, 255, 50, 0.2)",
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video object-cover"
        onClick={togglePlay}
        poster="/api/placeholder/1280/720"
      >
        {/* TODO: Заменить на реальный URL из базы данных */}
        <source src="/videos/welcome.mp4" type="video/mp4" />
        Ваш браузер не поддерживает видео.
      </video>

      {/* Play Button Overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer"
            onClick={togglePlay}
          >
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 bg-[#00ff00] rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                boxShadow: "0 0 40px rgba(177, 255, 50, 0.6)",
              }}
            >
              <Play className="w-10 h-10 sm:w-12 sm:h-12 text-black ml-1" />
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
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4"
          >
            {/* Progress Bar */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00ff00]"
                style={{
                  background: `linear-gradient(to right, #00ff00 0%, #00ff00 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`,
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Side */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-[#00ff00] hover:bg-[#00ff00]/10 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>

                {/* Mute */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-[#00ff00] hover:bg-[#00ff00]/10 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>

                {/* Time */}
                <span 
                  className="text-white text-xs sm:text-sm font-mono"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    letterSpacing: "0.05em"
                  }}
                >
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Settings (Speed & Quality) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-[#00ff00] hover:bg-[#00ff00]/10 h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="bg-[#0F0F0F] border-[#00ff00]/30 text-white"
                    align="end"
                  >
                    <DropdownMenuLabel 
                      className="text-[#00ff00] font-light"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      Скорость воспроизведения
                    </DropdownMenuLabel>
                    {SPEEDS.map((speed) => (
                      <DropdownMenuItem
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className="hover:bg-[#00ff00]/10 hover:text-[#00ff00] cursor-pointer"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }}
                      >
                        <span className="flex items-center justify-between w-full">
                          {speed}x
                          {playbackSpeed === speed && (
                            <Check className="w-4 h-4 ml-2 text-[#00ff00]" />
                          )}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator className="bg-[#00ff00]/20" />
                    
                    <DropdownMenuLabel 
                      className="text-[#00ff00] font-light"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      Качество
                    </DropdownMenuLabel>
                    {QUALITIES.map((q) => (
                      <DropdownMenuItem
                        key={q.value}
                        onClick={() => setQuality(q.value)}
                        className="hover:bg-[#00ff00]/10 hover:text-[#00ff00] cursor-pointer"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }}
                      >
                        <span className="flex items-center justify-between w-full">
                          {q.label}
                          {quality === q.value && (
                            <Check className="w-4 h-4 ml-2 text-[#00ff00]" />
                          )}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-[#00ff00] hover:bg-[#00ff00]/10 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neon Glow Effect */}
      <div 
        className="absolute -inset-1 bg-gradient-to-r from-[#00ff00]/20 via-[#00ff00]/10 to-[#00ff00]/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
      />
    </motion.div>
  );
};

export default WelcomeVideoPlayer;

