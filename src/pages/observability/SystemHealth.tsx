import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  Gauge,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  X,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { formatBrasiliaDate } from "../../lib/dateTime";
import {
  observabilityService,
  type IncidentFilters,
  type IncidentSeverity,
  type IncidentStatus,
  type SystemHealthStatus,
  type SystemIncident,
} from "../../features/observability/observabilityService";

const statusLabel: Record<SystemHealthStatus, string> = {
  online: "Online",
  instavel: "Instável",
  fora_do_ar: "Fora do ar",
};

const incidentStatusLabel: Record<IncidentStatus, string> = {
  open: "Aberto",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
};

const severityLabel: Record<IncidentSeverity, string> = {
  info: "Info",
  warning: "Alerta",
  critical: "Crítico",
};

const severityVariant = (severity: IncidentSeverity) => {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "warning";
  return "secondary";
};

const statusVariant = (status: IncidentStatus) => {
  if (status === "resolved") return "success";
  if (status === "acknowledged") return "warning";
  return "destructive";
};

const healthTone = (status?: SystemHealthStatus) => {
  if (status === "fora_do_ar") return "text-red-600 bg-red-50 border-red-200";
  if (status === "instavel") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
};

const healthIcon = (status?: SystemHealthStatus) => {
  if (status === "fora_do_ar") return ShieldAlert;
  if (status === "instavel") return AlertTriangle;
  return CheckCircle2;
};

const formatMs = (value?: number | null) => (
  typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString("pt-BR")} ms` : "Indisponivel"
);

const metricsUnavailableLabel = (reason?: string | null) => {
  if (reason === "missing_cloud_monitoring_config") return "Cloud Monitoring nao configurado.";
  if (reason === "missing_cloud_monitoring_project_id") return "Projeto GCP nao encontrado.";
  if (reason === "missing_cloud_run_service_name") return "Servico Cloud Run nao encontrado.";
  if (reason === "missing_cloud_monitoring_project_and_service") return "Projeto GCP e servico nao encontrados.";
  if (reason === "cloud_monitoring_unavailable") return "Cloud Monitoring indisponivel.";
  return null;
};

export default function SystemHealth() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<IncidentFilters>({ page: 1, per_page: 20 });
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["system-health-summary"],
    queryFn: () => observabilityService.getSystemHealthSummary(),
    refetchInterval: 60_000,
  });

  const incidentsQuery = useQuery({
    queryKey: ["system-incidents", filters],
    queryFn: () => observabilityService.listSystemIncidents(filters),
  });

  const invalidateObservability = () => {
    queryClient.invalidateQueries({ queryKey: ["system-health-summary"] });
    queryClient.invalidateQueries({ queryKey: ["system-incidents"] });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => observabilityService.acknowledgeSystemIncident(id),
    onSuccess: invalidateObservability,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => observabilityService.resolveSystemIncident(id),
    onSuccess: invalidateObservability,
  });

  const incidents = incidentsQuery.data?.data || [];
  const metrics = summaryQuery.data?.metrics;
  const metricsIssue = metricsUnavailableLabel(metrics?.unavailable_reason);
  const services = useMemo(() => {
    const values = new Set<string>();
    [...incidents, ...(summaryQuery.data?.latest_incidents || [])].forEach((incident) => {
      if (incident.service) values.add(incident.service);
    });
    return Array.from(values).sort();
  }, [incidents, summaryQuery.data?.latest_incidents]);

  const HealthIcon = healthIcon(summaryQuery.data?.status);

  const updateFilter = (key: keyof IncidentFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const refresh = () => {
    summaryQuery.refetch();
    incidentsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <Activity className="h-6 w-6 text-primary" />
            Saúde do Sistema
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Incidentes operacionais do backend e alertas recebidos pelo monitoramento.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={summaryQuery.isFetching || incidentsQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${summaryQuery.isFetching || incidentsQuery.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Gauge className="h-4 w-4 text-blue-600" />
              Media das requisicoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMs(metrics?.request_latency_avg_ms)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {metricsIssue || `Cloud Run nos ultimos ${metrics?.window_minutes || 15} min.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-purple-600" />
              P95 das requisicoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMs(metrics?.request_latency_p95_ms)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {metricsIssue || "Percentil 95 informado pelo Cloud Monitoring."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-emerald-600" />
              Banco de dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMs(metrics?.database_probe_ms)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Probe leve SELECT 1 executado pelo backend.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-slate-600" />
              Resumo do backend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMs(metrics?.backend_summary_ms)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Tempo para montar este resumo operacional.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`border shadow-sm ${healthTone(summaryQuery.data?.status)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <HealthIcon className="h-4 w-4" />
              Status geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusLabel[summaryQuery.data?.status || "online"]}</div>
            <p className="mt-1 text-xs opacity-80">
              {summaryQuery.data?.timestamp
                ? `Atualizado em ${formatBrasiliaDate(summaryQuery.data.timestamp, { dateStyle: "short", timeStyle: "short" })}`
                : "Aguardando dados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Incidentes abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryQuery.data?.open_incidents ?? 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">Abertos ou reconhecidos agora.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              Críticos em 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryQuery.data?.critical_last_24h ?? 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">Incidentes críticos criados nas últimas 24 horas.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filters.status || ""} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="">Todos</option>
                <option value="open">Aberto</option>
                <option value="acknowledged">Reconhecido</option>
                <option value="resolved">Resolvido</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Severidade</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filters.severity || ""} onChange={(event) => updateFilter("severity", event.target.value)}>
                <option value="">Todas</option>
                <option value="info">Info</option>
                <option value="warning">Alerta</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Serviço</Label>
              <Input list="system-health-services" value={filters.service || ""} onChange={(event) => updateFilter("service", event.target.value)} placeholder="delivery-backend" />
              <datalist id="system-health-services">
                {services.map((service) => <option key={service} value={service} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>De</Label>
              <Input type="date" value={filters.date_from || ""} onChange={(event) => updateFilter("date_from", event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <Input type="date" value={filters.date_to || ""} onChange={(event) => updateFilter("date_to", event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos incidentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Carregando incidentes...
                    </TableCell>
                  </TableRow>
                ) : incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhum incidente encontrado.
                    </TableCell>
                  </TableRow>
                ) : incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <div className="max-w-sm">
                        <div className="font-medium text-slate-900">{incident.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{incident.description || incident.metric_name || incident.source}</div>
                        {incident.tenant_id && <div className="mt-1 font-mono text-xs text-muted-foreground">{incident.tenant_id}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{incident.service}</div>
                      <div className="text-xs text-muted-foreground">{incident.environment}</div>
                    </TableCell>
                    <TableCell><Badge variant={severityVariant(incident.severity)}>{severityLabel[incident.severity]}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(incident.status)}>{incidentStatusLabel[incident.status]}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatBrasiliaDate(incident.created_at, { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Ver payload" onClick={() => setSelectedIncident(incident)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {incident.status === "open" && (
                          <Button variant="outline" size="sm" onClick={() => acknowledgeMutation.mutate(incident.id)} disabled={acknowledgeMutation.isPending}>
                            Reconhecer
                          </Button>
                        )}
                        {incident.status !== "resolved" && (
                          <Button size="sm" onClick={() => resolveMutation.mutate(incident.id)} disabled={resolveMutation.isPending}>
                            Resolver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{selectedIncident.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Payload bruto sanitizado para debug.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedIncident(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-5">
              <pre className="rounded-md bg-slate-950 p-4 text-xs text-slate-100 whitespace-pre-wrap break-words">
                {JSON.stringify(selectedIncident.raw_payload || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
