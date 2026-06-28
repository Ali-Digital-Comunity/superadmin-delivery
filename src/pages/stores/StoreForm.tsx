import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  storeService,
  type StoreCreatePayload,
} from "../../features/stores/storeService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ArrowLeft, Save, UtensilsCrossed } from "lucide-react";
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
  endereco_rua: z.string().optional().or(z.literal("")),
  endereco_numero: z.string().optional().or(z.literal("")),
  endereco_complemento: z.string().optional().or(z.literal("")),
  endereco_bairro: z.string().optional().or(z.literal("")),
  endereco_cidade: z.string().optional().or(z.literal("")),
  endereco_estado: z.string().optional().or(z.literal("")),
  endereco_cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP invalido").optional().or(z.literal("")),
  cor_primaria: colorSchema,
  cor_secundaria: colorSchema,
  tipo_estabelecimento: z.enum(["mercado", "lanchonete", "restaurante", "hibrido", "outro"]),
  cardapio_configuravel_ativo: z.boolean(),
  permitir_configurar_cpf_na_nota: z.boolean(),
  exibir_avaliacao_experiencia_compra: z.boolean(),
  visivel_no_app_cliente: z.boolean(),
  preco_app_taxa_ativa: z.boolean(),
});

type StoreFormValues = z.infer<typeof storeSchema>;
type StoreApiError = {
  error?: string | { message?: string };
  message?: string;
};

const OPTIONAL_TEXT_FIELDS = [
  "razao_social",
  "telefone",
  "email",
  "descricao",
  "logo_url",
  "horario_abertura",
  "horario_fechamento",
  "endereco_rua",
  "endereco_numero",
  "endereco_complemento",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_estado",
  "endereco_cep",
] as const;

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
      tipo_estabelecimento: "mercado",
      cardapio_configuravel_ativo: false,
      permitir_configurar_cpf_na_nota: true,
      exibir_avaliacao_experiencia_compra: true,
      visivel_no_app_cliente: true,
      preco_app_taxa_ativa: false,
    }
  });
  const primaryColorValue = watch("cor_primaria") || DEFAULT_PRIMARY_COLOR;
  const secondaryColorValue = watch("cor_secundaria") || DEFAULT_SECONDARY_COLOR;
  const establishmentType = watch("tipo_estabelecimento");
  const configurableMenuEnabled = watch("cardapio_configuravel_ativo");
  const cpfInvoiceConfigurationEnabled = watch("permitir_configurar_cpf_na_nota");
  const orderExperienceFeedbackEnabled = watch("exibir_avaliacao_experiencia_compra");

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
        endereco_rua: store.endereco_rua || "",
        endereco_numero: store.endereco_numero || "",
        endereco_complemento: store.endereco_complemento || "",
        endereco_bairro: store.endereco_bairro || "",
        endereco_cidade: store.endereco_cidade || "",
        endereco_estado: store.endereco_estado || "",
        endereco_cep: store.endereco_cep || "",
        cor_primaria: store.cor_primaria || DEFAULT_PRIMARY_COLOR,
        cor_secundaria: store.cor_secundaria || DEFAULT_SECONDARY_COLOR,
        tipo_estabelecimento: store.tipo_estabelecimento || "mercado",
        cardapio_configuravel_ativo: Boolean(store.cardapio_configuravel_ativo),
        permitir_configurar_cpf_na_nota: store.permitir_configurar_cpf_na_nota !== false,
        exibir_avaliacao_experiencia_compra: store.exibir_avaliacao_experiencia_compra !== false,
        visivel_no_app_cliente: store.visivel_no_app_cliente !== false,
        preco_app_taxa_ativa: Boolean(store.preco_app_taxa_ativa),
      });
    }
  }, [store, reset, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      // Limpa campos vazios para enviar null ao backend
      const payload: StoreCreatePayload = {
        ...data,
        tipo_estabelecimento: data.tipo_estabelecimento,
        cardapio_configuravel_ativo: data.cardapio_configuravel_ativo === true,
        permitir_configurar_cpf_na_nota: data.permitir_configurar_cpf_na_nota === true,
        exibir_avaliacao_experiencia_compra: data.exibir_avaliacao_experiencia_compra === true,
        visivel_no_app_cliente: data.visivel_no_app_cliente === true,
        preco_app_taxa_ativa: data.preco_app_taxa_ativa === true,
      };

      for (const field of OPTIONAL_TEXT_FIELDS) {
        if (payload[field] === "") {
          payload[field] = null;
        }
      }

      if (isEditing) {
        return storeService.update(id, payload);
      }

      return storeService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["store", id] });
      }
      navigate("/stores");
    },
    onError: (err: unknown) => {
      const responseData = isAxiosError<StoreApiError>(err) ? err.response?.data : undefined;
      const responseError = responseData?.error;
      const msg = (
        typeof responseError === "string"
          ? responseError
          : responseError?.message
      ) || responseData?.message || "Erro ao salvar loja.";
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

              <label
                htmlFor="visivel_no_app_cliente"
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4 md:col-span-2"
              >
                <span>
                  <span className="block text-sm font-semibold">Exibir na página principal do cliente</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Quando desativado, a loja fica fora da página principal e aparece somente em /mercado/teste.
                  </span>
                </span>
                <input
                  id="visivel_no_app_cliente"
                  type="checkbox"
                  {...register("visivel_no_app_cliente")}
                  className="h-5 w-5 shrink-0 accent-slate-900"
                />
            </label>

            <label
              htmlFor="preco_app_taxa_ativa"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4 md:col-span-2"
            >
              <span>
                <span className="block text-sm font-semibold">Aplicar taxa de 2% no preço do app</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  O preço do cliente será o valor da loja multiplicado por 1,02 e arredondado para cima no próximo múltiplo de R$ 0,50.
                </span>
              </span>
              <input
                id="preco_app_taxa_ativa"
                type="checkbox"
                {...register("preco_app_taxa_ativa")}
                className="h-5 w-5 shrink-0 accent-slate-900"
              />
            </label>

          </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Tipo de estabelecimento e cardápio
            </CardTitle>
            <CardDescription>
              Defina como a loja será apresentada e se poderá vender itens com tamanhos, sabores e adicionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tipo_estabelecimento">Tipo de estabelecimento</Label>
              <select
                id="tipo_estabelecimento"
                {...register("tipo_estabelecimento")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="mercado">Mercado</option>
                <option value="lanchonete">Lanchonete</option>
                <option value="restaurante">Restaurante</option>
                <option value="hibrido">Híbrido</option>
                <option value="outro">Outro</option>
              </select>
              {errors.tipo_estabelecimento && (
                <span className="text-xs text-red-500">{errors.tipo_estabelecimento.message}</span>
              )}
              <p className="text-xs text-muted-foreground">
                O tipo altera textos e padrões da experiência, mas não restringe produtos simples.
              </p>
            </div>

            <label
              htmlFor="cardapio_configuravel_ativo"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4"
            >
              <span>
                <span className="block text-sm font-semibold">Habilitar cardápio configurável</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Libera no admin do tenant o cadastro de tamanhos, sabores, adicionais e regras por variação.
                </span>
              </span>
              <input
                id="cardapio_configuravel_ativo"
                type="checkbox"
                {...register("cardapio_configuravel_ativo")}
                className="h-5 w-5 shrink-0 accent-slate-900"
              />
            </label>

            <label
              htmlFor="permitir_configurar_cpf_na_nota"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4"
            >
              <span>
                <span className="block text-sm font-semibold">Permitir configuração de CPF na nota</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Exibe no admin do tenant a opção para liberar CPF na nota no checkout dos clientes.
                </span>
              </span>
              <input
                id="permitir_configurar_cpf_na_nota"
                type="checkbox"
                {...register("permitir_configurar_cpf_na_nota")}
                className="h-5 w-5 shrink-0 accent-slate-900"
              />
            </label>

            <label
              htmlFor="exibir_avaliacao_experiencia_compra"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4"
            >
              <span>
                <span className="block text-sm font-semibold">Mostrar avaliação após o pedido</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Exibe para o cliente o modal com 3 emojis animados depois da compra.
                </span>
              </span>
              <input
                id="exibir_avaliacao_experiencia_compra"
                type="checkbox"
                {...register("exibir_avaliacao_experiencia_compra")}
                className="h-5 w-5 shrink-0 accent-slate-900"
              />
            </label>

            <div className="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900">
              Configuração atual: <strong className="capitalize">{establishmentType || "mercado"}</strong>
              {" · "}
              Cardápio configurável <strong>{configurableMenuEnabled ? "habilitado" : "desabilitado"}</strong>
              {" · "}
              CPF na nota <strong>{cpfInvoiceConfigurationEnabled ? "configurável" : "bloqueado"}</strong>
              {" · "}
              Avaliação <strong>{orderExperienceFeedbackEnabled ? "visível" : "oculta"}</strong>
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco_rua">Endereco da loja</Label>
                <Input id="endereco_rua" placeholder="Rua, avenida ou logradouro" {...register("endereco_rua")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_numero">Numero</Label>
                <Input id="endereco_numero" placeholder="123" {...register("endereco_numero")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_complemento">Complemento</Label>
                <Input id="endereco_complemento" placeholder="Sala, loja, ponto de referencia" {...register("endereco_complemento")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_bairro">Bairro</Label>
                <Input id="endereco_bairro" placeholder="Centro" {...register("endereco_bairro")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_cidade">Cidade</Label>
                <Input id="endereco_cidade" placeholder="Recife" {...register("endereco_cidade")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_estado">Estado</Label>
                <Input id="endereco_estado" placeholder="PE" maxLength={2} {...register("endereco_estado")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_cep">CEP</Label>
                <Input id="endereco_cep" placeholder="00000-000" {...register("endereco_cep")} className={errors.endereco_cep ? "border-red-500" : ""} />
                {errors.endereco_cep && <span className="text-xs text-red-500">{errors.endereco_cep.message}</span>}
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
