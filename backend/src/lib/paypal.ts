import axios from 'axios';

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getPayPalAccessToken(): Promise<string> {
  if (!CLIENT_ID || CLIENT_ID.includes('mock')) {
    return 'MOCK_SANDBOX_ACCESS_TOKEN';
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  try {
    const response = await axios.post(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    cachedToken = response.data.access_token;
    tokenExpiresAt = now + response.data.expires_in * 1000;
    return cachedToken;
  } catch (error: any) {
    console.error('PayPal OAuth Error:', error.response?.data || error.message);
    throw new Error('PayPal Authentication failed. Check CLIENT_ID and CLIENT_SECRET in Vercel.');
  }
}

export async function createAuthorizationOrder(contractId: string, amount: number, currency: string = 'USD') {
  const token = await getPayPalAccessToken();

  if (token === 'MOCK_SANDBOX_ACCESS_TOKEN') {
    return {
      orderId: `MOCK_ORDER_${Date.now()}`,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_ORDER_${Date.now()}`,
    };
  }

  const payload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: contractId,
        description: `AgentSLA Micro-Escrow [${contractId}]`,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      },
    ],
  };

  const response = await axios.post(`${PAYPAL_API_BASE}/v2/checkout/orders`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  return {
    orderId: response.data.id,
    approvalUrl: response.data.links?.find((l: any) => l.rel === 'approve')?.href || '',
  };
}

export async function authorizePayment(orderId: string) {
  const token = await getPayPalAccessToken();

  if (token === 'MOCK_SANDBOX_ACCESS_TOKEN') {
    return { authorizationId: `MOCK_AUTH_${Date.now()}`, status: 'CREATED' };
  }

  const response = await axios.post(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/authorize`,
    {},
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  const authDetails = response.data.purchase_units?.[0]?.payments?.authorizations?.[0];
  return {
    authorizationId: authDetails?.id || `AUTH_${Date.now()}`,
    status: authDetails?.status || 'CREATED',
  };
}

export async function captureAuthorization(authorizationId: string, amount: number, currency: string = 'USD') {
  const token = await getPayPalAccessToken();

  if (token === 'MOCK_SANDBOX_ACCESS_TOKEN') {
    return { captureId: `MOCK_CAPTURE_${Date.now()}`, status: 'COMPLETED' };
  }

  const response = await axios.post(
    `${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/capture`,
    { amount: { value: amount.toFixed(2), currency_code: currency }, final_capture: true },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return { captureId: response.data.id, status: response.data.status };
}

export async function triggerWorkerPayout(recipientEmail: string, amount: number, contractId: string, currency: string = 'USD') {
  const token = await getPayPalAccessToken();

  if (token === 'MOCK_SANDBOX_ACCESS_TOKEN') {
    return { payoutBatchId: `MOCK_PAYOUT_BATCH_${Date.now()}`, status: 'SUCCESS' };
  }

  const payload = {
    sender_batch_header: {
      sender_batch_id: `AgentSLA_${contractId}_${Date.now()}`,
      email_subject: 'Autonomous milestone payment from AgentSLA',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: { value: amount.toFixed(2), currency },
        receiver: recipientEmail,
        sender_item_id: `Item_${contractId}`,
      },
    ],
  };

  const response = await axios.post(`${PAYPAL_API_BASE}/v1/payments/payouts`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  return {
    payoutBatchId: response.data.batch_header.payout_batch_id,
    status: response.data.batch_header.batch_status,
  };
}
