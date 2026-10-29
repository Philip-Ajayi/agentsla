'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { X, ShieldCheck, FileCode, CheckCircle } from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated: () => void;
  backendUrl: string;
}

export default function ContractModal({ isOpen, onClose, onContractCreated, backendUrl }: ContractModalProps) {
  const [title, setTitle] = useState('Data Extraction & Geotagging SLA');
  const [description, setDescription] = useState('Extract verified corporate market cap data with ISO country validation.');
  const [amount, setAmount] = useState('25.00');
  const [workerEmail, setWorkerEmail] = useState('agent-beta-payout@sandbox.agentsla.io');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const defaultSchema = JSON.stringify({
        ticker: 'string',
        company_name: 'string',
        market_cap_billions: 'number',
        iso_code: 'string',
      });

      const defaultSemantic = 'Verify market cap accuracy. Require 2-letter uppercase ISO country code in iso_code.';

      await axios.post(`${backendUrl}/api/contracts`, {
        title,
        description,
        buyerAgentId: 'agent-alpha-buyer-ui',
        workerAgentId: 'agent-beta-worker-ui',
        workerPayoutEmail: workerEmail,
        amount: parseFloat(amount),
        schemaCriteria: defaultSchema,
        semanticCriteria: defaultSemantic,
      });

      onContractCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to register contract. Check backend logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-2">
            <FileCode className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Create Autonomous SLA Contract</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Contract Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Escrow Hold ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Worker Payout Email</label>
              <input
                type="email"
                value={workerEmail}
                onChange={(e) => setWorkerEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-3 text-xs text-blue-300">
            <div className="flex items-center space-x-1 font-semibold">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>PayPal Escrow Guarantee</span>
            </div>
            <p className="mt-1 text-gray-400">
              Funds are isolated using an Authorize intent hold. Worker Agent receives funds via PayPal Payouts only after Dual-Harness (Zod + Gemini Flash) validation passes.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Contract'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
