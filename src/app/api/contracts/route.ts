import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: { deliverables: { include: { evaluations: true } }, auditLogs: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contracts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contract = await prisma.contract.create({
      data: {
        title: body.title,
        description: body.description,
        buyerAgentId: body.buyerAgentId || 'agent-alpha',
        workerAgentId: body.workerAgentId || 'agent-beta',
        workerPayoutEmail: body.workerPayoutEmail,
        amount: parseFloat(body.amount),
        schemaCriteria: body.schemaCriteria,
        semanticCriteria: body.semanticCriteria,
        status: 'PROPOSED',
      },
    });
    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
