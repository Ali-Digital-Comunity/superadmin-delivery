import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeService } from "../../features/stores/storeService";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ArrowLeft, Edit, Store, Mail, Phone, Hash, Clock, DollarSign, Truck, FileText, Image, Users, WalletCards } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import ContasFinanceirasLoja from "./components/ContasFinanceirasLoja";
import AdminsLoja from "./components/AdminsLoja";

type StoreTab = "dados" | "administradores" | "financeiro";

export default function StoreDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<StoreTab>("dados");

  const { data: store, isLoading, error } = useQuery({
    queryKey: ["store", id],
    queryFn: () => storeService.getById(id!),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando detalhes da loja...</div>;
  }

  if (error || !store) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar detalhes da loja.</div>;
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "ativa": return <Badge variant="success">Ativa</Badge>;
      case "inativa": return <Badge variant="secondary">Inativa</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tabs: Array<{ id: StoreTab; label: string; icon: typeof Store }> = [
    { id: "dados", label: "Dados da loja", icon: Store },
    { id: "administradores", label: "Administradores", icon: Users },
    { id: "financeiro", label: "Financeiro", icon: WalletCards },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/stores">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Detalhes da Loja
            </h2>
            <p className="text-muted-foreground text-sm">
              Visualize as informações completas deste mercado.
            </p>
          </div>
        </div>
        <Link to={`/stores/${store.id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" /> Editar Loja
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "dados" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Identificação e dados principais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome da Loja</p>
                <p className="text-lg font-semibold">{store.nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> CNPJ
                  </p>
                  <p>{store.cnpj}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(store.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Razão Social</p>
                <p>{store.razao_social || "Não informado"}</p>
              </div>

              {store.descricao && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Descrição
                  </p>
                  <p className="text-sm mt-1 bg-slate-50 p-3 rounded-md dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    {store.descricao}
                  </p>
                </div>
              )}

              {store.logo_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Image className="w-3 h-3" /> Logo
                  </p>
                  <img src={store.logo_url} alt="Logo da loja" className="mt-1 h-16 w-16 rounded-md object-cover border" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
              <CardDescription>Canais de comunicação da loja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                  <p className="font-medium">{store.email || "Não informado"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone / WhatsApp</p>
                  <p className="font-medium">{store.telefone || "Não informado"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operação */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Configurações de Operação
              </CardTitle>
              <CardDescription>Horários, taxas e valores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Abertura
                  </p>
                  <p className="text-lg font-semibold">{store.horario_abertura || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Fechamento
                  </p>
                  <p className="text-lg font-semibold">{store.horario_fechamento || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Pedido Mínimo
                  </p>
                  <p className="text-lg font-semibold">
                    R$ {Number(store.valor_minimo_pedido || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Taxa de Entrega
                  </p>
                  <p className="text-lg font-semibold">
                    R$ {Number(store.taxa_entrega_padrao || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "administradores" && (
        <AdminsLoja lojaId={store.id} lojaNome={store.nome} />
      )}

      {activeTab === "financeiro" && (
        <ContasFinanceirasLoja lojaId={store.id} />
      )}
    </div>
  );
}
