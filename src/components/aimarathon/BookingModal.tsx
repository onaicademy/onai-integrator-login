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
      <DialogContent className="bg-[#0F0F0F] border border-[#b2ff2e]/30 w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-md overflow-hidden mx-auto max-h-[85vh] overflow-y-auto rounded-2xl">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo - упрощенный для мобилки */}
              <div className="flex justify-center mb-4 sm:mb-6 relative py-4 sm:py-6">
                <OnAILogo 
                  variant="full" 
                  className="h-12 sm:h-16 w-auto text-white" 
                />
              </div>

              <DialogHeader className="text-center mb-4 sm:mb-6">
                <DialogTitle 
                  className="text-sm sm:text-base text-gray-400 font-medium leading-relaxed px-2"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Забронируйте своё место
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                {/* Name Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label 
                    htmlFor="name" 
                    className="text-gray-400 text-xs sm:text-sm font-medium"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Ваше имя <span className="text-[#b2ff2e]">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    className="bg-[#1B1B1B] border-[#b2ff2e]/20 focus:border-[#b2ff2e] text-white text-sm sm:text-base py-3 sm:py-4"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label 
                    htmlFor="phone" 
                    className="text-gray-400 text-xs sm:text-sm font-medium"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Номер телефона <span className="text-[#b2ff2e]">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+7 (777) 777-77-77"
                    className="bg-[#1B1B1B] border-[#b2ff2e]/20 focus:border-[#b2ff2e] text-white text-sm sm:text-base py-3 sm:py-4"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-base sm:text-lg py-4 sm:py-5 bg-[#b2ff2e] hover:bg-[#b2ff2e]/90 text-black font-bold transition-all duration-300 mt-2"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
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
              className="py-8 sm:py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-[#b2ff2e] mx-auto mb-4 sm:mb-6" />
              </motion.div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                Место забронировано!
              </h3>
              
              <p className="text-sm sm:text-base text-gray-500 mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                Проверьте Telegram!
              </p>
              
              <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                Мы отправили вам детали по обучению
              </p>

              <div className="mt-6 sm:mt-8 text-5xl sm:text-6xl">🚀</div>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;

