'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DemoController from '@/components/DemoController';
import LiveLedger, { ContractRow } from '@/components/LiveLedger';
import AgentActivityStream, { LogEntry } from '@/components/AgentActivityStream';
import ContractModal from '@/components/ContractModal';
import { DollarSign, Cpu, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Home() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalEscrowLocked: 0,
    totalDisbursed: 0,
    activeContracts: 0,
  });

  const fetchContracts = async () => {
    try {
      const res = await axios.get('/api/contracts');
      const data: ContractRow[] = res.data;
      setContracts(data);

      let locked = 0;
      let disbursed = 0;
      data.forEach((c) => {
        if (c.status === 'AUTHORIZED') locked += c.amount;
        if (c.status === 'CAPTURED') disbursed += c.amount;
      });

      setSystemStats({
        totalEscrowLocked: locked,
        totalDisbursed: disbursed,
        activeContracts: data.length,
      });
    } catch (err) {
      console.warn('Backend not yet reachable on', backendUrl);
    }
  };

  useEffect(() => {
    fetchContracts();
    const interval = setInterval(fetchContracts, 4000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const handleSimulationComplete = (newLogs: LogEntry[]) => {
    setLogs((prev) => [...newLogs, ...prev]);
    fetchContracts();
  };

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto flex flex-col">
      {/* Header & Interactive Controller */}
      <DemoController
        backendUrl={backendUrl}
        onSimulationComplete={handleSimulationComplete}
        onOpenCreateModal={() => setIsModalOpen(true)}
        onRefresh={fetchContracts}
      />

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PayPal Escrow Active</span>
            <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
              ${systemStats.totalEscrowLocked.toFixed(2)} USD
            </p>
          </div>
          <div className="rounded-lg bg-blue-900/30 p-2.5 border border-blue-800/40 text-blue-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settled & Disbursed</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              ${systemStats.totalDisbursed.toFixed(2)} USD
            </p>
          </div>
          <div className="rounded-lg bg-emerald-900/30 p-2.5 border border-emerald-800/40 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Autonomous Contracts</span>
            <p className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {systemStats.activeContracts}
            </p>
          </div>
          <div className="rounded-lg bg-purple-900/30 p-2.5 border border-purple-800/40 text-purple-400">
            <Cpu className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Interactive Grid & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[580px]">
        {/* Left Column: AG Grid Real-time Ledger */}
        <div className="lg:col-span-7 h-[580px]">
          <LiveLedger contracts={contracts} />
        </div>

        {/* Right Column: Live Agent Activity Console */}
        <div className="lg:col-span-5 h-[580px]">
          <AgentActivityStream logs={logs} />
        </div>
      </div>

      {/* Contract Creation Modal */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onContractCreated={fetchContracts}
        backendUrl={backendUrl}
      />
    </main>
  );
}
