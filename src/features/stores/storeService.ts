import { api } from "../../lib/api";

export interface Store {
  id: string;
  nome: string;
  razao_social?: string | null;
  cnpj: string;
  telefone?: string | null;
  email?: string | null;
  descricao?: string | null;
  logo_url?: string | null;
  status: "ativa" | "inativa";
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  valor_minimo_pedido: number;
  taxa_entrega_padrao: number;
  latitude?: number | null;
  longitude?: number | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export type StoreCreatePayload = Omit<Store, "id" | "criado_em" | "atualizado_em">;
export type StoreUpdatePayload = Partial<StoreCreatePayload>;

export interface StoreColorPayload {
  cor_primaria: string;
  cor_secundaria: string;
}

export const storeService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; nome?: string }): Promise<any> => {
    const response = await api.get("/lojas", { params });
    return response.data?.data ?? response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/lojas/${id}`);
    return response.data?.data ?? response.data;
  },

  create: async (data: StoreCreatePayload) => {
    const response = await api.post("/lojas", data);
    return response.data?.data ?? response.data;
  },

  update: async (id: string, data: StoreUpdatePayload) => {
    const response = await api.put(`/lojas/${id}`, data);
    return response.data?.data ?? response.data;
  },

  upsertColors: async (storeId: string, colors: StoreColorPayload) => {
    try {
      const configResponse = await api.get(`/lojas/${storeId}/configuracoes`);
      const config = configResponse.data?.data ?? configResponse.data;

      if (config?.id) {
        const response = await api.put(`/configuracoes_loja/${config.id}`, colors);
        return response.data?.data ?? response.data;
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }
    }

    const response = await api.post("/configuracoes_loja", {
      loja_id: storeId,
      ...colors,
    });
    return response.data?.data ?? response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/lojas/${id}/status`, { status });
    return response.data?.data ?? response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/lojas/${id}`);
    return response.data;
  }
};
