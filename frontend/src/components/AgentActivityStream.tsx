'use client';

import React from 'react';
import { Terminal, Bot, CheckCircle, AlertTriangle, ArrowRightCircle, DollarSign, Cpu } from 'lucide-react';

export interface LogEntry {
  timestamp: string;
  actor: string;
  action: string;
  message: string;
  payload?: any;
}

interface AgentActivityStreamProps {
  logs: LogEntry[];
}

export default function AgentActivityStream({ logs }: AgentActivityStreamProps) {
  const getActorBadge = (actor: string) => {
    switch (actor) {
      case 'AGENT_ALPHA':
        return <span className="rounded bg-indigo-900/60 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-700">Buyer Agent α</span>;
      case 'AGENT_BETA':
        return <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-700">Worker Agent β</span>;
      case 'DUAL_HARNESS':
        return <span className="rounded bg-purple-900/60 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-700">Gemini Arbiter</span>;
      case 'PAYPAL_GATEWAY':
        return <span className="rounded bg-blue-900/60 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-700">PayPal Rails</span>;
      case 'HUMAN_SUPERVISOR':
        return <span className="rounded bg-amber-900/60 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-700">Human Supervisor</span>;
      default:
        return <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-300 border border-gray-700">{actor}</span>;
    }
  };

  const getActionIcon = (actor: string, action: string) => {
    if (action.includes('PASSED') || action.includes('COMPLETED') || action.includes('SETTLED')) {
      return <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />;
    }
    if (action.includes('FAILED') || action.includes('REJECTED')) {
      return <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />;
    }
    if (actor === 'PAYPAL_GATEWAY') {
      return <DollarSign className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />;
    }
    if (actor === 'DUAL_HARNESS') {
      return <Cpu className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />;
    }
    return <Bot className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-gray-800 bg-[#111827] overflow-hidden shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/70 px-4 py-3">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200">
            Real-Time Autonomous Agent Activity Stream
          </h2>
        </div>
        <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LISTENING</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Bot className="h-8 w-8 mb-2 opacity-40 animate-bounce" />
            <p>Ready to observe. Click &quot;Run End-to-End Simulation&quot; to inspect agent negotiation, failure, retry, and PayPal settlement.</p>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 rounded-lg border border-gray-800/80 bg-gray-950/60 p-2.5 hover:border-gray-700 transition"
            >
              {getActionIcon(log.actor, log.action)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {getActorBadge(log.actor)}
                  <span className="text-[11px] font-bold text-gray-300">{log.action}</span>
                </div>
                <p className="text-gray-300 leading-relaxed">{log.message}</p>
                {log.payload && (
                  <pre className="mt-1 max-h-32 overflow-x-auto rounded bg-black/60 p-2 text-[10px] text-blue-300 border border-gray-800">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
