import { Home, GraduationCap, Award, Bot, MessageSquare, Settings, LayoutDashboard, Users, Puzzle, UserCog, Gauge } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "student";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
}

const studentMenuItems: MenuItem[] = [
  { title: "Главная", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: Gauge },
  { title: "Мой профиль", url: "/profile", icon: GraduationCap },
  { title: "Достижения", url: "/achievements", icon: Award },
  { title: "AI-помощник", url: "/ai-assistant", icon: Bot },
  { title: "Сообщения", url: "/messages", icon: MessageSquare },
  { title: "Настройки", url: "/settings", icon: Settings },
];

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Курсы и модули", url: "/admin/courses", icon: GraduationCap },
  { title: "Ученики", url: "/admin/students", icon: Users },
  { title: "Достижения и XP", url: "/admin/achievements", icon: Puzzle },
  { title: "Сообщения", url: "/messages", icon: MessageSquare },
  { title: "Настройки платформы", url: "/admin/settings", icon: Settings },
  { title: "Администраторы", url: "/admin/admins", icon: UserCog },
];

interface AppSidebarProps {
  role?: UserRole;
}

export function AppSidebar({ role = "student" }: AppSidebarProps) {
  const { state } = useSidebar();
  const menuItems = role === "admin" ? adminMenuItems : studentMenuItems;
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 sm:px-4 py-3 sm:py-4">
        <div className={cn(
          "flex items-baseline transition-all duration-300",
          isCollapsed ? "justify-center gap-0" : "justify-start gap-0.5 sm:gap-1"
        )}>
          {isCollapsed ? (
            <span className="font-gilroy text-xl sm:text-2xl font-semibold text-primary">oA</span>
          ) : (
            <>
              <h1 className="font-gilroy text-2xl sm:text-3xl md:text-4xl font-semibold whitespace-nowrap">
                <span className="text-primary">on</span>
                <span className="text-foreground">AI</span>
              </h1>
              <span className="font-gilroy text-lg sm:text-xl md:text-2xl font-semibold text-foreground whitespace-nowrap">
                Academy
              </span>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 sm:px-3">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "px-2 text-xs sm:text-sm text-muted-foreground transition-opacity",
            isCollapsed && "opacity-0"
          )}>
            {role === "admin" ? "Управление" : "Навигация"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:bg-sidebar-accent hover:shadow-[0_0_15px_rgba(177,255,50,0.2)]",
                          isActive && [
                            "bg-primary/10 text-primary font-medium",
                            "shadow-[0_0_20px_rgba(177,255,50,0.3)]",
                            "border border-primary/20"
                          ]
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn(
                            "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-all duration-200",
                            isActive ? "text-primary drop-shadow-[0_0_8px_rgba(177,255,50,0.6)]" : "text-sidebar-foreground"
                          )} />
                          {!isCollapsed && (
                            <span className="text-xs sm:text-sm md:text-base truncate leading-tight">{item.title}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 sm:p-3">
        <div className={cn(
          "text-center text-[10px] sm:text-xs text-muted-foreground transition-opacity leading-tight",
          isCollapsed && "opacity-0"
        )}>
          <p className="font-medium whitespace-nowrap">onAI Academy kz</p>
          <p className="text-[9px] sm:text-[10px] whitespace-nowrap">© 2025</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
