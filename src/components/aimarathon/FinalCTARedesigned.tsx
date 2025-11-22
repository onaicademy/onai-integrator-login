import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Users, Clock, Gift } from "lucide-react";
import { useAlmatyTimer } from "@/hooks/useAlmatyTimer";
import { useSpotsCounter } from "@/hooks/useSpotsCounter";

interface FinalCTAProps {
  onOpenModal: () => void;
}

const FinalCTARedesigned = ({ onOpenModal }: FinalCTAProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const timeLeft = useAlmatyTimer();
  const { spotsLeft, enrolledToday } = useSpotsCounter();

  const formatTime = (num: number) => String(num).padStart(2, '0');

  return (
    <section ref={ref} className="relative py-16 sm:py-20 px-4 bg-gradient-to-b from-black via-[#0a1f0a]/20 to-black overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#B1FF32]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#B1FF32]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Летающие логотипы */}
      <div className="absolute inset-0 pointer-events-none">
        {/* ChatGPT Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "15%",
            left: "10%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="#10A37F"/>
          </svg>
        </motion.div>

        {/* Make Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "60%",
            right: "15%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, 30, 0],
            x: [0, -15, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="make-gradient-0" x1="1.5" y1="19.5" x2="12" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F0F"/>
                <stop offset=".17" stopColor="#E90CF9"/>
                <stop offset=".54" stopColor="#C023ED"/>
                <stop offset=".73" stopColor="#B02DE9"/>
                <stop offset="1" stopColor="#B02DE9"/>
              </linearGradient>
              <linearGradient id="make-gradient-1" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#B02DE9"/>
                <stop offset=".02" stopColor="#B02DE9"/>
                <stop offset=".8" stopColor="#6D00CC"/>
                <stop offset="1" stopColor="#6D00CC"/>
              </linearGradient>
              <linearGradient id="make-gradient-2" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F0F"/>
                <stop offset=".02" stopColor="#F0F"/>
                <stop offset=".09" stopColor="#E90CF9"/>
                <stop offset=".23" stopColor="#C023ED"/>
                <stop offset=".3" stopColor="#B02DE9"/>
                <stop offset=".42" stopColor="#A42BE3"/>
                <stop offset=".63" stopColor="#8626D5"/>
                <stop offset=".85" stopColor="#6021C3"/>
                <stop offset="1" stopColor="#6021C3"/>
              </linearGradient>
            </defs>
            <path d="M6.989 4.036L.062 17.818a.577.577 0 00.257.774l3.733 1.876a.577.577 0 00.775-.256L11.753 6.43a.577.577 0 00-.257-.775L7.763 3.78a.575.575 0 00-.774.257z" fill="url(#make-gradient-0)"/>
            <path d="M19.245 3.832h4.179c.318 0 .577.26.577.577v15.425a.578.578 0 01-.577.578h-4.179a.578.578 0 01-.577-.578V4.41c0-.318.259-.577.577-.577z" fill="url(#make-gradient-1)"/>
            <path d="M12.815 4.085L9.85 19.108a.576.576 0 00.453.677l4.095.826c.314.063.62-.14.681-.454l2.964-15.022a.577.577 0 00-.453-.677l-4.096-.827a.577.577 0 00-.68.454z" fill="url(#make-gradient-2)"/>
          </svg>
        </motion.div>

        {/* n8n Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "40%",
            left: "80%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, -25, 0],
            x: [0, 15, 0],
            rotate: [0, 15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4B71" d="m239,83c-11.183,0 -20.58,-7.649 -23.244,-18l-27.508,0c-5.866,0 -10.872,4.241 -11.836,10.027l-0.987,5.919c-0.936,5.619 -3.779,10.509 -7.799,14.054c4.02,3.545 6.863,8.435 7.799,14.054l0.987,5.919c0.964,5.786 5.97,10.027 11.836,10.027l3.508,0c2.664,-10.351 12.061,-18 23.244,-18c13.255,0 24,10.745 24,24c0,13.255 -10.745,24 -24,24c-11.183,0 -20.58,-7.649 -23.244,-18l-3.508,0c-11.732,0 -21.744,-8.482 -23.673,-20.054l-0.987,-5.919c-0.964,-5.786 -5.97,-10.027 -11.836,-10.027l-9.508,0c-2.664,10.351 -12.061,18 -23.244,18c-11.183,0 -20.58,-7.649 -23.244,-18l-13.512,0c-2.664,10.351 -12.061,18 -23.244,18c-13.2548,0 -24,-10.745 -24,-24c0,-13.255 10.7452,-24 24,-24c11.183,0 20.58,7.649 23.244,18l13.512,0c2.664,-10.351 12.061,-18 23.244,-18c11.183,0 20.58,7.649 23.244,18l9.508,0c5.866,0 10.872,-4.241 11.836,-10.027l0.987,-5.919c1.929,-11.572 11.941,-20.054 23.673,-20.054l27.508,0c2.664,-10.351 12.061,-18 23.244,-18c13.255,0 24,10.745 24,24c0,13.255 -10.745,24 -24,24zm0,-12c6.627,0 12,-5.373 12,-12c0,-6.627 -5.373,-12 -12,-12c-6.627,0 -12,5.373 -12,12c0,6.627 5.373,12 12,12zm-180,36c6.627,0 12,-5.373 12,-12c0,-6.627 -5.373,-12 -12,-12c-6.6274,0 -12,5.373 -12,12c0,6.627 5.3726,12 12,12zm72,-12c0,6.627 -5.373,12 -12,12c-6.627,0 -12,-5.373 -12,-12c0,-6.627 5.373,-12 12,-12c6.627,0 12,5.373 12,12zm96,36c0,6.627 -5.373,12 -12,12c-6.627,0 -12,-5.373 -12,-12c0,-6.627 5.373,-12 12,-12c6.627,0 12,5.373 12,12z"/>
          </svg>
        </motion.div>

        {/* Дополнительный AI символ */}
        <motion.div
          className="absolute opacity-15"
          style={{
            top: "25%",
            right: "25%",
            filter: "blur(2px)",
          }}
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        >
          <div className="text-5xl sm:text-6xl">🤖</div>
        </motion.div>

        <motion.div
          className="absolute opacity-15"
          style={{
            bottom: "20%",
            left: "20%",
            filter: "blur(2px)",
          }}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          <div className="text-5xl sm:text-6xl">⚡</div>
        </motion.div>

        {/* Claude Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "50%",
            left: "5%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, 25, 0],
            x: [0, 10, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2.5,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#CC9B7A"/>
            <path d="M7 17L12 7L17 17M8.5 14H15.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>

        {/* Gemini Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "70%",
            right: "8%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, -10, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4"/>
                <stop offset="50%" stopColor="#9B72CB"/>
                <stop offset="100%" stopColor="#D96570"/>
              </linearGradient>
            </defs>
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gemini-gradient)"/>
            <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="url(#gemini-gradient)" opacity="0.7"/>
            <path d="M2 12V17L12 12V7L2 12Z" fill="url(#gemini-gradient)" opacity="0.5"/>
            <path d="M22 12V17L12 12V7L22 12Z" fill="url(#gemini-gradient)" opacity="0.5"/>
          </svg>
        </motion.div>

        {/* Midjourney Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            top: "30%",
            right: "5%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, 30, 0],
            x: [0, -20, 0],
            rotate: [0, -15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="white"/>
            <path d="M7 6H17M7 12H17M7 18H17" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="3" fill="black"/>
          </svg>
        </motion.div>

        {/* Perplexity Logo */}
        <motion.div
          className="absolute opacity-20"
          style={{
            bottom: "15%",
            left: "80%",
            filter: "blur(1.5px)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 7.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        >
          <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="perplexity-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#20808D"/>
                <stop offset="100%" stopColor="#2DCEEF"/>
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="5" fill="url(#perplexity-gradient)"/>
            <path d="M8 8L12 16L16 8M10 13H14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>

        {/* Дополнительные эмодзи */}
        <motion.div
          className="absolute opacity-15"
          style={{
            top: "10%",
            right: "30%",
            filter: "blur(2px)",
          }}
          animate={{
            y: [0, 15, 0],
            scale: [1, 1.15, 1],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
        >
          <div className="text-4xl sm:text-5xl">🧠</div>
        </motion.div>

        <motion.div
          className="absolute opacity-15"
          style={{
            bottom: "10%",
            right: "40%",
            filter: "blur(2px)",
          }}
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.15, 1],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3.5,
          }}
        >
          <div className="text-4xl sm:text-5xl">✨</div>
        </motion.div>
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="relative bg-gradient-to-br from-[#0F0F0F] to-[#0a1f0a] border-2 border-[#B1FF32]/40 rounded-3xl p-6 sm:p-8 md:p-12 overflow-hidden">
          {/* Glow Effect */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(177, 255, 50, 0.15), transparent 60%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 space-y-6 sm:space-y-8">
            {/* Icon Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={isInView ? { scale: 1, rotate: 0 } : {}}
              transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 bg-[#B1FF32] rounded-full flex items-center justify-center"
                style={{
                  boxShadow: "0 0 40px rgba(177, 255, 50, 0.5)",
                }}
              >
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <h2 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3"
                style={{
                  fontFamily: "'Russo One', sans-serif",
                  textShadow: "0 0 30px rgba(177, 255, 50, 0.3)",
                }}
              >
                Последний шанс
              </h2>
              <p className="text-lg sm:text-xl text-gray-400">
                попасть в <span className="text-[#B1FF32] font-bold">3-й поток</span>
              </p>
            </motion.div>

            {/* Timer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">До закрытия набора</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
                {/* Hours */}
                <div className="bg-black/60 border-2 border-[#B1FF32]/30 rounded-2xl p-3 sm:p-4 hover:border-[#B1FF32] transition-colors">
                  <motion.div 
                    key={timeLeft.hours}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-[#B1FF32] text-center"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: "0 0 20px rgba(177, 255, 50, 0.5)",
                    }}
                  >
                    {formatTime(timeLeft.hours)}
                  </motion.div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center font-medium">
                    ЧАСОВ
                  </div>
                </div>

                {/* Minutes */}
                <div className="bg-black/60 border-2 border-[#B1FF32]/30 rounded-2xl p-3 sm:p-4 hover:border-[#B1FF32] transition-colors">
                  <motion.div 
                    key={timeLeft.minutes}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-[#B1FF32] text-center"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: "0 0 20px rgba(177, 255, 50, 0.5)",
                    }}
                  >
                    {formatTime(timeLeft.minutes)}
                  </motion.div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center font-medium">
                    МИНУТ
                  </div>
                </div>

                {/* Seconds */}
                <div className="bg-black/60 border-2 border-[#B1FF32]/30 rounded-2xl p-3 sm:p-4 hover:border-[#B1FF32] transition-colors">
                  <motion.div 
                    key={timeLeft.seconds}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-[#B1FF32] text-center"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: "0 0 20px rgba(177, 255, 50, 0.5)",
                    }}
                  >
                    {formatTime(timeLeft.seconds)}
                  </motion.div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center font-medium">
                    СЕКУНД
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Price с подарками */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center relative"
            >
              {/* Подарки слева и справа */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 hidden sm:block">
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [-10, 10, -10],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Gift className="w-12 h-12 text-[#B1FF32]" />
                </motion.div>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hidden sm:block">
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [10, -10, 10],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                >
                  <Gift className="w-12 h-12 text-[#B1FF32]" />
                </motion.div>
              </div>

              <div className="inline-block bg-black/40 border border-[#B1FF32]/30 rounded-2xl px-6 sm:px-8 py-4 relative">
                <div className="flex items-baseline gap-3 sm:gap-4 justify-center flex-wrap">
                  <span 
                    className="text-4xl sm:text-5xl md:text-6xl font-black text-[#B1FF32]"
                    style={{
                      fontFamily: "'Russo One', sans-serif",
                      textShadow: "0 0 30px rgba(177, 255, 50, 0.6)",
                    }}
                  >
                    $10
                  </span>
                  <span className="text-2xl sm:text-3xl text-gray-400">или</span>
                  <span 
                    className="text-4xl sm:text-5xl md:text-6xl font-black text-[#B1FF32]"
                    style={{
                      fontFamily: "'Russo One', sans-serif",
                      textShadow: "0 0 30px rgba(177, 255, 50, 0.6)",
                    }}
                  >
                    5000₸
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="grid grid-cols-2 gap-4 max-w-md mx-auto"
            >
              {/* Spots Left */}
              <div className="bg-black/40 border border-[#B1FF32]/20 rounded-xl p-4 text-center">
                <motion.div 
                  key={spotsLeft}
                  initial={{ scale: 1.3, color: "#B1FF32" }}
                  animate={{ scale: 1, color: "#B1FF32" }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl font-black text-[#B1FF32]"
                >
                  {spotsLeft}
                </motion.div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">мест осталось</div>
              </div>

              {/* Enrolled Today */}
              <div className="bg-black/40 border border-[#B1FF32]/20 rounded-xl p-4 text-center">
                <motion.div 
                  key={enrolledToday}
                  initial={{ scale: 1.3, color: "#B1FF32" }}
                  animate={{ scale: 1, color: "#B1FF32" }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl font-black text-[#B1FF32]"
                >
                  {enrolledToday}
                </motion.div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">записались сегодня</div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Button
                onClick={onOpenModal}
                className="w-full py-6 sm:py-8 text-lg sm:text-xl md:text-2xl font-black bg-[#B1FF32] hover:bg-[#9FE62C] text-black transition-all duration-300 rounded-2xl group relative overflow-hidden"
                style={{
                  boxShadow: "0 0 40px rgba(177, 255, 50, 0.4)",
                  fontFamily: "'Russo One', sans-serif",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <Zap className="w-6 h-6" />
                  Забронировать место
                  <Zap className="w-6 h-6" />
                </span>
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex items-center justify-center gap-2 text-sm text-gray-500"
            >
              <Users className="w-4 h-4 text-[#B1FF32]" />
              <span>Присоединяйтесь к {enrolledToday} участникам</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTARedesigned;

