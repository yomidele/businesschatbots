import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Bot, Home, Database, Files, Zap, Star, LogOut, Settings,
  MessageSquare, HelpCircle, MoreVertical
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItemsMain = [
  { to: "/dashboard", icon: Home, label: "Home", section: "PROJECT" },
  { to: "/conversations", icon: MessageSquare, label: "Activity", section: "PROJECT" },
  { to: "/products", icon: Database, label: "Data", section: "PROJECT" },
  { to: "/docs", icon: Files, label: "Files", section: "PROJECT" },
  { to: "/sites", icon: Zap, label: "Apps", section: "PROJECT" },
  { to: "/payments", icon: Star, label: "Starred", section: "PROJECT" },
];

const navItemsApps = [
  { icon: Home, label: "Analytics" },
  { icon: Home, label: "Dashboards", submenu: true },
  { icon: Home, label: "Product analytics", action: true },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-200",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-gray-200">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400">
            <Bot className="h-5 w-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-sm">Default project</span>}
          {!collapsed && <HelpCircle className="ml-auto h-4 w-4 text-gray-400 cursor-pointer" />}
        </div>

        {/* Search & Browse */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-200">
            <button className="w-full flex items-center gap-2 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-600 transition-colors">
              <HelpCircle className="h-4 w-4" />
              Browse
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0 overflow-y-auto">
          {/* PROJECT Section */}
          {!collapsed && <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</div>}
          <div className="space-y-1 mb-6">
            {navItemsMain.slice(0, 6).map((item) => {
              const active = location.pathname === item.to ||
                (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* RECENTS Section */}
          {!collapsed && <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recents</div>}
          <div className="space-y-1 mb-6">
            {/* Empty or populate with recents */}
          </div>

          {/* MY APPS Section */}
          {!collapsed && (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Apps</div>
                <button className="text-gray-400 hover:text-gray-600">+</button>
              </div>
              <div className="space-y-1 mb-6">
                {navItemsApps.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors",
                      item.submenu && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.action && <span className="text-xs bg-gray-200 px-2 py-1 rounded">+</span>}
                    {item.submenu && <span className="text-gray-400">↻</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 px-2 py-3 space-y-1">
          {!collapsed && (
            <>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                <Files className="h-4 w-4" />
                Exports
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                <HelpCircle className="h-4 w-4" />
                Help
              </button>
            </>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
