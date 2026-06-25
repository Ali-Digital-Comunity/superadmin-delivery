import { api } from "../../lib/api";

export interface PagarmeConfigStatus {
  secret_key_configured: boolean;
  public_key_configured: boolean;
  webhook_secret_configured: boolean;
  platform_recipient_configured: boolean;
  default_platform_fee_percent: number;
  environment: "sandbox" | "production";
}

export interface PagarmeRecipient {
  id?: string;
  loja_id?: string;
  recipient_id?: string | null;
  recipient_code?: string | null;
  status?: string | null;
  kyc_status?: string | null;
  document_last4?: string | null;
  bank_account_last4?: string | null;
  transfer_enabled?: boolean | null;
  transfer_interval?: string | null;
  transfer_day?: number | null;
}

function unwrap<T>(responseData: any): T {
  return responseData?.data ?? responseData;
}

export const pagarmeService = {
  getConfigStatus: async () => {
    const response = await api.get("/payment-gateways/admin/pagarme/config/status");
    return unwrap<PagarmeConfigStatus>(response.data);
  },

  getRecipient: async (lojaId: string) => {
    const response = await api.get(`/payment-gateways/admin/lojas/${lojaId}/pagarme/recipient`);
    return unwrap<PagarmeRecipient | null>(response.data);
  },

  createRecipient: async (lojaId: string, payload: any) => {
    const response = await api.post(`/payment-gateways/admin/lojas/${lojaId}/pagarme/recipient`, payload);
    return unwrap<PagarmeRecipient>(response.data);
  },

  updateRecipient: async (lojaId: string, payload: any) => {
    const response = await api.put(`/payment-gateways/admin/lojas/${lojaId}/pagarme/recipient`, payload);
    return unwrap<PagarmeRecipient>(response.data);
  },

  syncRecipient: async (lojaId: string) => {
    const response = await api.post(`/payment-gateways/admin/lojas/${lojaId}/pagarme/recipient/sync`);
    return unwrap<PagarmeRecipient>(response.data);
  },
};
