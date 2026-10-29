import { NextResponse } from 'next/server';
import { runFullAgentSimulation } from '@/lib/agentSimulator';

export async function POST() {
  try {
    const result = await runFullAgentSimulation();
    return NextResponse.json({ success: true, contractId: result.contractId, logs: result.logs });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
