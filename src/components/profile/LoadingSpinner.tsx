import { motion } from "framer-motion";

export const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className="w-20 h-20 rounded-full border-4 border-neon/20"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Active segment */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-8 bg-neon rounded-full"
            style={{
              transformOrigin: "50% 10px",
            }}
          />
        </motion.div>

        {/* Inner ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-4 border-[hsl(var(--cyber-blue))]/20"
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-6 bg-[hsl(var(--cyber-blue))] rounded-full"
            style={{
              transformOrigin: "50% 8px",
            }}
          />
        </motion.div>

        {/* Center glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-4 h-4 rounded-full bg-neon shadow-[0_0_20px_rgba(177,255,50,0.5)]" />
        </motion.div>
      </div>
    </div>
  );
};
