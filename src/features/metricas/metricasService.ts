import { api } from "../../lib/api";

export interface MetricasGerais {
  resumo: {
    total_lojas: number;
    lojas_ativas: number;
    lojas_inativas: number;
    total_clientes: number;
    clientes_ativos: number;
    clientes_bloqueados: number;
    total_usuarios: number;
    usuarios_ativos: number;
    total_users_sistema: number;
    total_produtos: number;
    produtos_ativos: number;
    total_categorias: number;
    total_entregadores: number;
    entregadores_ativos: number;
    total_cupons: number;
    cupons_ativos: number;
    total_areas_entrega: number;
  };
  pedidos: {
    metricas: {
      total_pedidos: number;
      pedidos_pendentes: number;
      pedidos_confirmados: number;
      pedidos_em_separacao: number;
      pedidos_prontos: number;
      pedidos_saiu_entrega: number;
      pedidos_entregues: number;
      pedidos_cancelados: number;
      valor_total_pedidos: number;
      valor_pedidos_entregues: number;
      total_descontos_aplicados: number;
      total_taxas_entrega: number;
      ticket_medio: number;
    };
    por_origem: Array<{
      origem_checkout: string;
      quantidade: number;
      valor_total: number;
    }>;
    ultimos_30_dias: Array<{
      data: string;
      quantidade: number;
      valor_total: number;
    }>;
  };
  financeiro: {
    pagamentos: {
      total_pagamentos: number;
      pagamentos_aprovados: number;
      pagamentos_pendentes: number;
      pagamentos_rejeitados: number;
      pagamentos_estornados: number;
      pagamentos_cancelados: number;
      valor_total_aprovado: number;
      total_taxas_gateway: number;
      valor_liquido_total: number;
    };
    pagamentos_detalhados?: {
      resumo: {
        total_pagamentos: number;
        valor_total_registrado: number;
        pagamentos_recebidos: number;
        valor_recebido: number;
        valor_liquido_recebido: number;
        taxas_gateway_recebidas: number;
        pagamentos_previstos: number;
        valor_previsto_receber: number;
        pagamentos_rejeitados: number;
        valor_rejeitado: number;
        pagamentos_cancelados: number;
        valor_cancelado: number;
        pagamentos_estornados: number;
        valor_estornado: number;
        pagamentos_na_entrega: number;
        valor_na_entrega: number;
        pagamentos_no_app: number;
        valor_no_app: number;
      };
      por_forma_pagamento: Array<{
        metodo_pagamento: string;
        quantidade: number;
        valor_total: number;
        valor_recebido: number;
        valor_previsto_receber: number;
        valor_nao_recebido: number;
        recebidos: number;
        previstos: number;
      }>;
      por_canal_pagamento: Array<{
        canal_pagamento: string;
        quantidade: number;
        valor_total: number;
        valor_recebido: number;
        valor_previsto_receber: number;
        recebidos: number;
        previstos: number;
      }>;
      por_forma_e_canal: Array<{
        metodo_pagamento: string;
        canal_pagamento: string;
        situacao_financeira: string;
        quantidade: number;
        valor_total: number;
        valor_liquido: number;
        taxas_gateway: number;
      }>;
      por_status: Array<{
        pagamento_status: string;
        situacao_financeira: string;
        quantidade: number;
        valor_total: number;
      }>;
      recentes: Array<Record<string, unknown>>;
    };
    formas_pagamento: Array<{
      forma_pagamento: string;
      quantidade: number;
      valor_total: number;
    }>;
    estornos: {
      total_estornos: number;
      estornos_aprovados: number;
      estornos_pendentes: number;
      valor_total_estornado: number;
    };
    contas_pagamento: {
      total_contas_pagamento: number;
      contas_ativas: number;
      contas_inativas: number;
      contas_bloqueadas: number;
    };
    splits: {
      total_splits: number;
      splits_transferidos: number;
      splits_pendentes: number;
      splits_falharam: number;
      valor_bruto_transferido: number;
      valor_liquido_transferido: number;
    };
    webhooks: {
      total_notificacoes: number;
      processadas: number;
      nao_processadas: number;
      com_erro: number;
    };
  };
  entregas: {
    total_entregas: number;
    entregas_aguardando: number;
    entregas_atribuidas: number;
    entregas_em_andamento: number;
    entregas_concluidas: number;
    entregas_falharam: number;
  };
  estoque: {
    total_registros_estoque: number;
    produtos_estoque_baixo: number;
    produtos_sem_estoque: number;
    total_quantidade_reservada: number;
  };
  carrinhos: {
    total_carrinhos: number;
    carrinhos_ativos: number;
    carrinhos_convertidos: number;
    carrinhos_abandonados: number;
  };
  cupons: {
    total_usos: number;
  };
  auditoria: {
    total_logs: number;
    insercoes: number;
    atualizacoes: number;
    exclusoes: number;
  };
  distribuicoes: {
    perfis_usuarios: Array<{ perfil: string; quantidade: number }>;
    roles_sistema: Array<{ role: string; quantidade: number }>;
  };
  rankings: {
    top_lojas_pedidos: Array<{
      id: string;
      nome: string;
      status: string;
      total_pedidos: number;
      valor_total: number;
    }>;
    top_lojas_faturamento: Array<{
      id: string;
      nome: string;
      status: string;
      faturamento: number;
    }>;
  };
  crescimento: {
    novos_clientes_30d: Array<{ data: string; quantidade: number }>;
    novas_lojas_30d: Array<{ data: string; quantidade: number }>;
  };
  gerado_em: string;
}

export interface MetricasFilters {
  dataInicio?: string;
  dataFim?: string;
  lojaId?: string;
}

export const metricasService = {
  async getMetricasGerais(filters: MetricasFilters = {}): Promise<any> {
    const { lojaId, ...params } = filters;
    const endpoint = lojaId ? `/metricas/lojas/${lojaId}` : "/metricas";
    const { data } = await api.get<{ success: boolean; data: any }>(endpoint, { params });
    return data.data;
  },
};
