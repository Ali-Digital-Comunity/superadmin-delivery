import { api } from "../../lib/api";

export interface Produto {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  descricao?: string;
  marca?: string;
  codigo_barras?: string;
  unidade_medida: string;
  vendavel_por_peso: boolean;
  imagem_url?: string;
  images?: ProductImage[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  tenant_id?: string | null;
  url: string;
  storage_path?: string | null;
  alt_text?: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedProdutos {
  data: Produto[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const produtoService = {
  getAll: async (params?: Record<string, any>) => {
    const response = await api.get("/produtos", { params });
    return response.data?.data ?? response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/produtos/${id}`);
    return response.data?.data ?? response.data;
  },

  create: async (data: Partial<Produto>) => {
    const response = await api.post("/produtos", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Produto>) => {
    const response = await api.put(`/produtos/${id}`, data);
    return response.data;
  },

  toggleAtivo: async (id: string, ativo: boolean) => {
    const response = await api.patch(`/produtos/${id}/ativo`, { ativo });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/produtos/${id}`);
    return response.data;
  },

  listImages: async (productId: string): Promise<ProductImage[]> => {
    const response = await api.get(`/produtos/${productId}/images`);
    return response.data?.data ?? [];
  },

  uploadImage: async (
    productId: string,
    file: File,
    options?: { alt_text?: string; is_primary?: boolean }
  ): Promise<ProductImage> => {
    const formData = new FormData();
    formData.append("image", file);
    if (options?.alt_text) formData.append("alt_text", options.alt_text);
    if (options?.is_primary !== undefined) formData.append("is_primary", String(options.is_primary));

    const response = await api.post(`/produtos/${productId}/images/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data?.data;
  },

  uploadImageFromUrl: async (
    productId: string,
    data: { url: string; alt_text?: string; is_primary?: boolean }
  ): Promise<ProductImage> => {
    const response = await api.post(`/produtos/${productId}/images/from-url`, data);
    return response.data?.data;
  },

  deleteImage: async (productId: string, imageId: string) => {
    const response = await api.delete(`/produtos/${productId}/images/${imageId}`);
    return response.data;
  },

  setPrimaryImage: async (productId: string, imageId: string): Promise<ProductImage> => {
    const response = await api.patch(`/produtos/${productId}/images/${imageId}/primary`);
    return response.data?.data;
  },

  reorderImages: async (productId: string, imageIds: string[]): Promise<ProductImage[]> => {
    const response = await api.patch(`/produtos/${productId}/images/reorder`, { image_ids: imageIds });
    return response.data?.data ?? [];
  },
};
