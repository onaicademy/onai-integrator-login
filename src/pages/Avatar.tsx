import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Avatar = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const navigate = useNavigate();

  const avatars = [
    {
      id: "sarah",
      url: "https://api.dicebear.com/9.x/adventurer/svg?seed=Sarah",
    },
    {
      id: "avery",
      url: "https://api.dicebear.com/9.x/adventurer/svg?seed=Avery",
    },
    {
      id: "easton",
      url: "https://api.dicebear.com/9.x/adventurer/svg?seed=Easton",
    },
    {
      id: "leo",
      url: "https://api.dicebear.com/9.x/adventurer/svg?seed=Leo",
    },
  ];

  const handleAvatarClick = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleContinue = () => {
    if (selectedAvatar) {
      navigate("/register");
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0f0f0f" }}
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-foreground">
          Выберите своего аватара
        </h1>

        {/* Avatar Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-md mx-auto">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar.id)}
              className={`
                relative aspect-square rounded-lg overflow-hidden
                transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
                ${selectedAvatar === avatar.id 
                  ? "" 
                  : "ring-2 ring-border hover:ring-muted-foreground"
                }
              `}
            >
              <img
                src={avatar.url}
                alt={`Avatar ${avatar.id}`}
                className="w-full h-full object-cover"
              />
              {selectedAvatar === avatar.id && (
                <div 
                  className="absolute inset-0 border-4 rounded-lg pointer-events-none"
                  style={{ 
                    borderColor: "#B1FF32",
                    boxShadow: "0 0 20px rgba(177, 255, 50, 0.6), inset 0 0 20px rgba(177, 255, 50, 0.1)"
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleContinue}
            disabled={!selectedAvatar}
            variant="neon"
            size="lg"
            className={`
              w-full max-w-md md:max-w-lg
              transition-all duration-200
              ${selectedAvatar 
                ? "opacity-100 cursor-pointer" 
                : "opacity-50 cursor-not-allowed"
              }
            `}
          >
            Продолжить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
