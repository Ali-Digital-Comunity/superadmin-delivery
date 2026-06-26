import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Lock, RefreshCw, Settings, X } from "lucide-react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { mercadopagoService } from "../../features/financial/mercadopagoService";
import type {
  MercadoPagoTestConfig,
  MercadoPagoTestOrder,
  MercadoPagoTestPayment,
} from "../../features/financial/mercadopagoService";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

type PaymentResult = {
  order: MercadoPagoTestOrder;
  payment: MercadoPagoTestPayment;
  raw_status_detail: string | null;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || "Falha na requisicao.";
  }

  return error instanceof Error ? error.message : "Falha na requisicao.";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const hasThreeDsChallenge = (payment?: MercadoPagoTestPayment | null) =>
  payment?.status === "pending" &&
  payment?.status_detail === "pending_challenge" &&
  Boolean(payment?.three_ds_info?.external_resource_url && payment?.three_ds_info?.creq);

function ThreeDsChallengeModal({
  payment,
  onClose,
  onRefreshStatus,
  checkingStatus,
}: {
  payment: MercadoPagoTestPayment;
  onClose: () => void;
  onRefreshStatus: () => void;
  checkingStatus: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    const info = payment.three_ds_info;
    const frame = frameRef.current;
    if (!frame?.contentWindow || !info?.external_resource_url || !info.creq) return;

    submittedRef.current = true;
    const frameDocument = frame.contentWindow.document;
    frameDocument.open();
    frameDocument.write("<!doctype html><html><body></body></html>");
    frameDocument.close();

    const form = frameDocument.createElement("form");
    form.method = "post";
    form.action = info.external_resource_url;
    form.target = frame.name;

    const creqInput = frameDocument.createElement("input");
    creqInput.type = "hidden";
    creqInput.name = "creq";
    creqInput.value = info.creq;
    form.appendChild(creqInput);
    frameDocument.body.appendChild(form);
    form.submit();
  }, [payment]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Lock className="h-5 w-5 text-emerald-600" />
              Desafio 3DS
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Complete a validacao no iframe. Depois consulte o status para confirmar o resultado final.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar desafio 3DS">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <iframe
          ref={frameRef}
          id="mp-sandbox-three-ds-frame"
          name="mp-sandbox-three-ds-frame"
          title="Desafio 3DS Mercado Pago"
          className="w-full rounded-lg border border-slate-200 bg-white"
          style={{ height: "min(600px, calc(100vh - 240px))", minHeight: 440 }}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRefreshStatus} disabled={!payment.id || checkingStatus}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checkingStatus ? "animate-spin" : ""}`} />
            {checkingStatus ? "Consultando..." : "Consultar status"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export const MercadoPagoTest = () => {
  const [config, setConfig] = useState<MercadoPagoTestConfig | null>(null);
  const [order, setOrder] = useState<MercadoPagoTestOrder | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [statusLookup, setStatusLookup] = useState<MercadoPagoTestPayment | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDsModalOpen, setThreeDsModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    amount: "10.00",
    description: "Pedido sandbox Mercado Pago",
    payer_email: "",
    doc_type: "CPF" as "CPF" | "CNPJ",
    doc_number: "",
  });

  const isConfigured = Boolean(config?.configured.access_token && config?.configured.public_key && config.public_key);

  const brickInitialization = useMemo(() => ({
    amount: order?.amount || 0,
  }), [order?.amount]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setError(null);

    try {
      const response = await mercadopagoService.getTestConfig();
      setConfig(response);
      setOrderForm((current) => ({
        ...current,
        payer_email: current.payer_email || response.default_payer_email || "",
      }));

      if (response.public_key) {
        initMercadoPago(response.public_key, { locale: "pt-BR" });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const createOrder = async () => {
    setCreatingOrder(true);
    setError(null);
    setPaymentResult(null);
    setStatusLookup(null);

    try {
      const createdOrder = await mercadopagoService.createTestOrder({
        amount: Number(orderForm.amount),
        description: orderForm.description,
        payer_email: orderForm.payer_email || undefined,
        doc_type: orderForm.doc_type,
        doc_number: orderForm.doc_number || undefined,
      });
      setOrder(createdOrder);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCreatingOrder(false);
    }
  };

  const onSubmit = async (param: any) => {
    if (!order) {
      setError("Crie um pedido de teste antes de pagar.");
      return;
    }

    const formData = param?.formData || param;
    const payer = formData?.payer || {};
    const identification = payer?.identification || {};
    const payerEmail = payer?.email || order.payer_email || config?.default_payer_email;
    const docType = identification.type || order.doc_type || "CPF";
    const docNumber = identification.number || order.doc_number;

    if (!formData?.token || !formData?.payment_method_id || !payerEmail || !docNumber) {
      setError("O Brick nao retornou todos os dados necessarios do cartao e do pagador.");
      return;
    }

    setError(null);
    setPaymentResult(null);
    setStatusLookup(null);

    try {
      const result = await mercadopagoService.processTestCardPayment(order.id, {
        card_token: formData.token,
        payment_method_id: formData.payment_method_id,
        installments: Number(formData.installments || 1),
        issuer_id: formData.issuer_id || null,
        payer_email: payerEmail,
        doc_type: docType,
        doc_number: docNumber,
      });
      setOrder(result.order);
      setPaymentResult(result);
      if (hasThreeDsChallenge(result.payment)) {
        setThreeDsModalOpen(true);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const refreshPaymentStatus = async () => {
    const paymentId = paymentResult?.payment.id;
    if (!paymentId) return;

    setCheckingStatus(true);
    setError(null);

    try {
      const payment = await mercadopagoService.getTestPaymentStatus(paymentId);
      setStatusLookup(payment);
      if (hasThreeDsChallenge(payment)) {
        setThreeDsModalOpen(true);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Mercado Pago Sandbox
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ambiente isolado para validar pedidos e pagamentos de teste por cartao.
          </p>
        </div>
        <Button variant="outline" onClick={loadConfig} disabled={loadingConfig}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Credenciais de teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Access token</span>
                <span className={config?.configured.access_token ? "text-emerald-700" : "text-red-700"}>
                  {config?.credentials.access_token || "ausente"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Public key</span>
                <span className={config?.configured.public_key ? "text-emerald-700" : "text-red-700"}>
                  {config?.credentials.public_key || "ausente"}
                </span>
              </div>
              {config?.warnings.map((warning) => (
                <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  {warning}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Pedido sandbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={orderForm.amount}
                  onChange={(event) => setOrderForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descricao</Label>
                <Input
                  id="description"
                  value={orderForm.description}
                  onChange={(event) => setOrderForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payer-email">E-mail do pagador</Label>
                <Input
                  id="payer-email"
                  type="email"
                  value={orderForm.payer_email}
                  onChange={(event) => setOrderForm((current) => ({ ...current, payer_email: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-[96px_1fr] gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="doc-type">Doc.</Label>
                  <select
                    id="doc-type"
                    value={orderForm.doc_type}
                    onChange={(event) => setOrderForm((current) => ({ ...current, doc_type: event.target.value as "CPF" | "CNPJ" }))}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doc-number">Documento</Label>
                  <Input
                    id="doc-number"
                    value={orderForm.doc_number}
                    onChange={(event) => setOrderForm((current) => ({ ...current, doc_number: event.target.value }))}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={createOrder} disabled={!isConfigured || creatingOrder}>
                <CreditCard className="mr-2 h-4 w-4" />
                {creatingOrder ? "Criando..." : "Criar pedido de teste"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {order && (
            <Card className="rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Pedido ativo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">ID</span>
                  <p className="break-all font-mono text-xs text-slate-900">{order.id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Referencia MP</span>
                  <p className="break-all font-mono text-xs text-slate-900">{order.external_reference}</p>
                </div>
                <div>
                  <span className="text-slate-500">Valor</span>
                  <p className="font-medium">{formatCurrency(order.amount)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status</span>
                  <p className="font-medium">{order.status}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Card Payment Brick
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isConfigured && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Configure MP_TEST_ACCESS_TOKEN e MP_TEST_PUBLIC_KEY no backend para habilitar o Brick.
                </div>
              )}

              {isConfigured && !order && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Crie um pedido sandbox para abrir o formulario de pagamento.
                </div>
              )}

              {isConfigured && order && (
                <CardPayment
                  key={`${config?.public_key}-${order.id}`}
                  initialization={brickInitialization}
                  onSubmit={onSubmit}
                  onError={(brickError) => setError(getErrorMessage(brickError))}
                  onReady={() => setError(null)}
                />
              )}
            </CardContent>
          </Card>

          {paymentResult && (
            <Card className="rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Resultado Mercado Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-slate-500">Pagamento</span>
                    <p className="break-all font-mono text-xs">{paymentResult.payment.id || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status</span>
                    <p className="font-medium">{paymentResult.payment.status || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Detalhe</span>
                    <p className="font-medium">{paymentResult.payment.status_detail || "-"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasThreeDsChallenge(paymentResult.payment) && (
                    <Button
                      onClick={() => setThreeDsModalOpen(true)}
                      disabled={!paymentResult.payment.three_ds_info}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Abrir desafio 3DS
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={refreshPaymentStatus}
                    disabled={!paymentResult.payment.id || checkingStatus}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {checkingStatus ? "Consultando..." : "Consultar status"}
                  </Button>
                </div>
                {(statusLookup || paymentResult.payment) && (
                  <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(statusLookup || paymentResult.payment, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {threeDsModalOpen && paymentResult?.payment && hasThreeDsChallenge(paymentResult.payment) && (
        <ThreeDsChallengeModal
          payment={paymentResult.payment}
          checkingStatus={checkingStatus}
          onRefreshStatus={refreshPaymentStatus}
          onClose={() => setThreeDsModalOpen(false)}
        />
      )}
    </div>
  );
};
