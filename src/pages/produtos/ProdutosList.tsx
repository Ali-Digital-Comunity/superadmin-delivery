import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Edit, MoreVertical, Package, Plus, Search, Settings, Trash2 } from "lucide-react";
import { produtoService, type PaginatedProdutos, type Produto } from "../../features/produtos/produtoService";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";

export default function ProdutosList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [searchTerm, perPage, sortBy, sortOrder]);

  const queryParams = useMemo(() => ({
    page,
    per_page: perPage,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(searchTerm.trim() ? { busca_global: searchTerm.trim() } : {}),
  }), [page, perPage, searchTerm, sortBy, sortOrder]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["produtos", queryParams],
    queryFn: () => produtoService.getAll(queryParams),
  });

  const paginated: PaginatedProdutos = {
    data: Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []),
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? page),
    per_page: Number(data?.per_page ?? perPage),
    total_pages: Number(data?.total_pages ?? 1),
  };

  const produtos: Produto[] = paginated.data;
  const totalPages = Math.max(1, paginated.total_pages || 1);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => produtoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      produtoService.toggleAtivo(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos Globais</h2>
          <p className="text-muted-foreground">Gerencie o catálogo global de produtos da plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/products/import">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
          </Link>
          <Link to="/products/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome, descrição, marca ou EAN..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="nome">Nome</option>
                <option value="marca">Marca</option>
                <option value="codigo_barras">Código de barras</option>
                <option value="ativo">Status</option>
                <option value="criado_em">Criado em</option>
                <option value="atualizado_em">Atualizado em</option>
              </select>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
              <select
                value={perPage}
                onChange={(event) => setPerPage(Number(event.target.value))}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Cód. Barras</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Carregando produtos...
                    </td>
                  </tr>
                ) : produtos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {produto.imagem_url ? (
                              <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {produto.nome}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {produto.descricao || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {produto.codigo_barras || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {produto.marca || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-normal">
                          {produto.unidade_medida}
                          {produto.vendavel_por_peso && " (Peso)"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge 
                          variant={produto.ativo ? "default" : "secondary"}
                          className={produto.ativo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100" : ""}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link to={`/products/${produto.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Detalhes / Variações
                              </DropdownMenuItem>
                            </Link>
                            <Link to={`/products/${produto.id}/edit`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Produto
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => toggleAtivoMutation.mutate({ id: produto.id, ativo: !produto.ativo })}
                            >
                              <div className="w-4 h-4 mr-2 rounded-full border border-current flex items-center justify-center">
                                {produto.ativo && <div className="w-2 h-2 rounded-full bg-current" />}
                              </div>
                              {produto.ativo ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => {
                                if (window.confirm("Tem certeza que deseja excluir este produto?")) {
                                  deleteMutation.mutate(produto.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-sm text-muted-foreground">
              {isFetching ? "Atualizando..." : (
                <>
                  Página {paginated.page} de {totalPages} · {paginated.total} produto{paginated.total === 1 ? "" : "s"}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="min-w-12 text-center text-sm font-medium">
                {paginated.page}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
