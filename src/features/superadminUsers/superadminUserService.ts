import { api } from "../../lib/api";

export const SUPERADMIN_MODULES = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "stores", label: "Lojas" },
  { slug: "products", label: "Produtos" },
  { slug: "categories", label: "Categorias" },
  { slug: "split_rules", label: "Regras de Split" },
  { slug: "pagarme_marketplace", label: "Stone/Pagar.me" },
  { slug: "mercadopago_test", label: "MP Sandbox" },
  { slug: "audit_logs", label: "Auditoria" },
  { slug: "caixa", label: "Caixa" },
  { slug: "legal_documents", label: "Documentos legais" },
  { slug: "observability", label: "Saúde do Sistema" },
  { slug: "salao", label: "Restaurante/Salão" },
] as const;

export interface SuperadminUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "vendedor";
  status: "ativo" | "inativo" | "bloqueado";
  modules: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SuperadminUserPayload {
  name: string;
  email: string;
  password?: string;
  role: "superadmin" | "vendedor";
  status: "ativo" | "inativo" | "bloqueado";
  modules: string[];
}

export const superadminUserService = {
  async getAll() {
    const response = await api.get("/users");
    return response.data?.data ?? response.data;
  },
  async getById(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data?.data ?? response.data;
  },
  async create(payload: SuperadminUserPayload & { password: string }) {
    const response = await api.post("/users", payload);
    return response.data?.data ?? response.data;
  },
  async update(id: string, payload: Partial<SuperadminUserPayload>) {
    const response = await api.put(`/users/${id}`, payload);
    return response.data?.data ?? response.data;
  },
  async delete(id: string) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};
