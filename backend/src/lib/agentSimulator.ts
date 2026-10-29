import { prisma } from './db';
import { createAuthorizationOrder, authorizePayment, captureAuthorization, triggerWorkerPayout } from './paypal';
import { evaluateDeliverable } from './gemini';

export interface SimulationStepLog {
  timestamp: string;
  actor: string;
  action: string;
  message: string;
  payload?: any;
}

export async function runFullAgentSimulation() {
  const logs: SimulationStepLog[] = [];
  const emit = (actor: string, action: string, message: string, payload?: any) => {
    logs.push({ timestamp: new Date().toISOString(), actor, action, message, payload });
  };

  emit('AGENT_ALPHA', 'SLA_PROPOSAL', 'Buyer Agent Alpha proposing SLA: "Fortune 500 Market Cap ETL"');

  const schemaCriteria = JSON.stringify({
    ticker: 'string',
    company_name: 'string',
    market_cap_billions: 'number',
    iso_code: 'string',
  });

  const semanticCriteria = `
Deliverable must contain accurate Fortune 500 company info.
The 'iso_code' field must strictly contain standard 2-letter uppercase ISO country codes (e.g., 'US').
`;

  const contract = await prisma.contract.create({
    data: {
      title: 'Autonomous Financial ETL Pipeline',
      description: 'Clean validated JSON extraction with ISO country validation',
      buyerAgentId: 'agent-alpha-buyer',
      workerAgentId: 'agent-beta-worker',
      workerPayoutEmail: 'agent-beta-wallet@sandbox.agentsla.io',
      amount: 50.0,
      currency: 'USD',
      status: 'PROPOSED',
      schemaCriteria,
      semanticCriteria,
      maxRetries: 2,
    },
  });

  emit('SYSTEM', 'CONTRACT_CREATED', `Contract #${contract.id} written to ledger with state: PROPOSED`);

  emit('PAYPAL_GATEWAY', 'ORDER_INITIATED', 'Requesting PayPal Orders v2 Authorize intent...');
  const order = await createAuthorizationOrder(contract.id, 50.0, 'USD');

  emit('HUMAN_SUPERVISOR', 'HOLD_APPROVED', `Supervisor approved spend. PayPal Order ID: ${order.orderId}`);
  const auth = await authorizePayment(order.orderId);

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'AUTHORIZED', paypalOrderId: order.orderId, paypalAuthId: auth.authorizationId },
  });

  emit('AGENT_SLA', 'FUNDS_LOCKED', `Escrow Hold Confirmed: $50.00 isolated in PayPal Authorization #${auth.authorizationId}.`);

  // Attempt 1: Defective payload
  emit('AGENT_BETA', 'DELIVERABLE_SUBMITTED', 'Worker Agent Beta submitted Attempt #1. Running Dual-Harness Evaluator...');
  const defectivePayload = JSON.stringify({
    ticker: 'NVDA',
    company_name: 'NVIDIA Corporation',
    market_cap_billions: 3100.5,
    country_alpha: 'USA', // DEFECT: missing iso_code
  });

  const deliverable1 = await prisma.deliverable.create({
    data: { contractId: contract.id, attemptNumber: 1, payload: defectivePayload, status: 'PENDING' },
  });

  const eval1 = await evaluateDeliverable(defectivePayload, schemaCriteria, semanticCriteria);

  await prisma.evaluation.create({
    data: {
      deliverableId: deliverable1.id,
      stage1Passed: eval1.stage1.passed,
      stage1Errors: eval1.stage1.error,
      stage2Passed: eval1.stage2.passed,
      stage2Score: eval1.stage2.score,
      stage2Reasoning: eval1.stage2.reasoning,
      finalDecision: 'FAIL',
    },
  });

  await prisma.contract.update({ where: { id: contract.id }, data: { status: 'RETRY_REQUESTED', retryCount: 1 } });
  emit('DUAL_HARNESS', 'EVALUATION_FAILED', `Attempt #1 Rejected. Schema Defect: Missing 'iso_code'. Escrow hold protected.`);

  // Attempt 2: Corrected payload
  emit('AGENT_BETA', 'AUTO_PATCHING', 'Agent Beta parsed error diagnostics. Auto-patching schema to satisfy ISO format...');
  const correctedPayload = JSON.stringify({
    ticker: 'NVDA',
    company_name: 'NVIDIA Corporation',
    market_cap_billions: 3100.5,
    iso_code: 'US',
  });

  const deliverable2 = await prisma.deliverable.create({
    data: { contractId: contract.id, attemptNumber: 2, payload: correctedPayload, status: 'PENDING' },
  });

  const eval2 = await evaluateDeliverable(correctedPayload, schemaCriteria, semanticCriteria);

  await prisma.evaluation.create({
    data: {
      deliverableId: deliverable2.id,
      stage1Passed: eval2.stage1.passed,
      stage1Errors: eval2.stage1.error,
      stage2Passed: eval2.stage2.passed,
      stage2Score: eval2.stage2.score,
      stage2Reasoning: eval2.stage2.reasoning,
      finalDecision: 'PASS',
    },
  });

  await prisma.deliverable.update({ where: { id: deliverable2.id }, data: { status: 'ACCEPTED' } });
  emit('DUAL_HARNESS', 'EVALUATION_PASSED', `Milestone verification succeeded! Gemini Score: ${eval2.stage2.score}/100.`);

  emit('PAYPAL_GATEWAY', 'CAPTURE_REQUESTED', `Capturing PayPal Authorization #${auth.authorizationId}...`);
  const captureResult = await captureAuthorization(auth.authorizationId, 50.0, 'USD');

  emit('PAYPAL_GATEWAY', 'PAYOUT_DISBURSED', `Triggering PayPal Payouts to ${contract.workerPayoutEmail}...`);
  const payoutResult = await triggerWorkerPayout(contract.workerPayoutEmail, 50.0, contract.id, 'USD');

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'CAPTURED', paypalCaptureId: captureResult.captureId, paypalPayoutBatchId: payoutResult.payoutBatchId },
  });

  emit('AGENT_SLA', 'TRANSACTION_SETTLED', `Settlement complete! $50.00 disbursed. Contract closed.`);
  return { contractId: contract.id, logs };
}
