import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center items-baseline gap-1">
          <h1 className="font-benzin text-5xl font-bold">
            <span className="text-neon">on</span>
            <span className="text-foreground">AI</span>
          </h1>
          <span className="font-benzin text-3xl font-bold text-foreground">Academy</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-semibold text-center">Вход в платформу</h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Пароль
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button type="submit" variant="neon" className="w-full" size="lg">
            Войти
          </Button>
        </form>

        {/* Forgot password */}
        <div className="text-center">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Забыли пароль?
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
