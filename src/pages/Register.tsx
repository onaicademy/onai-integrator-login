import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email обязателен для заполнения")
    .email("Некорректный формат email"),
  password: z
    .string()
    .min(1, "Пароль обязателен для заполнения")
    .min(6, "Пароль должен содержать минимум 6 символов"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    
    // Имитация запроса к серверу
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    console.log("Registration attempt:", data);
    
    // После успешной регистрации перенаправляем на страницу выбора аватара
    navigate("/avatar");
    
    setIsSubmitting(false);
  };

  const isFormValid = form.formState.isValid && form.watch("email") && form.watch("password");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0f0f0f" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center items-baseline gap-1">
          <h1 className="font-gilroy text-5xl font-semibold">
            <span className="text-neon">on</span>
            <span className="text-foreground">AI</span>
          </h1>
          <span className="font-gilroy text-3xl font-semibold text-foreground">
            Academy
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-foreground">
          Завершите авторизацию
        </h1>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#B1FF32]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Пароль</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Минимум 6 символов"
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#B1FF32]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="neon"
              size="lg"
              className={`
                w-full
                transition-all duration-200
                ${isFormValid
                  ? "opacity-100 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
                }
              `}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Регистрация..." : "Войти"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Register;
