import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeService } from "../../features/stores/storeService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";

const DEFAULT_PRIMARY_COLOR = "#122a4c";
const DEFAULT_SECONDARY_COLOR = "#16a34a";
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor válida");

const storeSchema = z.object({
  nome: z.string().min(3, "O nome da loja é obrigatório (mín. 3 caracteres)"),
  razao_social: z.string().optional().or(z.literal("")),
  cnpj: z.string().min(14, "CNPJ inválido"),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  descricao: z.string().optional().or(z.literal("")),
  logo_url: z.string().optional().or(z.literal("")),
  status: z.enum(["ativa", "inativa"]),
  horario_abertura: z.string().optional().or(z.literal("")),
  horario_fechamento: z.string().optional().or(z.literal("")),
  valor_minimo_pedido: z.number().min(0, "Valor mínimo não pode ser negativo"),
  taxa_entrega_padrao: z.number().min(0, "Taxa não pode ser negativa"),
  latitude: z.number().min(-90, "Latitude inválida").max(90, "Latitude inválida").nullable().optional(),
  longitude: z.number().min(-180, "Longitude inválida").max(180, "Longitude inválida").nullable().optional(),
  cor_primaria: colorSchema,
  cor_secundaria: colorSchema,
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function StoreForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      status: "ativa",
      valor_minimo_pedido: 0,
      taxa_entrega_padrao: 0,
      latitude: null,
      longitude: null,
      cor_primaria: DEFAULT_PRIMARY_COLOR,
      cor_secundaria: DEFAULT_SECONDARY_COLOR,
    }
  });
  const primaryColorValue = watch("cor_primaria") || DEFAULT_PRIMARY_COLOR;
  const secondaryColorValue = watch("cor_secundaria") || DEFAULT_SECONDARY_COLOR;

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: () => storeService.getById(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (store && isEditing) {
      reset({
        nome: store.nome || "",
        razao_social: store.razao_social || "",
        cnpj: store.cnpj || "",
        telefone: store.telefone || "",
        email: store.email || "",
        descricao: store.descricao || "",
        logo_url: store.logo_url || "",
        status: store.status as "ativa" | "inativa",
        horario_abertura: store.horario_abertura || "",
        horario_fechamento: store.horario_fechamento || "",
        valor_minimo_pedido: Number(store.valor_minimo_pedido) || 0,
        taxa_entrega_padrao: Number(store.taxa_entrega_padrao) || 0,
        latitude: store.latitude === null || store.latitude === undefined ? null : Number(store.latitude),
        longitude: store.longitude === null || store.longitude === undefined ? null : Number(store.longitude),
        cor_primaria: store.cor_primaria || DEFAULT_PRIMARY_COLOR,
        cor_secundaria: store.cor_secundaria || DEFAULT_SECONDARY_COLOR,
      });
    }
  }, [store, reset, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      // Limpa campos vazios para enviar null ao backend
      const payload: Record<string, any> = { ...data };

      const optionalFields = ["razao_social", "telefone", "email", "descricao", "logo_url", "horario_abertura", "horario_fechamento"];
      for (const field of optionalFields) {
        if (payload[field] === "") {
          payload[field] = null;
        }
      }

      if (isEditing) {
        return storeService.update(id, payload);
      }

      return storeService.create(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      navigate("/stores");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || "Erro ao salvar loja.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  });

  const onSubmit: SubmitHandler<StoreFormValues> = (data) => {
    setError("");
    mutation.mutate(data);
  };

  if (isEditing && isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados da loja...</div>;
  }

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
              {isEditing ? "Editar Loja" : "Nova Loja"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEditing ? "Altere as informações da loja existente." : "Preencha os dados para cadastrar uma nova loja."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100/50 rounded-md">
            {error}
          </div>
        )}

        {/* Card 1: Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados principais de identificação da loja.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Loja <span className="text-red-500">*</span></Label>
                <Input id="nome" placeholder="Ex: Mercado Compre Bem" {...register("nome")} className={errors.nome ? "border-red-500" : ""} />
                {errors.nome && <span className="text-xs text-red-500">{errors.nome.message}</span>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input id="razao_social" placeholder="Compre Bem LTDA" {...register("razao_social")} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ <span className="text-red-500">*</span></Label>
                <Input id="cnpj" placeholder="00.000.000/0000-00" {...register("cnpj")} className={errors.cnpj ? "border-red-500" : ""} />
                {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input id="email" type="email" placeholder="contato@comprebem.com" {...register("email")} className={errors.email ? "border-red-500" : ""} />
                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" {...register("telefone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select 
                  id="status" 
                  {...register("status")} 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Cores do app */}
        <Card>
          <CardHeader>
            <CardTitle>Cores do App</CardTitle>
            <CardDescription>Defina a identidade visual usada no app do cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor_primaria">Cor primária <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="cor_primaria_picker"
                    type="color"
                    value={colorSchema.safeParse(primaryColorValue).success ? primaryColorValue : DEFAULT_PRIMARY_COLOR}
                    onChange={(event) => setValue("cor_primaria", event.target.value, { shouldDirty: true, shouldValidate: true })}
                    className="h-10 w-14 p-1"
                  />
                  <Input id="cor_primaria" placeholder={DEFAULT_PRIMARY_COLOR} {...register("cor_primaria")} className={errors.cor_primaria ? "border-red-500" : ""} />
                </div>
                {errors.cor_primaria && <span className="text-xs text-red-500">{errors.cor_primaria.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor_secundaria">Cor secundária <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="cor_secundaria_picker"
                    type="color"
                    value={colorSchema.safeParse(secondaryColorValue).success ? secondaryColorValue : DEFAULT_SECONDARY_COLOR}
                    onChange={(event) => setValue("cor_secundaria", event.target.value, { shouldDirty: true, shouldValidate: true })}
                    className="h-10 w-14 p-1"
                  />
                  <Input id="cor_secundaria" placeholder={DEFAULT_SECONDARY_COLOR} {...register("cor_secundaria")} className={errors.cor_secundaria ? "border-red-500" : ""} />
                </div>
                {errors.cor_secundaria && <span className="text-xs text-red-500">{errors.cor_secundaria.message}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Operação */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Operação</CardTitle>
            <CardDescription>Horários, taxas e valores mínimos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horario_abertura">Horário de Abertura</Label>
                <Input id="horario_abertura" type="time" {...register("horario_abertura")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario_fechamento">Horário de Fechamento</Label>
                <Input id="horario_fechamento" type="time" {...register("horario_fechamento")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_minimo_pedido">Valor Mínimo do Pedido (R$)</Label>
                <Input id="valor_minimo_pedido" type="number" step="0.01" min="0" placeholder="0.00" {...register("valor_minimo_pedido", { valueAsNumber: true })} className={errors.valor_minimo_pedido ? "border-red-500" : ""} />
                {errors.valor_minimo_pedido && <span className="text-xs text-red-500">{errors.valor_minimo_pedido.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa_entrega_padrao">Taxa de Entrega Padrão (R$)</Label>
                <Input id="taxa_entrega_padrao" type="number" step="0.01" min="0" placeholder="0.00" {...register("taxa_entrega_padrao", { valueAsNumber: true })} className={errors.taxa_entrega_padrao ? "border-red-500" : ""} />
                {errors.taxa_entrega_padrao && <span className="text-xs text-red-500">{errors.taxa_entrega_padrao.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude da Loja</Label>
                <Input id="latitude" type="number" step="0.0000001" min="-90" max="90" placeholder="-8.047562" {...register("latitude", { setValueAs: (value) => value === "" ? null : Number(value) })} className={errors.latitude ? "border-red-500" : ""} />
                {errors.latitude && <span className="text-xs text-red-500">{errors.latitude.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude da Loja</Label>
                <Input id="longitude" type="number" step="0.0000001" min="-180" max="180" placeholder="-34.877000" {...register("longitude", { setValueAs: (value) => value === "" ? null : Number(value) })} className={errors.longitude ? "border-red-500" : ""} />
                {errors.longitude && <span className="text-xs text-red-500">{errors.longitude.message}</span>}
                <p className="text-xs text-muted-foreground">Usada como origem das rotas de entrega.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Complementar */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Complementares</CardTitle>
            <CardDescription>Logo e descrição da loja.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input id="logo_url" type="url" placeholder="https://cdn.exemplo.com/logo.png" {...register("logo_url")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <textarea 
                  id="descricao" 
                  rows={3}
                  placeholder="Breve descrição da loja..." 
                  {...register("descricao")}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/stores">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Salvando..." : "Salvar Loja"}
          </Button>
        </div>
      </form>
    </div>
  );
}
