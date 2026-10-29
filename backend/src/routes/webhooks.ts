import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/api/webhooks/paypal', async (req: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const body = req.body;
    const eventType = body?.event_type;

    console.log(`[PayPal Webhook Received] ${eventType}`);

    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = body.resource?.id;
      if (orderId) {
        await prisma.auditLog.create({
          data: {
            contractId: body.resource?.purchase_units?.[0]?.reference_id || 'UNKNOWN',
            actor: 'PAYPAL_WEBHOOK',
            action: 'CHECKOUT_ORDER_APPROVED',
            details: JSON.stringify(body.resource),
          },
        });
      }
    } else if (eventType === 'PAYMENT.AUTHORIZATION.CREATED') {
      const authId = body.resource?.id;
      console.log(`Authorization confirmed on PayPal rails: ${authId}`);
    }

    return reply.status(200).send({ received: true });
  });
}
