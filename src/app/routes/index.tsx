import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Login from "../../pages/auth/Login";
import Dashboard from "../../pages/dashboard/Dashboard";
import StoresList from "../../pages/stores/StoresList";
import StoreForm from "../../pages/stores/StoreForm";
import StoreDetails from "../../pages/stores/StoreDetails";
import UsuariosList from "../../pages/users/UsuariosList";
import UsuarioForm from "../../pages/users/UsuarioForm";
import UsuarioDetails from "../../pages/users/UsuarioDetails";
import ProdutosList from "../../pages/produtos/ProdutosList";
import ProdutoForm from "../../pages/produtos/ProdutoForm";
import ProdutoDetails from "../../pages/produtos/ProdutoDetails";
import ImportProdutos from "../../pages/produtos/ImportProdutos";
import CategoriasList from "../../pages/categorias/CategoriasList";
import RegrasSplitList from "../../pages/financial/RegrasSplitList";
import RegraSplitForm from "../../pages/financial/RegraSplitForm";
import { MercadoPagoTest } from "../../pages/financial/MercadoPagoTest";
import PagarmeMarketplace from "../../pages/financial/PagarmeMarketplace";
import AuditLogs from "../../pages/settings/AuditLogs";
import CaixaPlataforma from "../../pages/caixa/CaixaPlataforma";
import SuperadminUsers from "../../pages/access/SuperadminUsers";
import SecurityMfa from "../../pages/settings/SecurityMfa";
import LegalDocumentsEditor from "../../pages/legalDocuments/LegalDocumentsEditor";
import SystemHealth from "../../pages/observability/SystemHealth";
import PlatformBanners from "../../pages/platformBanners/PlatformBanners";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        
        {/* Lojas */}
        <Route path="stores" element={<StoresList />} />
        <Route path="stores/new" element={<StoreForm />} />
        <Route path="stores/:id" element={<StoreDetails />} />
        <Route path="stores/:id/edit" element={<StoreForm />} />
        
        {/* Usuários */}
        <Route path="users" element={<UsuariosList />} />
        <Route path="users/new" element={<UsuarioForm />} />
        <Route path="users/:id" element={<UsuarioDetails />} />
        <Route path="users/:id/edit" element={<UsuarioForm />} />
        <Route path="access-users" element={<SuperadminUsers />} />
        
        {/* Produtos */}
        <Route path="products" element={<ProdutosList />} />
        <Route path="products/new" element={<ProdutoForm />} />
        <Route path="products/:id" element={<ProdutoDetails />} />
        <Route path="products/:id/edit" element={<ProdutoForm />} />
        <Route path="products/import" element={<ImportProdutos />} />
        <Route path="products/categories" element={<CategoriasList />} />
        <Route path="platform-banners" element={<PlatformBanners />} />
        
        {/* Financeiro / Regras de Split */}
        <Route path="settings/split-rules" element={<RegrasSplitList />} />
        <Route path="settings/split-rules/new" element={<RegraSplitForm />} />
        <Route path="settings/split-rules/:id/edit" element={<RegraSplitForm />} />
        <Route path="settings/mercadopago-test" element={<MercadoPagoTest />} />
        <Route path="settings/pagarme-marketplace" element={<PagarmeMarketplace />} />
        <Route path="caixa" element={<CaixaPlataforma />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="security" element={<SecurityMfa />} />
        <Route path="legal-documents" element={<LegalDocumentsEditor />} />
        <Route path="system-health" element={<SystemHealth />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
