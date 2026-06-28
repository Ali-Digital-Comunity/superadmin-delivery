import { useMemo, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Box,
  CreditCard,
  DollarSign,
  Info,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  Smile,
  ShoppingCart,
  Store,
  Ticket,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMetricas } from "../../hooks/useMetricas";
import { storeService, type Store as StoreType } from "../../features/stores/storeService";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { dateInputInBrasilia, formatBrasiliaDate } from "../../lib/dateTime";

function fmt(v: number | string | undefined | null) {
  if (v === undefined || v === null) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(v: number | string | undefined | null) {
  if (v === undefined || v === null) return "0";
  return Number(v).toLocaleString("pt-BR");
}

function StatCard({ title, value, icon: Icon, sub, color = "text-primary", trend, help }: {
  title: string;
  value: string;
  icon: ElementType;
  sub?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
  help: string;
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <div className={`absolute inset-0 opacity-[0.03] ${color.replace("text-", "bg-")}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${color}`} title={help}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function normalizeDashboard(m: any) {
  if (m?.resumo) {
    return {
      scope: "platform" as const,
      resumo: m.resumo,
      pedidos: m.pedidos.metricas,
      financeiro: m.financeiro,
      entregas: m.entregas,
      estoque: m.estoque,
      carrinhos: m.carrinhos,
      cupons: m.cupons,
      auditoria: m.auditoria,
      experienciaCompra: m.experiencia_compra || { resumo: {}, por_loja: [] },
      topLojas: (m.rankings?.top_lojas_faturamento || []).slice(0, 5).map((l: any) => ({
        nome: l.nome?.length > 18 ? `${l.nome.slice(0, 18)}...` : l.nome,
        faturamento: Number(l.faturamento),
      })),
      gerado_em: m.gerado_em,
    };
  }

  return {
    scope: "store" as const,
    loja: m.loja,
    resumo: {
      total_lojas: 1,
      lojas_ativas: m.loja?.status === "ativa" ? 1 : 0,
      lojas_inativas: m.loja?.status === "inativa" ? 1 : 0,
      total_clientes: m.novosClientes,
      clientes_ativos: m.novosClientes,
      clientes_bloqueados: 0,
      total_usuarios: m.contagens?.total_usuarios,
      usuarios_ativos: m.contagens?.total_usuarios,
      total_users_sistema: 0,
      total_produtos: m.contagens?.total_produtos,
      produtos_ativos: m.contagens?.produtos_ativos,
      total_categorias: m.contagens?.total_categorias,
      total_entregadores: m.contagens?.total_entregadores,
      entregadores_ativos: m.contagens?.total_entregadores,
      total_cupons: m.contagens?.total_cupons,
      cupons_ativos: m.contagens?.total_cupons,
    },
    pedidos: {
      total_pedidos: m.pedidos?.total_pedidos,
      pedidos_pendentes: m.pedidos?.pendentes,
      pedidos_confirmados: m.pedidos?.confirmados,
      pedidos_em_separacao: m.pedidos?.em_separacao,
      pedidos_prontos: m.pedidos?.prontos,
      pedidos_saiu_entrega: m.pedidos?.em_rota,
      pedidos_entregues: m.pedidos?.entregues,
      pedidos_cancelados: m.pedidos?.cancelados,
      valor_total_pedidos: m.pedidos?.valor_total,
      valor_pedidos_entregues: m.pedidos?.faturamento,
      total_descontos_aplicados: 0,
      total_taxas_entrega: 0,
      ticket_medio: m.pedidos?.ticket_medio,
    },
    financeiro: {
      pagamentos: {
        total_pagamentos: m.pagamentos?.total_pagamentos,
        pagamentos_aprovados: m.pagamentos?.aprovados,
        pagamentos_pendentes: 0,
        pagamentos_rejeitados: 0,
        pagamentos_estornados: 0,
        pagamentos_cancelados: 0,
        valor_total_aprovado: m.pagamentos?.valor_aprovado,
        total_taxas_gateway: m.pagamentos?.total_taxas_gateway,
        valor_liquido_total: Number(m.pagamentos?.valor_aprovado || 0) - Number(m.pagamentos?.total_taxas_gateway || 0),
      },
      estornos: { total_estornos: 0, estornos_aprovados: 0, estornos_pendentes: 0, valor_total_estornado: 0 },
      splits: { total_splits: 0, splits_transferidos: 0, splits_pendentes: 0, splits_falharam: 0, valor_bruto_transferido: 0, valor_liquido_transferido: 0 },
      webhooks: { total_notificacoes: 0, processadas: 0, nao_processadas: 0, com_erro: 0 },
    },
    entregas: { total_entregas: 0, entregas_aguardando: 0, entregas_atribuidas: 0, entregas_em_andamento: 0, entregas_concluidas: 0, entregas_falharam: 0 },
    estoque: {
      total_registros_estoque: m.estoque?.total_registros,
      produtos_estoque_baixo: m.estoque?.estoque_baixo,
      produtos_sem_estoque: m.estoque?.sem_estoque,
      total_quantidade_reservada: 0,
    },
    carrinhos: { total_carrinhos: 0, carrinhos_ativos: 0, carrinhos_convertidos: 0, carrinhos_abandonados: 0 },
    cupons: { total_usos: 0 },
    auditoria: { total_logs: 0 },
    experienciaCompra: m.experiencia_compra || { resumo: {}, por_loja: [] },
    topLojas: [],
    gerado_em: m.gerado_em,
  };
}

export default function Dashboard() {
  const today = dateInputInBrasilia();
  const thirtyDaysAgo = dateInputInBrasilia(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const [dataInicio, setDataInicio] = useState(thirtyDaysAgo);
  const [dataFim, setDataFim] = useState(today);
  const [lojaId, setLojaId] = useState("");

  const { data: storesData } = useQuery({
    queryKey: ["stores", "dashboard-filter"],
    queryFn: () => storeService.getAll(),
  });

  const stores: StoreType[] = Array.isArray(storesData?.data?.data)
    ? storesData.data.data
    : Array.isArray(storesData?.data)
      ? storesData.data
      : Array.isArray(storesData)
        ? storesData
        : [];

  const filters = useMemo(() => ({
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    lojaId: lojaId || undefined,
  }), [dataInicio, dataFim, lojaId]);

  const { data, isLoading, error, refetch, isFetching } = useMetricas(filters);
  const m = data ? normalizeDashboard(data) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !m) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Erro ao carregar métricas</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "Verifique se o backend está rodando."}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const r = m.resumo;
  const ped = m.pedidos;
  const fin = m.financeiro;
  const experiencia = m.experienciaCompra?.resumo || {};
  const experienciaPorLoja = m.experienciaCompra?.por_loja || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {m.scope === "store" ? `Dashboard da Loja: ${m.loja?.nome || "Selecionada"}` : "Visão Geral da Plataforma"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Atualizado em {m.gerado_em ? formatBrasiliaDate(m.gerado_em, { dateStyle: "short", timeStyle: "short" }) : "-"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[680px]">
          <div className="space-y-1">
            <Label htmlFor="dataInicio">Início</Label>
            <Input id="dataInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dataFim">Fim</Label>
            <Input id="dataFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lojaId">Loja</Label>
            <select
              id="lojaId"
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todas as lojas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Lojas Ativas" value={num(r.lojas_ativas)} icon={Store}
          sub={`${num(r.total_lojas)} total · ${num(r.lojas_inativas)} inativas`} color="text-indigo-500"
          help="Quantidade de lojas ativas no escopo selecionado." />
        <StatCard title="Clientes Ativos" value={num(r.clientes_ativos)} icon={Users}
          sub={`${num(r.total_clientes)} total · ${num(r.clientes_bloqueados)} bloqueados`} color="text-cyan-500"
          help="Clientes contabilizados para o período e loja selecionados." />
        <StatCard title="Faturamento (Entregues)" value={fmt(ped.valor_pedidos_entregues)} icon={DollarSign}
          sub={`${fmt(ped.valor_total_pedidos)} em pedidos totais`} color="text-emerald-500" trend="up"
          help="Soma dos pedidos entregues dentro dos filtros aplicados." />
        <StatCard title="Ticket Médio" value={fmt(ped.ticket_medio)} icon={TrendingUp}
          sub={`${num(ped.total_pedidos)} pedidos realizados`} color="text-violet-500"
          help="Valor médio dos pedidos no escopo selecionado." />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pedidos Totais" value={num(ped.total_pedidos)} icon={ShoppingCart}
          sub={`${num(ped.pedidos_entregues)} entregues · ${num(ped.pedidos_cancelados)} cancelados`} color="text-blue-500"
          help="Total de pedidos criados ou realizados dentro dos filtros." />
        <StatCard title="Experiência" value={num(experiencia.total_avaliacoes)} icon={Smile}
          sub={`${num(experiencia.otimo)} ótimo · ${num(experiencia.bom)} bom · ${num(experiencia.ruim)} ruim`}
          color="text-rose-500"
          help="Avaliações simples enviadas pelos clientes ao fim do pedido." />
        <StatCard title="Produtos Ativos" value={num(r.produtos_ativos)} icon={Package}
          sub={`${num(r.total_produtos)} total · ${num(r.total_categorias)} categorias`} color="text-orange-500"
          help="Produtos ativos disponíveis no escopo selecionado." />
        <StatCard title="Entregadores Ativos" value={num(r.entregadores_ativos)} icon={Truck}
          sub={`${num(r.total_entregadores)} cadastrados`} color="text-teal-500"
          help="Entregadores cadastrados ou ativos para o escopo atual." />
        <StatCard title="Usuários do Sistema" value={num(r.usuarios_ativos)} icon={UserCheck}
          sub={`${num(r.total_usuarios)} total · ${num(r.total_users_sistema)} users auth`} color="text-pink-500"
          help="Usuários administrativos cadastrados no sistema." />
      </div>

      {m.topLojas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span title="Ranking das lojas com maior faturamento no período.">
                <TrendingUp className="h-4 w-4 text-primary" />
              </span>
              Top Lojas por Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={m.topLojas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="faturamento" fill="#6366f1" radius={[0, 6, 6, 0]} name="Faturamento" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {experienciaPorLoja.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smile className="h-4 w-4 text-rose-500" />
              Experiência por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {experienciaPorLoja.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {num(item.total_avaliacoes)} respostas · média {Number(item.nota_media || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <span className="font-semibold text-emerald-600">{num(item.otimo)}</span> ótimo ·{" "}
                    <span className="font-semibold text-amber-600">{num(item.bom)}</span> bom ·{" "}
                    <span className="font-semibold text-red-600">{num(item.ruim)}</span> ruim
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pagamentos Aprovados" value={fmt(fin.pagamentos.valor_total_aprovado)} icon={CreditCard}
          sub={`${num(fin.pagamentos.pagamentos_aprovados)} de ${num(fin.pagamentos.total_pagamentos)}`} color="text-emerald-500" trend="up"
          help="Valor aprovado em pagamentos dentro do filtro atual." />
        <StatCard title="Valor Líquido" value={fmt(fin.pagamentos.valor_liquido_total)} icon={DollarSign}
          sub={`Taxas gateway: ${fmt(fin.pagamentos.total_taxas_gateway)}`} color="text-green-500"
          help="Valor aprovado descontando taxas conhecidas do gateway." />
        <StatCard title="Estornos" value={fmt(fin.estornos.valor_total_estornado)} icon={RefreshCw}
          sub={`${num(fin.estornos.estornos_aprovados)} aprovados · ${num(fin.estornos.estornos_pendentes)} pendentes`}
          color="text-amber-500" trend={Number(fin.estornos.total_estornos) > 0 ? "down" : "neutral"}
          help="Total de valores estornados no período selecionado." />
        <StatCard title="Splits Transferidos" value={fmt(fin.splits.valor_liquido_transferido)} icon={ArrowUpRight}
          sub={`${num(fin.splits.splits_transferidos)} de ${num(fin.splits.total_splits)} · ${num(fin.splits.splits_pendentes)} pendentes`}
          color="text-indigo-500"
          help="Valor líquido já transferido em splits de pagamento." />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MiniSummary icon={Truck} title="Entregas" color="text-teal-500" rows={[
          ["Total", num(m.entregas.total_entregas)],
          ["Aguardando", num(m.entregas.entregas_aguardando)],
          ["Em andamento", num(m.entregas.entregas_em_andamento)],
          ["Concluídas", num(m.entregas.entregas_concluidas)],
        ]} help="Resumo operacional das entregas no escopo selecionado." />
        <MiniSummary icon={Box} title="Estoque" color="text-orange-500" rows={[
          ["Registros", num(m.estoque.total_registros_estoque)],
          ["Estoque baixo", num(m.estoque.produtos_estoque_baixo)],
          ["Sem estoque", num(m.estoque.produtos_sem_estoque)],
          ["Reservados", num(m.estoque.total_quantidade_reservada)],
        ]} help="Alertas e volume de estoque para a seleção atual." />
        <MiniSummary icon={ShoppingCart} title="Carrinhos" color="text-violet-500" rows={[
          ["Total", num(m.carrinhos.total_carrinhos)],
          ["Ativos", num(m.carrinhos.carrinhos_ativos)],
          ["Convertidos", num(m.carrinhos.carrinhos_convertidos)],
          ["Abandonados", num(m.carrinhos.carrinhos_abandonados)],
        ]} help="Resumo de carrinhos registrados na plataforma." />
        <MiniSummary icon={Ticket} title="Cupons & Auditoria" color="text-pink-500" rows={[
          ["Cupons ativos", num(r.cupons_ativos)],
          ["Usos de cupom", num(m.cupons.total_usos)],
          ["Logs auditoria", num(m.auditoria.total_logs)],
          ["Webhooks", `${num(fin.webhooks.processadas)}/${num(fin.webhooks.total_notificacoes)}`],
        ]} help="Acompanhamento de cupons, auditoria e notificações de pagamento." />
      </div>

      {(Number(m.estoque.produtos_sem_estoque) > 0 || Number(fin.webhooks.com_erro) > 0 || Number(fin.pagamentos.pagamentos_rejeitados) > 0) && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <span title="Alertas que exigem atenção operacional.">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Number(m.estoque.produtos_sem_estoque) > 0 && <p className="text-amber-700 dark:text-amber-400">{num(m.estoque.produtos_sem_estoque)} produto(s) sem estoque</p>}
            {Number(fin.webhooks.com_erro) > 0 && <p className="text-amber-700 dark:text-amber-400">{num(fin.webhooks.com_erro)} webhook(s) com erro de processamento</p>}
            {Number(fin.pagamentos.pagamentos_rejeitados) > 0 && <p className="text-amber-700 dark:text-amber-400">{num(fin.pagamentos.pagamentos_rejeitados)} pagamento(s) rejeitado(s)</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniSummary({ icon: Icon, title, rows, color, help }: {
  icon: ElementType;
  title: string;
  rows: Array<[string, string]>;
  color: string;
  help: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span title={help}>
            <Icon className={`h-4 w-4 ${color}`} />
          </span>
          {title}
          <span title={help}>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
