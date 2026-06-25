import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Save, ShieldCheck, Store, XCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { storeService } from "../../features/stores/storeService";
import { pagarmeService } from "../../features/financial/pagarmeService";

const emptyForm = {
  type: "individual",
  name: "",
  company_name: "",
  trading_name: "",
  email: "",
  document: "",
  site_url: "",
  phone_ddd: "",
  phone_number: "",
  mother_name: "",
  birthdate: "",
  monthly_income: "",
  professional_occupation: "",
  annual_revenue: "",
  corporation_type: "LTDA",
  founding_date: "",
  legal_name: "",
  legal_email: "",
  legal_document: "",
  legal_mother_name: "",
  legal_birthdate: "",
  legal_monthly_income: "",
  legal_occupation: "",
  street: "",
  street_number: "",
  complementary: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
  reference_point: "",
  holder_name: "",
  holder_type: "individual",
  holder_document: "",
  bank: "",
  branch_number: "",
  branch_check_digit: "",
  account_number: "",
  account_check_digit: "",
  account_type: "checking",
  transfer_enabled: true,
  transfer_interval: "Daily",
  transfer_day: "0",
};

const digits = (value: string) => String(value || "").replace(/\D/g, "");

export default function PagarmeMarketplace() {
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [form, setForm] = useState<any>(emptyForm);

  const storesQuery = useQuery({
    queryKey: ["stores", "pagarme-select"],
    queryFn: () => storeService.getAll({ limit: 100 }),
  });

  const stores = useMemo(() => {
    const result: any = storesQuery.data;
    return Array.isArray(result) ? result : result?.data || [];
  }, [storesQuery.data]);

  const configQuery = useQuery({
    queryKey: ["pagarme-config-status"],
    queryFn: pagarmeService.getConfigStatus,
  });

  const recipientQuery = useQuery({
    queryKey: ["pagarme-recipient", selectedStoreId],
    queryFn: () => pagarmeService.getRecipient(selectedStoreId),
    enabled: Boolean(selectedStoreId),
  });

  const selectedRecipient = recipientQuery.data;
  const selectedStore = stores.find((store: any) => store.id === selectedStoreId);

  const setField = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));

  const buildPayload = () => {
    const address = {
      street: form.street,
      complementary: form.complementary || "Sem complemento",
      street_number: form.street_number,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      zip_code: digits(form.zip_code),
      reference_point: form.reference_point || "Nao informado",
    };
    const phone = { ddd: digits(form.phone_ddd), number: digits(form.phone_number), type: "mobile" };
    const register_information = form.type === "corporation"
      ? {
          company_name: form.company_name,
          trading_name: form.trading_name,
          email: form.email,
          document: digits(form.document),
          type: "corporation",
          site_url: form.site_url,
          annual_revenue: Number(form.annual_revenue || 0),
          corporation_type: form.corporation_type || "LTDA",
          founding_date: form.founding_date,
          main_address: address,
          phone_numbers: [phone],
          managing_partners: [{
            name: form.legal_name,
            email: form.legal_email,
            document: digits(form.legal_document),
            type: "individual",
            mother_name: form.legal_mother_name,
            birthdate: form.legal_birthdate,
            monthly_income: Number(form.legal_monthly_income || 0),
            professional_occupation: form.legal_occupation,
            self_declared_legal_representative: true,
            address,
            phone_numbers: [phone],
          }],
        }
      : {
          name: form.name,
          email: form.email,
          document: digits(form.document),
          type: "individual",
          site_url: form.site_url,
          mother_name: form.mother_name,
          birthdate: form.birthdate,
          monthly_income: Number(form.monthly_income || 0),
          professional_occupation: form.professional_occupation,
          address,
          phone_numbers: [phone],
        };

    return {
      register_information,
      default_bank_account: {
        holder_name: form.holder_name,
        holder_type: form.holder_type,
        holder_document: digits(form.holder_document),
        bank: digits(form.bank),
        branch_number: digits(form.branch_number),
        branch_check_digit: digits(form.branch_check_digit),
        account_number: digits(form.account_number),
        account_check_digit: digits(form.account_check_digit),
        type: form.account_type,
      },
      transfer_settings: {
        transfer_enabled: Boolean(form.transfer_enabled),
        transfer_interval: form.transfer_interval,
        transfer_day: Number(form.transfer_day || 0),
      },
      metadata: { origin: "superadmin" },
    };
  };

  const saveMutation = useMutation({
    mutationFn: () => selectedRecipient?.recipient_id
      ? pagarmeService.updateRecipient(selectedStoreId, buildPayload())
      : pagarmeService.createRecipient(selectedStoreId, buildPayload()),
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["pagarme-recipient", selectedStoreId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => pagarmeService.syncRecipient(selectedStoreId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagarme-recipient", selectedStoreId] }),
  });

  const config = configQuery.data;
  const configItems = [
    ["Secret key", config?.secret_key_configured],
    ["Public key", config?.public_key_configured],
    ["Webhook", config?.webhook_secret_configured],
    ["Recipient plataforma", config?.platform_recipient_configured],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stone/Pagar.me</h2>
        <p className="text-sm text-muted-foreground">Status global e recebedores das lojas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Configuração global</CardTitle>
          <CardDescription>Segredos reais ficam no backend ou Secret Manager.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {configItems.map(([label, ok]) => (
            <div key={String(label)} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                {ok ? "Configurado" : "Ausente"}
              </div>
            </div>
          ))}
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Ambiente</div>
            <div className="mt-1 text-sm font-semibold">{config?.environment === "sandbox" ? "Sandbox" : "Produção"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Recipient por loja</CardTitle>
          <CardDescription>Crie, atualize ou sincronize o recebedor Pagar.me da loja selecionada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Selecione uma loja</option>
              {stores.map((store: any) => <option key={store.id} value={store.id}>{store.nome}</option>)}
            </select>
            <Button variant="outline" disabled={!selectedStoreId || !selectedRecipient?.recipient_id || syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar
            </Button>
          </div>

          {selectedStoreId && (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Loja</p><p className="font-semibold">{selectedStore?.nome}</p></div>
              <div><p className="text-xs text-muted-foreground">Recipient</p><p className="font-mono text-xs">{selectedRecipient?.recipient_id || "não cadastrado"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={selectedRecipient?.status === "active" ? "success" : "secondary"}>{selectedRecipient?.status || "pendente"}</Badge></div>
              <div><p className="text-xs text-muted-foreground">Dados mascarados</p><p className="text-sm">Doc {selectedRecipient?.document_last4 || "-"} · Conta {selectedRecipient?.bank_account_last4 || "-"}</p></div>
            </div>
          )}

          {selectedStoreId && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <select value={form.type} onChange={(event) => setField("type", event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="individual">Pessoa física</option>
                  <option value="corporation">Pessoa jurídica</option>
                </select>
                <Input value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="E-mail" />
                <Input value={form.document} onChange={(event) => setField("document", event.target.value)} placeholder="CPF/CNPJ" />
                <Input value={form.site_url} onChange={(event) => setField("site_url", event.target.value)} placeholder="Site" />
              </div>

              {form.type === "corporation" ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <Input value={form.company_name} onChange={(event) => setField("company_name", event.target.value)} placeholder="Nome fantasia" />
                  <Input value={form.trading_name} onChange={(event) => setField("trading_name", event.target.value)} placeholder="Razão social" />
                  <Input value={form.annual_revenue} onChange={(event) => setField("annual_revenue", event.target.value)} placeholder="Receita anual" />
                  <Input type="date" value={form.founding_date} onChange={(event) => setField("founding_date", event.target.value)} />
                  <Input value={form.legal_name} onChange={(event) => setField("legal_name", event.target.value)} placeholder="Representante" />
                  <Input value={form.legal_email} onChange={(event) => setField("legal_email", event.target.value)} placeholder="E-mail representante" />
                  <Input value={form.legal_document} onChange={(event) => setField("legal_document", event.target.value)} placeholder="CPF representante" />
                  <Input value={form.legal_mother_name} onChange={(event) => setField("legal_mother_name", event.target.value)} placeholder="Mãe representante" />
                  <Input type="date" value={form.legal_birthdate} onChange={(event) => setField("legal_birthdate", event.target.value)} />
                  <Input value={form.legal_monthly_income} onChange={(event) => setField("legal_monthly_income", event.target.value)} placeholder="Renda representante" />
                  <Input value={form.legal_occupation} onChange={(event) => setField("legal_occupation", event.target.value)} placeholder="Ocupação representante" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-4">
                  <Input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Nome completo" />
                  <Input value={form.mother_name} onChange={(event) => setField("mother_name", event.target.value)} placeholder="Nome da mãe" />
                  <Input type="date" value={form.birthdate} onChange={(event) => setField("birthdate", event.target.value)} />
                  <Input value={form.monthly_income} onChange={(event) => setField("monthly_income", event.target.value)} placeholder="Renda mensal" />
                  <Input value={form.professional_occupation} onChange={(event) => setField("professional_occupation", event.target.value)} placeholder="Ocupação" />
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-4">
                <Input value={form.phone_ddd} onChange={(event) => setField("phone_ddd", event.target.value)} placeholder="DDD" />
                <Input value={form.phone_number} onChange={(event) => setField("phone_number", event.target.value)} placeholder="Telefone" />
                <Input value={form.street} onChange={(event) => setField("street", event.target.value)} placeholder="Rua" />
                <Input value={form.street_number} onChange={(event) => setField("street_number", event.target.value)} placeholder="Número" />
                <Input value={form.complementary} onChange={(event) => setField("complementary", event.target.value)} placeholder="Complemento" />
                <Input value={form.neighborhood} onChange={(event) => setField("neighborhood", event.target.value)} placeholder="Bairro" />
                <Input value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="Cidade" />
                <Input value={form.state} onChange={(event) => setField("state", event.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
                <Input value={form.zip_code} onChange={(event) => setField("zip_code", event.target.value)} placeholder="CEP" />
                <Input value={form.reference_point} onChange={(event) => setField("reference_point", event.target.value)} placeholder="Ponto de referência" className="md:col-span-3" />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Input value={form.holder_name} onChange={(event) => setField("holder_name", event.target.value)} placeholder="Titular" />
                <Input value={form.holder_document} onChange={(event) => setField("holder_document", event.target.value)} placeholder="CPF/CNPJ titular" />
                <Input value={form.bank} onChange={(event) => setField("bank", event.target.value)} placeholder="Banco" />
                <Input value={form.branch_number} onChange={(event) => setField("branch_number", event.target.value)} placeholder="Agência" />
                <Input value={form.branch_check_digit} onChange={(event) => setField("branch_check_digit", event.target.value)} placeholder="Dígito agência" />
                <Input value={form.account_number} onChange={(event) => setField("account_number", event.target.value)} placeholder="Conta" />
                <Input value={form.account_check_digit} onChange={(event) => setField("account_check_digit", event.target.value)} placeholder="Dígito conta" />
                <select value={form.account_type} onChange={(event) => setField("account_type", event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="checking">Corrente</option>
                  <option value="savings">Poupança</option>
                </select>
              </div>

              <div className="flex justify-end">
                <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  <Save className="mr-2 h-4 w-4" /> Salvar recipient
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
