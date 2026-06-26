import { api } from "../../lib/api";

export interface CardPaymentData {
  pedido_id: string;
  card_token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: number | null;
  payer_email: string;
  doc_type: string;
  doc_number: string;
}

export interface MercadoPagoTestConfig {
  environment: "sandbox";
  public_key: string | null;
  default_payer_email: string;
  configured: {
    access_token: boolean;
    public_key: boolean;
  };
  credentials: {
    access_token: string | null;
    public_key: string | null;
  };
  warnings: string[];
  docs: {
    test_payment_flow: string;
    test_cards: string;
  };
}

export interface MercadoPagoTestOrder {
  id: string;
  external_reference: string;
  amount: number;
  currency_id: string;
  description: string;
  payer_email: string;
  doc_type: "CPF" | "CNPJ";
  doc_number: string;
  status: string;
  created_at: string;
  expires_at: string;
  payments: Array<{
    id: string | null;
    status: string | null;
    status_detail: string | null;
    idempotency_key: string;
    created_at: string;
  }>;
}

export interface MercadoPagoTestPayment {
  id: string | null;
  status: string | null;
  status_detail: string | null;
  live_mode: boolean | null;
  transaction_amount: number | null;
  currency_id: string;
  payment_method_id: string | null;
  payment_type_id: string | null;
  external_reference: string | null;
  date_created: string | null;
  date_approved: string | null;
  date_last_updated: string | null;
  three_ds_info?: {
    external_resource_url: string;
    creq: string;
  } | null;
}

export interface CreateTestOrderData {
  amount: number;
  description: string;
  payer_email?: string;
  doc_type?: "CPF" | "CNPJ";
  doc_number?: string;
}

export interface TestCardPaymentData {
  card_token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: number | string | null;
  payer_email: string;
  doc_type: "CPF" | "CNPJ";
  doc_number: string;
}

export const mercadopagoService = {
  processCardPayment: async (data: CardPaymentData) => {
    const response = await api.post("/mercadopago/payment/card", data);
    return response.data;
  },
  
  getPaymentMethods: async () => {
    const response = await api.get("/mercadopago/payment-methods");
    return response.data;
  },

  getTestConfig: async (): Promise<MercadoPagoTestConfig> => {
    const response = await api.get("/mercadopago-test/config");
    return response.data.data;
  },

  createTestOrder: async (data: CreateTestOrderData): Promise<MercadoPagoTestOrder> => {
    const response = await api.post("/mercadopago-test/orders", data);
    return response.data.data;
  },

  processTestCardPayment: async (
    orderId: string,
    data: TestCardPaymentData
  ): Promise<{ order: MercadoPagoTestOrder; payment: MercadoPagoTestPayment; raw_status_detail: string | null }> => {
    const response = await api.post(`/mercadopago-test/orders/${orderId}/payments/card`, data);
    return response.data.data;
  },

  getTestPaymentStatus: async (paymentId: string): Promise<MercadoPagoTestPayment> => {
    const response = await api.get(`/mercadopago-test/payments/${paymentId}`);
    return response.data.data;
  }
};
