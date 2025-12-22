import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl dark:group-[.toaster]:bg-gray-900 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-gray-700",
          description: "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-blue-500 group-[.toast]:to-indigo-600 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-medium group-[.toast]:shadow-lg hover:group-[.toast]:from-blue-600 hover:group-[.toast]:to-indigo-700 group-[.toast]:transition-all",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-700 group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 hover:group-[.toast]:bg-gray-200 dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-300 dark:hover:group-[.toast]:bg-gray-700 group-[.toast]:transition-all",
        },
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
