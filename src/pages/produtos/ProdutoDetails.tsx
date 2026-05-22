import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Image as ImageIcon, Layers, Loader2, Package, Plus, Tag, Trash2 } from "lucide-react";

import { produtoService } from "../../features/produtos/produtoService";
import { variacaoProdutoService, type VariacaoProduto } from "../../features/produtos/variacaoProdutoService";
import ProductImageGallery from "./ProductImageGallery";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

// -- Schema for Variations
const variacaoSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  codigo_barras: z.string().optional(),
  sku: z.string().optional(),
  peso: z.number().min(0, "Peso não pode ser negativo"),
  quantidade_unidade: z.number().min(0, "Quantidade não pode ser negativa"),
  ativa: z.boolean(),
});

type VariacaoFormValues = z.infer<typeof variacaoSchema>;

export default function ProdutoDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isVariacaoModalOpen, setIsVariacaoModalOpen] = useState(false);
  const [editingVariacaoId, setEditingVariacaoId] = useState<string | null>(null);

  // Queries
  const { data: produtoData, isLoading: isLoadingProduto } = useQuery({
    queryKey: ["produto", id],
    queryFn: () => produtoService.getById(id!),
    enabled: !!id,
  });

  const { data: variacoesData, isLoading: isLoadingVariacoes } = useQuery({
    queryKey: ["variacoes_produto", id],
    queryFn: () => variacaoProdutoService.getByProdutoId(id!),
    enabled: !!id,
  });

  const produto = produtoData;
  const variacoes: VariacaoProduto[] = Array.isArray(variacoesData?.data) ? variacoesData.data : (Array.isArray(variacoesData) ? variacoesData : []);

  // Mutations
  const deleteVariacaoMutation = useMutation({
    mutationFn: (variacaoId: string) => variacaoProdutoService.delete(variacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variacoes_produto", id] });
    },
  });

  const toggleAtivaMutation = useMutation({
    mutationFn: ({ variacaoId, ativa }: { variacaoId: string; ativa: boolean }) =>
      variacaoProdutoService.toggleAtiva(variacaoId, ativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variacoes_produto", id] });
    },
  });

  const saveVariacaoMutation = useMutation({
    mutationFn: (data: VariacaoFormValues) => {
      if (editingVariacaoId) {
        return variacaoProdutoService.update(editingVariacaoId, data);
      }
      return variacaoProdutoService.create({ ...data, produto_id: id! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variacoes_produto", id] });
      closeVariacaoModal();
    },
  });

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VariacaoFormValues>({
    resolver: zodResolver(variacaoSchema),
    defaultValues: {
      ativa: true,
      peso: 0,
      quantidade_unidade: 1,
    },
  });

  const openVariacaoModal = (variacao?: VariacaoProduto) => {
    if (variacao) {
      setEditingVariacaoId(variacao.id);
      reset({
        nome: variacao.nome,
        codigo_barras: variacao.codigo_barras || "",
        sku: variacao.sku || "",
        peso: variacao.peso,
        quantidade_unidade: variacao.quantidade_unidade,
        ativa: variacao.ativa,
      });
    } else {
      setEditingVariacaoId(null);
      reset({
        nome: "",
        codigo_barras: "",
        sku: "",
        peso: 0,
        quantidade_unidade: 1,
        ativa: true,
      });
    }
    setIsVariacaoModalOpen(true);
  };

  const closeVariacaoModal = () => {
    setIsVariacaoModalOpen(false);
    setEditingVariacaoId(null);
    reset();
  };

  const onVariacaoSubmit = (data: VariacaoFormValues) => {
    saveVariacaoMutation.mutate(data);
  };

  if (isLoadingProduto) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!produto) {
    return <div className="text-center p-12 text-red-500">Produto não encontrado.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{produto.nome}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant={produto.ativo ? "default" : "secondary"} className={produto.ativo ? "bg-green-100 text-green-700" : ""}>
                {produto.ativo ? "Produto Ativo" : "Produto Inativo"}
              </Badge>
              <span>•</span>
              <span className="truncate">{produto.descricao || "Sem descrição"}</span>
            </div>
          </div>
        </div>
        <Link to={`/products/${produto.id}/edit`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar Produto
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Info Principal */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Detalhes Globais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {produto.imagem_url ? (
                  <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-16 h-16 text-slate-300" />
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground">Marca</span>
                  <span className="font-medium">{produto.marca || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground">Cód. Barras</span>
                  <span className="font-medium">{produto.codigo_barras || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground">Unidade</span>
                  <span className="font-medium uppercase">{produto.unidade_medida}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Venda por Peso</span>
                  <span className="font-medium">{produto.vendavel_por_peso ? "Sim" : "Não"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Variações */}
        <div className="md:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Variações do Produto
                </CardTitle>
                <CardDescription>
                  Gerencie tamanhos, cores ou pacotes específicos para este produto.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => openVariacaoModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Variação
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingVariacoes ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : variacoes.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-900 dark:text-slate-100">Nenhuma variação cadastrada</p>
                  <p className="text-sm text-muted-foreground mb-4">Produtos sem variação usarão as configurações padrão quando importados nas lojas.</p>
                  <Button variant="outline" size="sm" onClick={() => openVariacaoModal()}>Adicionar Variação</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {variacoes.map(variacao => (
                    <div key={variacao.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${variacao.ativa ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div>
                          <p className="font-semibold text-sm">{variacao.nome}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>SKU: {variacao.sku || "-"}</span>
                            <span>EAN: {variacao.codigo_barras || "-"}</span>
                            <span>Peso: {variacao.peso}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAtivaMutation.mutate({ variacaoId: variacao.id, ativa: !variacao.ativa })}>
                          <div className={`w-3 h-3 rounded-full border ${variacao.ativa ? 'bg-green-500 border-green-600' : 'bg-transparent border-slate-400'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openVariacaoModal(variacao)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => {
                          if (window.confirm("Excluir esta variação permanentemente?")) {
                            deleteVariacaoMutation.mutate(variacao.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Imagens do Produto
          </CardTitle>
          <CardDescription>
            Gerencie galeria, imagem principal, uploads locais e imagens por URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductImageGallery productId={produto.id} productName={produto.nome} />
        </CardContent>
      </Card>

      {/* Modal / Formulário In-line de Variação (Usando div fixa para simular modal por simplicidade sem add lib externa de Dialog) */}
      {isVariacaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <form onSubmit={handleSubmit(onVariacaoSubmit)}>
              <CardHeader>
                <CardTitle>{editingVariacaoId ? "Editar Variação" : "Nova Variação"}</CardTitle>
                <CardDescription>
                  Informe os detalhes desta variação para o produto {produto.nome}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Variação (ex: 2 Litros, Cor Azul, Pacote C/ 10)</Label>
                  <Input {...register("nome")} placeholder="Digite o nome..." />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input {...register("sku")} placeholder="Opcional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cód. Barras (EAN)</Label>
                    <Input {...register("codigo_barras")} placeholder="Opcional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peso (Kg)</Label>
                    <Input type="number" step="0.01" {...register("peso", { valueAsNumber: true })} />
                    {errors.peso && <p className="text-sm text-red-500">{errors.peso.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd. na Unidade</Label>
                    <Input type="number" {...register("quantidade_unidade", { valueAsNumber: true })} />
                    {errors.quantidade_unidade && <p className="text-sm text-red-500">{errors.quantidade_unidade.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="ativa_var" {...register("ativa")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <Label htmlFor="ativa_var" className="cursor-pointer">Variação Ativa</Label>
                </div>
                
                {saveVariacaoMutation.isError && (
                  <p className="text-sm text-red-500">Erro ao salvar variação. Tente novamente.</p>
                )}
              </CardContent>
              <div className="flex justify-end gap-2 p-6 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={closeVariacaoModal}>Cancelar</Button>
                <Button type="submit" disabled={saveVariacaoMutation.isPending}>
                  {saveVariacaoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
