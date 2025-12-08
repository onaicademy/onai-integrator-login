import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      gap={12}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group toast w-full sm:max-w-[420px] md:max-w-[500px] flex items-center gap-3 p-4 rounded-xl border backdrop-blur-xl font-mono text-sm shadow-2xl",
          title: "font-bold uppercase tracking-wider text-white",
          description: "text-xs text-white/70 mt-1",
          success:
            "bg-[#0A0A0A]/95 border-[#00FF88]/30 shadow-[0_0_30px_rgba(0,255,136,0.2)]",
          error:
            "bg-[#0A0A0A]/95 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]",
          warning:
            "bg-[#0A0A0A]/95 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]",
          info:
            "bg-[#0A0A0A]/95 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
