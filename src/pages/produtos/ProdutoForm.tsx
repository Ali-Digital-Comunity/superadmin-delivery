import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { produtoService } from "../../features/produtos/produtoService";
import { categoriaService, type Categoria } from "../../features/categorias/categoriaService";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "Slug deve ter pelo menos 2 caracteres"),
  categoria_id: z.string().uuid("Selecione uma categoria"),
  descricao: z.string().optional(),
  marca: z.string().optional(),
  codigo_barras: z.string().optional(),
  unidade_medida: z.string().min(1, "Unidade de medida é obrigatória"),
  vendavel_por_peso: z.boolean(),
  imagem_url: z.string().url("URL de imagem inválida").optional().or(z.literal("")),
  ativo: z.boolean(),
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCategorias(payload: unknown): Categoria[] {
  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data as Categoria[];
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as Categoria[];
  if (Array.isArray(payload)) return payload;
  return [];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) return fallback;
  const data = error.response.data;
  return typeof data.message === "string" ? data.message : fallback;
}

function sortCategorias(categorias: Categoria[]) {
  return [...categorias].sort((a, b) => {
    const pathA = a.caminho || a.nome;
    const pathB = b.caminho || b.nome;
    return (a.nivel ?? 1) - (b.nivel ?? 1) || pathA.localeCompare(pathB);
  });
}

export default function ProdutoForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categoriasData } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => categoriaService.getAll(),
  });
  const categorias = useMemo(() => sortCategorias(normalizeCategorias(categoriasData)), [categoriasData]);

  const { data: produtoData, isLoading: isLoadingProduto } = useQuery({
    queryKey: ["produto", id],
    queryFn: () => produtoService.getById(id!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      ativo: true,
      vendavel_por_peso: false,
      unidade_medida: "unidade",
    },
  });

  useEffect(() => {
    if (isEditing && produtoData) {
      const p = produtoData;
      reset({
        nome: p.nome || "",
        slug: p.slug || "",
        categoria_id: p.categoria_id || "",
        descricao: p.descricao || "",
        marca: p.marca || "",
        codigo_barras: p.codigo_barras || "",
        unidade_medida: p.unidade_medida || "unidade",
        vendavel_por_peso: p.vendavel_por_peso ?? false,
        imagem_url: p.imagem_url || "",
        ativo: p.ativo ?? true,
      });
    }
  }, [isEditing, produtoData, reset]);

  // Auto-generate slug from name if not editing
  const nomeValue = watch("nome");
  const categoriaId = watch("categoria_id");
  const selectedCategory = categorias.find((categoria) => categoria.id === categoriaId);
  useEffect(() => {
    if (!isEditing && nomeValue) {
      const slug = nomeValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("slug", slug, { shouldValidate: true });
    }
  }, [nomeValue, isEditing, setValue]);

  const mutation = useMutation({
    mutationFn: (data: ProdutoFormValues) => {
      if (isEditing) {
        return produtoService.update(id, data);
      }
      return produtoService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      navigate("/products");
    },
  });

  const onSubmit: SubmitHandler<ProdutoFormValues> = (data) => {
    // limpar empty strings to nulls or undefined before send if needed
    mutation.mutate(data);
  };

  if (isEditing && isLoadingProduto) {
    return <div className="flex items-center justify-center p-12">Carregando produto...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Editar Produto" : "Novo Produto"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEditing ? "Atualize os dados do produto no catálogo." : "Adicione um novo produto ao catálogo global."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto</Label>
                <Input id="nome" {...register("nome")} placeholder="Ex: Arroz Branco 5kg" />
                {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...register("slug")} placeholder="arroz-branco-5kg" />
                {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" {...register("descricao")} placeholder="Descrição detalhada do produto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoria_id">Categoria</Label>
                <select
                  id="categoria_id"
                  {...register("categoria_id")}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {"  ".repeat(Math.max((cat.nivel ?? 1) - 1, 0))}
                      {cat.emoji || "📁"} {cat.caminho || cat.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Prefira selecionar a subcategoria mais específica. Categoria atual: {selectedCategory?.caminho || selectedCategory?.nome || "nenhuma"}.
                </p>
                {errors.categoria_id && <p className="text-sm text-red-500">{errors.categoria_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" {...register("marca")} placeholder="Opcional" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras (EAN)</Label>
                <Input id="codigo_barras" {...register("codigo_barras")} placeholder="789..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade_medida">Unidade de Medida</Label>
                <select
                  id="unidade_medida"
                  {...register("unidade_medida")}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="unidade">Unidade (un)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="g">Grama (g)</option>
                  <option value="l">Litro (L)</option>
                  <option value="ml">Mililitro (ml)</option>
                  <option value="cx">Caixa (cx)</option>
                </select>
              </div>

              <div className="space-y-2 flex items-center pt-8">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vendavel_por_peso"
                    {...register("vendavel_por_peso")}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="vendavel_por_peso" className="cursor-pointer">
                    Vendido por peso (fração)?
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagem_url">URL da Imagem</Label>
              <Input id="imagem_url" {...register("imagem_url")} placeholder="https://..." />
              {errors.imagem_url && <p className="text-sm text-red-500">{errors.imagem_url.message}</p>}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <input
                type="checkbox"
                id="ativo"
                {...register("ativo")}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="ativo" className="font-semibold cursor-pointer">
                Produto Ativo
              </Label>
            </div>

            {mutation.isError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {getApiErrorMessage(mutation.error, "Erro ao salvar produto")}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/products")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEditing ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
