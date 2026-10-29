import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { runFullAgentSimulation, SimulationStepLog } from '../lib/agentSimulator.js';

export async function demoRoutes(app: FastifyInstance) {
  app.post('/api/demo/run-full-simulation', async (_req: FastifyRequest, reply: FastifyReply) => {
    const logs: SimulationStepLog[] = [];

    const result = await runFullAgentSimulation((log) => {
      logs.push(log);
    });

    return reply.send({
      success: true,
      contractId: result.contractId,
      logs: result.logs,
    });
  });
}
