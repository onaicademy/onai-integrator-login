import { Instagram, Send, MessageCircle, Mail } from "lucide-react";
import { OnAILogo } from "@/components/OnAILogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="relative bg-black border-t border-[#B1FF32]/10">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: Logo + Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <OnAILogo className="h-10 sm:h-12 w-auto" variant="full" />
            </div>
            <p className="text-gray-500 leading-relaxed">
              Обучаем зарабатывать на AI технологиях
            </p>
            <p className="text-sm text-gray-600">
              Профессиональное обучение интеграции искусственного интеллекта в бизнес
            </p>
          </div>

          {/* Column 2: Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-6">Информация</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-500 hover:text-[#B1FF32] transition-colors duration-200">
                  Публичная оферта
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 hover:text-[#B1FF32] transition-colors duration-200">
                  Политика конфиденциальности
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 hover:text-[#B1FF32] transition-colors duration-200">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Social + Contact */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-6">Связаться с нами</h3>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-lg border-[#B1FF32]/30 text-[#B1FF32] hover:bg-[#B1FF32] hover:text-black transition-all duration-300"
                asChild
              >
                <a href="https://instagram.com/onai.academy" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5" />
                </a>
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-lg border-[#B1FF32]/30 text-[#B1FF32] hover:bg-[#B1FF32] hover:text-black transition-all duration-300"
                asChild
              >
                <a href="https://t.me/onaiacademy" target="_blank" rel="noopener noreferrer">
                  <Send className="w-5 h-5" />
                </a>
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-lg border-[#B1FF32]/30 text-[#B1FF32] hover:bg-[#B1FF32] hover:text-black transition-all duration-300"
                asChild
              >
                <a href="https://wa.me/77777777777" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </Button>
            </div>
            
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-2">Email:</p>
              <a href="mailto:info@onaiacademy.kz" className="text-[#B1FF32] hover:text-[#B1FF32]/80 transition-colors">
                info@onaiacademy.kz
              </a>
            </div>
          </div>
        </div>

        <Separator className="bg-[#B1FF32]/10 mb-8" />

        {/* Bottom Bar */}
        <div className="text-center text-sm text-gray-600">
          <p>© 2025 onAI Academy. Сделано для будущих AI-интеграторов</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

