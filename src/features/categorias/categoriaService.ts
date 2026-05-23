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

type CategoriaListResponse = {
  data?: Categoria[];
  total_pages?: number;
  page?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapListResponse(payload: unknown): CategoriaListResponse {
  const data = isRecord(payload) && "data" in payload ? payload.data : payload;

  if (Array.isArray(data)) {
    return { data };
  }

  if (isRecord(data) && Array.isArray(data.data)) {
    return {
      data: data.data as Categoria[],
      total_pages: typeof data.total_pages === "number" ? data.total_pages : undefined,
      page: typeof data.page === "number" ? data.page : undefined,
    };
  }

  return { data: [] };
}

async function getAllPages(path: string, params: Record<string, unknown> = {}) {
  const perPage = 100;
  let page = 1;
  const categorias: Categoria[] = [];

  while (true) {
    const response = await api.get(path, {
      params: {
        ...params,
        page,
        per_page: perPage,
      },
    });
    const payload = unwrapListResponse(response.data);
    const currentPageItems = payload.data ?? [];

    categorias.push(...currentPageItems);

    const totalPages = payload.total_pages ?? payload.page ?? page;
    if (page >= totalPages || currentPageItems.length === 0) {
      break;
    }

    page += 1;
  }

  return categorias;
}

export const categoriaService = {
  getAll: async () => {
    return getAllPages("/categorias");
  },
  getDepartments: async () => {
    return getAllPages("/categorias/nivel/1");
  },
  getChildren: async (id: string) => {
    return getAllPages(`/categorias/${id}/filhos`);
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
