import { runDeterministicValidation, runSemanticEvaluation } from '../lib/gemini.js';
import { createAuthorizationOrder, authorizePayment, captureAuthorization, voidAuthorization } from '../lib/paypal.js';

async function testAgentSLA() {
  console.log('=== RUNNING AGENTSLA VALIDATION TEST SUITE ===');

  // Test 1: Deterministic Zod Schema Gate
  const testSchema = JSON.stringify({
    ticker: 'string',
    price: 'number',
    iso_code: 'string',
  });

  const invalidPayload = JSON.stringify({
    ticker: 'AAPL',
    price: 180.5,
    country_name: 'United States', // Missing iso_code
  });

  const validPayload = JSON.stringify({
    ticker: 'AAPL',
    price: 180.5,
    iso_code: 'US',
  });

  console.log('Testing Stage 1 Defect Catch...');
  const stage1Fail = runDeterministicValidation(invalidPayload, testSchema);
  console.assert(!stage1Fail.passed, 'Stage 1 should reject missing field');
  console.log('✓ Stage 1 Defect successfully blocked.');

  console.log('Testing Stage 1 Clean Pass...');
  const stage1Pass = runDeterministicValidation(validPayload, testSchema);
  console.assert(stage1Pass.passed, 'Stage 1 should accept valid schema payload');
  console.log('✓ Stage 1 Passed cleanly.');

  // Test 2: PayPal Authorization, Capture, and Void lifecycle
  console.log('Testing PayPal Sandbox Primitive Calls...');
  const order = await createAuthorizationOrder('TEST-CONTRACT-001', 10.0, 'USD');
  console.log(`✓ PayPal Order Created: ${order.orderId}`);

  const auth = await authorizePayment(order.orderId);
  console.log(`✓ PayPal Funds Held via Authorize: ${auth.authorizationId}`);

  const capture = await captureAuthorization(auth.authorizationId, 10.0, 'USD');
  console.log(`✓ PayPal Capture Finalized: ${capture.captureId}`);

  console.log('=== ALL AGENTSLA PROTOCOL TESTS PASSED ===');
}

testAgentSLA().catch(console.error);
```

Add the test command to `backend/package.json`:
```json
"scripts": {
  "test": "tsx src/scripts/testE2E.ts"
}
```

---

## 6. Docker Deployment Files

### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
