import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Globe, Package, ShoppingCart, CreditCard,
  MessageSquare, FileText, Code, LogOut, Settings, Menu, X, Users
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/sites", icon: Globe, label: "Sales Reps" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/orders", icon: ShoppingCart, label: "Orders" },
  { to: "/conversations", icon: MessageSquare, label: "Conversations" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/landing-pages", icon: FileText, label: "Landing Pages" },
  { to: "/docs", icon: Settings, label: "How to Use" },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex h-14 items-center gap-3 px-4 border-b border-border shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm">AI Sales Rep</span>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.to ||
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-0.5 shrink-0">
        <button
          onClick={() => { signOut(); isMobile && setMobileOpen(false); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0">
          {sidebar}
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="flex items-center h-14 px-4 border-b border-border bg-card shrink-0">
            <button onClick={() => setMobileOpen(true)} className="p-1 mr-3">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm">AI Sales Rep</span>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
