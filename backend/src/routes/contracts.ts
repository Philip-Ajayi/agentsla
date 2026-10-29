import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';
import {
  createAuthorizationOrder,
  authorizePayment,
  captureAuthorization,
  voidAuthorization,
  triggerWorkerPayout,
} from '../lib/paypal.js';
import { evaluateDeliverable } from '../lib/gemini.js';

export async function contractRoutes(app: FastifyInstance) {
  // GET all contracts for AG Grid ledger
  app.get('/api/contracts', async (_req: FastifyRequest, reply: FastifyReply) => {
    const contracts = await prisma.contract.findMany({
      include: {
        deliverables: {
          include: { evaluations: true },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(contracts);
  });

  // GET single contract detail
  app.get('/api/contracts/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        deliverables: { include: { evaluations: true } },
        auditLogs: { orderBy: { timestamp: 'desc' } },
      },
    });
    if (!contract) return reply.status(404).send({ error: 'Contract not found' });
    return reply.send(contract);
  });

  // POST create new contract SLA
  app.post('/api/contracts', async (req: FastifyRequest<{
    Body: {
      title: string;
      description: string;
      buyerAgentId: string;
      workerAgentId: string;
      workerPayoutEmail: string;
      amount: number;
      schemaCriteria: string;
      semanticCriteria: string;
    };
  }>, reply: FastifyReply) => {
    const { title, description, buyerAgentId, workerAgentId, workerPayoutEmail, amount, schemaCriteria, semanticCriteria } = req.body;

    const contract = await prisma.contract.create({
      data: {
        title,
        description,
        buyerAgentId,
        workerAgentId,
        workerPayoutEmail,
        amount,
        schemaCriteria,
        semanticCriteria,
        status: 'PROPOSED',
      },
    });

    return reply.status(201).send(contract);
  });

  // POST initiate PayPal Order Authorize
  app.post('/api/contracts/:id/initiate-escrow', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return reply.status(404).send({ error: 'Contract not found' });

    const order = await createAuthorizationOrder(contract.id, contract.amount, contract.currency);

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        paypalOrderId: order.orderId,
        status: 'AUTHORIZATION_PENDING',
      },
    });

    return reply.send({
      orderId: order.orderId,
      approvalUrl: order.approvalUrl,
    });
  });

  // POST approve / lock authorization hold
  app.post('/api/contracts/:id/confirm-authorization', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || !contract.paypalOrderId) {
      return reply.status(400).send({ error: 'Contract lacks valid PayPal order for authorization' });
    }

    const auth = await authorizePayment(contract.paypalOrderId);

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        paypalAuthId: auth.authorizationId,
        status: 'AUTHORIZED',
      },
    });

    await prisma.auditLog.create({
      data: {
        contractId: contract.id,
        actor: 'PAYPAL_CLIENT',
        action: 'AUTHORIZATION_LOCKED',
        details: JSON.stringify({ authId: auth.authorizationId, status: auth.status }),
      },
    });

    return reply.send(updated);
  });

  // POST worker submit deliverable
  app.post('/api/contracts/:id/submit-deliverable', async (req: FastifyRequest<{
    Params: { id: string };
    Body: { payload: string };
  }>, reply: FastifyReply) => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) return reply.status(404).send({ error: 'Contract not found' });

    const attemptNumber = (await prisma.deliverable.count({ where: { contractId: contract.id } })) + 1;

    const deliverable = await prisma.deliverable.create({
      data: {
        contractId: contract.id,
        attemptNumber,
        payload: req.body.payload,
        status: 'PENDING',
      },
    });

    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'DELIVERED' },
    });

    return reply.status(201).send(deliverable);
  });

  // POST evaluate and settle
  app.post('/api/contracts/:id/evaluate-and-settle', async (req: FastifyRequest<{
    Params: { id: string };
    Body: { deliverableId: string };
  }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { deliverableId } = req.body;

    const contract = await prisma.contract.findUnique({ where: { id } });
    const deliverable = await prisma.deliverable.findUnique({ where: { id: deliverableId } });

    if (!contract || !deliverable) {
      return reply.status(404).send({ error: 'Contract or Deliverable not found' });
    }

    const evalResult = await evaluateDeliverable(
      deliverable.payload,
      contract.schemaCriteria,
      contract.semanticCriteria
    );

    const evaluation = await prisma.evaluation.create({
      data: {
        deliverableId: deliverable.id,
        stage1Passed: evalResult.stage1.passed,
        stage1Errors: evalResult.stage1.error,
        stage2Passed: evalResult.stage2.passed,
        stage2Score: evalResult.stage2.score,
        stage2Reasoning: evalResult.stage2.reasoning,
        finalDecision: evalResult.overallPassed ? 'PASS' : 'FAIL',
      },
    });

    if (evalResult.overallPassed) {
      // 1. Mark deliverable accepted
      await prisma.deliverable.update({
        where: { id: deliverable.id },
        data: { status: 'ACCEPTED' },
      });

      // 2. Capture PayPal Escrow Hold
      let captureId = 'MOCK_CAPTURE_ID';
      if (contract.paypalAuthId) {
        const capture = await captureAuthorization(contract.paypalAuthId, contract.amount, contract.currency);
        captureId = capture.captureId;
      }

      // 3. Payout to Worker
      let payoutBatchId = 'MOCK_PAYOUT_BATCH_ID';
      if (contract.workerPayoutEmail) {
        const payout = await triggerWorkerPayout(
          contract.workerPayoutEmail,
          contract.amount,
          contract.id,
          contract.currency
        );
        payoutBatchId = payout.payoutBatchId;
      }

      const updatedContract = await prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: 'CAPTURED',
          paypalCaptureId: captureId,
          paypalPayoutBatchId: payoutBatchId,
        },
      });

      return reply.send({ status: 'ACCEPTED_AND_SETTLED', evaluation, contract: updatedContract });
    } else {
      // Evaluation failed
      const newRetryCount = contract.retryCount + 1;
      const shouldVoid = newRetryCount >= contract.maxRetries;

      await prisma.deliverable.update({
        where: { id: deliverable.id },
        data: { status: 'REJECTED' },
      });

      if (shouldVoid) {
        if (contract.paypalAuthId) {
          await voidAuthorization(contract.paypalAuthId);
        }

        const updatedContract = await prisma.contract.update({
          where: { id: contract.id },
          data: { status: 'VOIDED', retryCount: newRetryCount },
        });

        return reply.send({
          status: 'REJECTED_AND_ESCROW_VOIDED',
          message: 'Max retries exhausted. Escrow hold returned to buyer.',
          evaluation,
          contract: updatedContract,
        });
      } else {
        const updatedContract = await prisma.contract.update({
          where: { id: contract.id },
          data: { status: 'RETRY_REQUESTED', retryCount: newRetryCount },
        });

        return reply.send({
          status: 'RETRY_REQUESTED',
          message: 'Deliverable failed SLA check. Error sent back to Worker Agent.',
          evaluation,
          contract: updatedContract,
        });
      }
    }
  });

  // POST manually void authorization
  app.post('/api/contracts/:id/void-hold', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || !contract.paypalAuthId) {
      return reply.status(400).send({ error: 'No active PayPal authorization found to void' });
    }

    await voidAuthorization(contract.paypalAuthId);

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'VOIDED' },
    });

    return reply.send(updated);
  });
}
