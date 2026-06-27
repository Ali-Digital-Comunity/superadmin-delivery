import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { storeService, type Store } from "../../features/stores/storeService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, Edit, Eye, Trash2 } from "lucide-react";

export default function StoresList() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storeService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "ativa": return <Badge variant="success">Ativa</Badge>;
      case "inativa": return <Badge variant="secondary">Inativa</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stores = Array.isArray(data?.data?.data) 
    ? data.data.data 
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));

  const filteredStores = stores.filter((store: Store) => 
    store.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    store.cnpj?.includes(searchTerm) ||
    store.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente excluir a loja "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Lojas</h2>
          <p className="text-muted-foreground text-sm">Visualize e gerencie todas as lojas da plataforma.</p>
        </div>
        <Link to="/stores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Loja
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, CNPJ ou e-mail..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando lojas...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-red-500">
                  Erro ao carregar lojas.
                </TableCell>
              </TableRow>
            ) : filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma loja encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredStores.map((store: Store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">
                    <div>
                      <span>{store.nome}</span>
                      {store.razao_social && (
                        <span className="block text-xs text-muted-foreground">{store.razao_social}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{store.cnpj}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{store.email || "—"}</span>
                      <span className="text-xs text-muted-foreground">{store.telefone || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm capitalize">{store.tipo_estabelecimento || "mercado"}</span>
                      {store.cardapio_configuravel_ativo && <Badge variant="outline">Cardápio ativo</Badge>}
                      {store.permitir_configurar_cpf_na_nota !== false && <Badge variant="outline">CPF na nota</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {store.horario_abertura && store.horario_fechamento 
                        ? `${store.horario_abertura} – ${store.horario_fechamento}`
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.visivel_no_app_cliente !== false ? "success" : "secondary"}>
                      {store.visivel_no_app_cliente !== false ? "Principal" : "Teste"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(store.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/stores/${store.id}`}>
                        <Button variant="ghost" size="icon" title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/stores/${store.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Excluir"
                        onClick={() => handleDelete(store.id, store.nome)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
