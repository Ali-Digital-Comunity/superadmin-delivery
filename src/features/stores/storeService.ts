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
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  tipo_estabelecimento: "mercado" | "lanchonete" | "restaurante" | "hibrido" | "outro";
  cardapio_configuravel_ativo: boolean;
  permitir_configurar_cpf_na_nota: boolean;
  visivel_no_app_cliente: boolean;
  preco_app_taxa_ativa: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export type StoreCreatePayload = Omit<Store, "id" | "criado_em" | "atualizado_em">;
export type StoreUpdatePayload = Partial<StoreCreatePayload>;

export interface StoreColorPayload {
  cor_primaria: string;
  cor_secundaria: string;
}

export interface StoreOrderCreationPreference {
  permitir_criacao_pedidos_delivery_admin: boolean;
}

export interface StoreCpfInvoicePreference {
  permitir_cpf_na_nota_cliente: boolean;
}

const ESTABLISHMENT_TYPES = ["mercado", "lanchonete", "restaurante", "hibrido", "outro"] as const;

function unwrapApiData<T = any>(responseData: any): T {
  return responseData?.data ?? responseData;
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "yes", "habilitado", "ativo"].includes(normalized)) return true;
    if (["false", "0", "nao", "não", "no", "desabilitado", "inativo"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeStore(rawStore: any): Store {
  const rawType = rawStore?.tipo_estabelecimento ?? rawStore?.tipoEstabelecimento ?? rawStore?.establishmentType;
  const tipo_estabelecimento = ESTABLISHMENT_TYPES.includes(rawType)
    ? rawType
    : "mercado";
  const rawConfigurableMenu = rawStore?.cardapio_configuravel_ativo
    ?? rawStore?.cardapioConfiguravelAtivo
    ?? rawStore?.configurableMenuEnabled;
  const rawCpfInvoiceConfiguration = rawStore?.permitir_configurar_cpf_na_nota
    ?? rawStore?.permitirConfigurarCpfNaNota
    ?? rawStore?.cpfInvoiceConfigurationEnabled;
  const rawCustomerAppVisibility = rawStore?.visivel_no_app_cliente
    ?? rawStore?.visivelNoAppCliente
    ?? rawStore?.customerAppVisible;
  const rawAppPriceFee = rawStore?.preco_app_taxa_ativa
    ?? rawStore?.precoAppTaxaAtiva
    ?? rawStore?.appPriceFeeEnabled;

  return {
    ...rawStore,
    tipo_estabelecimento,
    cardapio_configuravel_ativo: parseBoolean(rawConfigurableMenu, false),
    permitir_configurar_cpf_na_nota: parseBoolean(rawCpfInvoiceConfiguration, true),
    visivel_no_app_cliente: parseBoolean(rawCustomerAppVisibility, true),
    preco_app_taxa_ativa: parseBoolean(rawAppPriceFee, false),
  };
}

function normalizeStoreResult(result: any) {
  if (Array.isArray(result)) return result.map(normalizeStore);
  if (Array.isArray(result?.data)) {
    return {
      ...result,
      data: result.data.map(normalizeStore),
    };
  }
  return normalizeStore(result);
}

export const storeService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; nome?: string }): Promise<any> => {
    const response = await api.get("/lojas", { params });
    return normalizeStoreResult(unwrapApiData(response.data));
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/lojas/${id}`);
    return normalizeStore(unwrapApiData(response.data));
  },

  create: async (data: StoreCreatePayload) => {
    const response = await api.post("/lojas", data);
    return normalizeStore(unwrapApiData(response.data));
  },

  update: async (id: string, data: StoreUpdatePayload) => {
    const response = await api.put(`/lojas/${id}`, data);
    return normalizeStore(unwrapApiData(response.data));
  },

  upsertColors: async (storeId: string, colors: StoreColorPayload) => {
    try {
      const configResponse = await api.get(`/lojas/${storeId}/configuracoes`);
      const config = unwrapApiData(configResponse.data);

      if (config?.id) {
        const response = await api.put(`/configuracoes_loja/${config.id}`, colors);
        return unwrapApiData(response.data);
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
    return unwrapApiData(response.data);
  },

  updateDeliveryOrderCreationPreference: async (
    storeId: string,
    preference: StoreOrderCreationPreference,
  ) => {
    const configResponse = await api.get(`/lojas/${storeId}/configuracoes`);
    const config = unwrapApiData<any>(configResponse.data);
    if (!config?.id) throw new Error("A loja não possui configurações para atualizar.");
    const response = await api.patch(`/configuracoes_loja/${config.id}`, preference);
    return unwrapApiData(response.data);
  },

  updateCpfInvoicePreference: async (
    storeId: string,
    preference: StoreCpfInvoicePreference,
  ) => {
    const configResponse = await api.get(`/lojas/${storeId}/configuracoes`);
    const config = unwrapApiData<any>(configResponse.data);
    if (!config?.id) throw new Error("A loja não possui configurações para atualizar.");
    const response = await api.patch(`/configuracoes_loja/${config.id}`, preference);
    return unwrapApiData(response.data);
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/lojas/${id}/status`, { status });
    return normalizeStore(unwrapApiData(response.data));
  },

  delete: async (id: string) => {
    const response = await api.delete(`/lojas/${id}`);
    return response.data;
  },

  getModules: async (id: string) => {
    const response = await api.get(`/salao/lojas/${id}/modulos`);
    return unwrapApiData(response.data);
  },

  updateModules: async (id: string, modules: Array<{ slug: string; enabled: boolean; config?: Record<string, unknown> }>) => {
    const response = await api.put(`/salao/lojas/${id}/modulos`, { modules });
    return unwrapApiData(response.data);
  }
};
