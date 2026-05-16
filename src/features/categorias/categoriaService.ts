import { api } from "../../lib/api";

export interface Categoria {
  id: string;
  nome: string;
  slug?: string;
  ordem_exibicao?: number;
  ativa: boolean;
  emoji?: string | null;
  categoria_pai_id?: string | null;
  categoria_pai_nome?: string | null;
  nivel?: number;
  caminho?: string;
  filhos?: Categoria[];
  criado_em?: string;
  atualizado_em?: string;
}

export const categoriaService = {
  getAll: async () => {
    const response = await api.get("/categorias", { params: { per_page: 200 } });
    return response.data?.data ?? response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/categorias/${id}`);
    return response.data?.data ?? response.data;
  },
  create: async (data: Partial<Categoria>) => {
    const response = await api.post("/categorias", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Categoria>) => {
    const response = await api.put(`/categorias/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/categorias/${id}`);
    return response.data;
  },
};
