import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OnAILogo } from "@/components/OnAILogo";

const formSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
});

type FormData = z.infer<typeof formSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal = ({ isOpen, onClose }: BookingModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call
      console.log("Form submitted:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success state
      setIsSuccess(true);
      
      // Send to backend/CRM
      // await fetch('/api/marathon-registration', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      
      toast.success("Заявка успешно отправлена!");
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        reset();
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Произошла ошибка. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isSuccess) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0F0F0F] border border-[#b2ff2e]/30 max-w-lg overflow-hidden mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo with Neon Glow & Particles */}
              <div className="flex justify-center mb-6 sm:mb-8 relative py-6 sm:py-8">
                <div className="relative">
                  {/* Центральный логотип */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <OnAILogo 
                      variant="full" 
                      className="h-16 sm:h-20 w-auto text-white" 
                    />
                  </motion.div>

                  {/* Неоновое свечение вокруг логотипа */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(177, 255, 50, 0.3) 0%, transparent 70%)",
                      filter: "blur(30px)",
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Orbiting particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-[#b2ff2e] rounded-full"
                      style={{
                        top: "50%",
                        left: "50%",
                        boxShadow: "0 0 8px #b2ff2e, 0 0 12px #b2ff2e",
                      }}
                      animate={{
                        x: [0, Math.cos((i * 2 * Math.PI) / 12) * 100],
                        y: [0, Math.sin((i * 2 * Math.PI) / 12) * 100],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}

                  {/* Вращающиеся кольца */}
                  {[60, 80, 100].map((radius, idx) => (
                    <motion.div
                      key={`ring-${idx}`}
                      className="absolute top-1/2 left-1/2 border border-[#b2ff2e]/20 rounded-full"
                      style={{
                        width: `${radius}px`,
                        height: `${radius}px`,
                        marginTop: `-${radius / 2}px`,
                        marginLeft: `-${radius / 2}px`,
                      }}
                      animate={{
                        rotate: [0, 360],
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{
                        duration: 4 + idx * 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  ))}
                </div>
              </div>

              <DialogHeader className="text-center">
                <DialogTitle 
                  className="text-base sm:text-lg text-gray-400 font-medium leading-relaxed"
                >
                  Забронируйте своё место, заполните форму и мы свяжемся с вами
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 mt-6 sm:mt-8">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="name" 
                    className="text-gray-400 text-sm font-medium"
                  >
                    Ваше имя <span className="text-[#b2ff2e]">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ваше имя"
                    className="bg-[#1B1B1B] border-[#b2ff2e]/20 focus:border-[#b2ff2e] text-white text-base sm:text-lg py-5 sm:py-6"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="phone" 
                    className="text-gray-400 text-sm font-medium"
                  >
                    Номер телефона <span className="text-[#b2ff2e]">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+7 (777) 777-77-77"
                    className="bg-[#1B1B1B] border-[#b2ff2e]/20 focus:border-[#b2ff2e] text-white text-base sm:text-lg py-5 sm:py-6"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-lg sm:text-xl py-6 sm:py-7 bg-[#b2ff2e] hover:bg-[#b2ff2e]/90 text-black font-bold shadow-lg hover:shadow-[#b2ff2e]/50 transition-all duration-300"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    "Забронировать место →"
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="w-24 h-24 text-[#b2ff2e] mx-auto mb-6" />
              </motion.div>
              
              <h3 className="text-3xl font-bold text-white mb-4">
                Место забронировано!
              </h3>
              
              <p className="text-gray-500 mb-2">
                Проверьте Telegram!
              </p>
              
              <p className="text-sm text-gray-600">
                Мы отправили вам детали по обучению
              </p>

              <div className="mt-8 text-6xl">🚀</div>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;

