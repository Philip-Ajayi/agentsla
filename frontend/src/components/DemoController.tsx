'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Play, PlusCircle, CheckCircle2, Shield, RefreshCw } from 'lucide-react';
import { LogEntry } from './AgentActivityStream';

interface DemoControllerProps {
  backendUrl: string;
  onSimulationComplete: (logs: LogEntry[]) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
}

export default function DemoController({
  backendUrl,
  onSimulationComplete,
  onOpenCreateModal,
  onRefresh,
}: DemoControllerProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const response = await axios.post(`${backendUrl}/api/demo/run-full-simulation`);
      if (response.data?.logs) {
        onSimulationComplete(response.data.logs);
      }
      onRefresh();
    } catch (err: any) {
      console.error('Simulation Failed:', err);
      alert('Error triggering simulation. Verify backend is running on ' + backendUrl);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-[#111827]/80 p-4 backdrop-blur shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            AgentSLA Protocol Engine
          </h1>
          <p className="text-xs text-gray-400">
            PayPal Authorize/Capture/Payouts × Google Gemini 2.5 Flash Autonomous Arbiter
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onRefresh}
          className="flex items-center space-x-1.5 rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white transition"
          title="Refresh Data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1.5 rounded-xl border border-blue-600/40 bg-blue-950/40 px-3.5 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-900/60 hover:text-white transition"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New SLA Contract</span>
        </button>

        {/* 1-Click Judge Full End-to-End Test Engine */}
        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 transition transform active:scale-95"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Simulating Multi-Agent Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span>Run Live E2E Agent Loop (Judge Demo)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
