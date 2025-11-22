import { useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import HeroSection from "@/components/aimarathon/HeroSection";
import ProgramSectionOptimized from "@/components/aimarathon/ProgramSectionOptimized";
import TrustSection from "@/components/aimarathon/TrustSection";
import CasesSection from "@/components/aimarathon/CasesSection";
import FinalCTARedesigned from "@/components/aimarathon/FinalCTARedesigned";
import Footer from "@/components/aimarathon/Footer";
import BookingModal from "@/components/aimarathon/BookingModal";
import BackgroundEffects from "@/components/aimarathon/BackgroundEffects";
import { useState } from "react";

const AIMarathon = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  
  // Progress indicator
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    // Set page title
    document.title = "AI Marathon - onAI Academy | $10 за 3 дня обучения";
    
    const description = "Интеграторы: 2000$/мес на ChatGPT. Самое кассовое обучение от onAI Academy. Всего $10 за 3-дневный марафон!";
    const title = "AI Marathon - onAI Academy | $10 за 3 дня обучения";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }
    
    // Update Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);
    
    // Update Open Graph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', description);
    
    // Update Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', 'https://onai.academy/aimarathon');
    
    // Update Twitter card title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('name', 'twitter:title');
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute('content', title);
    
    // Update Twitter card description
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (!twitterDescription) {
      twitterDescription = document.createElement('meta');
      twitterDescription.setAttribute('name', 'twitter:description');
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.setAttribute('content', description);
  }, []);

  return (
    <div className="relative bg-black text-white overflow-x-hidden">
      {/* Progress Bar - minimal */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#00ff00] z-50"
        style={{ width: progressWidth, transformOrigin: "0%" }}
      />
      
      {/* Background Effects */}
      <BackgroundEffects />
      
      {/* Main Content */}
      <main className="relative z-10">
        <HeroSection onOpenModal={() => setIsModalOpen(true)} />
        <ProgramSectionOptimized />
        <TrustSection />
        <CasesSection />
        <FinalCTARedesigned onOpenModal={() => setIsModalOpen(true)} />
        <Footer />
      </main>
      
      {/* Booking Modal */}
      <BookingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AIMarathon;

