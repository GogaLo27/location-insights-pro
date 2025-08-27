import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/components/ui/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlan } from "@/hooks/usePlan";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  MapPin, 
  BarChart3, 
  MessageSquare, 
  TrendingUp,
  Settings,
  LogOut,
  ReceiptText
} from "lucide-react";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "Reviews", url: "/reviews", icon: MessageSquare },
  { title: "Analytics", url: "/analytics", icon: TrendingUp },
  { title: "Sentiment", url: "/sentiment", icon: TrendingUp },
  { title: "Orders", url: "/orders", icon: ReceiptText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-muted font-medium text-sidebar-foreground dark:text-white dark:bg-neutral-800"
      : "hover:bg-muted/50 text-sidebar-foreground/80 hover:text-sidebar-foreground dark:text-white/80 dark:hover:text-white dark:hover:bg-neutral-800/70";

  return (
    <Sidebar className={(collapsed ? "w-14 " : "w-60 ") + "bg-sidebar text-sidebar-foreground dark:bg-background dark:text-foreground"} collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center space-x-2 px-4 py-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg">Location Insights Pro</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="dark:text-white/80">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="dark:text-white/80">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" className={getNavCls}>
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="p-4 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={(user as any)?.user_metadata?.picture || (user as any)?.user_metadata?.avatar_url || undefined} alt={user?.email || "User"} />
                <AvatarFallback>{(user?.email || "U").substring(0,1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="capitalize">
                  {(plan?.plan_type || "free").replace(/_/g, " ")}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            size={collapsed ? "icon" : "sm"} 
            onClick={signOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}