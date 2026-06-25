import { useEffect } from "react";
import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../features/auth/authService";
import { Activity, LayoutDashboard, Store, Users, LogOut, Settings, Package, Tag, ClipboardList, WalletCards, ShieldCheck, FileText, Images } from "lucide-react";
import { Button } from "../ui/button";

export default function AdminLayout() {
  const { isAuthenticated, user, setUser, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !user) {
      authService.me().then(setUser).catch(() => logout());
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const canView = (slug: string) => {
    if (user?.permissions?.includes("*")) return true;
    if (slug === "users") return false;
    return user?.permissions?.includes(slug);
  };

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, slug: "dashboard" },
    { name: "Lojas", path: "/stores", icon: Store, slug: "stores" },
    { name: "Categorias", path: "/products/categories", icon: Tag, slug: "categories" },
    { name: "Produtos", path: "/products", icon: Package, slug: "products" },
    { name: "Banners globais", path: "/platform-banners", icon: Images, slug: "dashboard" },
    { name: "Caixa", path: "/caixa", icon: WalletCards, slug: "caixa" },
    { name: "Acessos", path: "/access-users", icon: Users, slug: "users" },
    { name: "Regras de Split", path: "/settings/split-rules", icon: Settings, slug: "split_rules" },
    { name: "Stone/Pagar.me", path: "/settings/pagarme-marketplace", icon: WalletCards, slug: "pagarme_marketplace" },
    { name: "MP Sandbox", path: "/settings/mercadopago-test", icon: WalletCards, slug: "mercadopago_test" },
    { name: "Auditoria", path: "/audit-logs", icon: ClipboardList, slug: "audit_logs" },
    { name: "Segurança", path: "/security", icon: ShieldCheck, slug: "dashboard" },
    { name: "Documentos legais", path: "/legal-documents", icon: FileText, slug: "legal_documents" },
    { name: "Saúde do Sistema", path: "/system-health", icon: Activity, slug: "observability" },
  ];

  const visibleMenuItems = menuItems.filter((item) => canView(item.slug));
  const activeMenuItem = visibleMenuItems
    .filter((item) => location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <Store className="w-5 h-5" />
            </div>
            <span>SuperAdmin</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = activeMenuItem?.path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "" : "opacity-70"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.nome?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.nome || "Admin User"}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center px-6">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {menuItems.find(i => location.pathname === i.path || (i.path !== "/" && location.pathname.startsWith(i.path)))?.name || "Painel"}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
