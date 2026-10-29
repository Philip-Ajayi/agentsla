'use client';

import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export interface ContractRow {
  id: string;
  title: string;
  buyerAgentId: string;
  workerAgentId: string;
  amount: number;
  currency: string;
  status: string;
  paypalAuthId: string | null;
  paypalCaptureId: string | null;
  paypalPayoutBatchId: string | null;
  retryCount: number;
  createdAt: string;
}

interface LiveLedgerProps {
  contracts: ContractRow[];
  onSelectContract?: (contract: ContractRow) => void;
}

export default function LiveLedger({ contracts, onSelectContract }: LiveLedgerProps) {
  const columnDefs: ColDef<ContractRow>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Contract ID',
        width: 140,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-blue-400 font-semibold cursor-pointer">
            #{params.value?.slice(0, 8)}...
          </span>
        ),
      },
      {
        field: 'title',
        headerName: 'Milestone Title',
        flex: 1,
        minWidth: 180,
        cellRenderer: (params: any) => (
          <span className="font-medium text-gray-200">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Escrow Amount',
        width: 130,
        valueFormatter: (params: ValueFormatterParams) =>
          `$${Number(params.value).toFixed(2)} USD`,
        cellClass: 'font-mono font-semibold text-emerald-400',
      },
      {
        field: 'status',
        headerName: 'Escrow State',
        width: 170,
        cellRenderer: (params: any) => {
          const status = params.value;
          if (status === 'CAPTURED') {
            return (
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-700/60">
                <CheckCircle2 className="h-3 w-3" />
                <span>SETTLED</span>
              </span>
            );
          }
          if (status === 'AUTHORIZED') {
            return (
              <span className="inline-flex items-center space-x-1 rounded-full bg-blue-950/80 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-700/60">
                <Clock className="h-3 w-3" />
                <span>FUNDS_LOCKED</span>
              </span>
            );
          }
          if (status === 'RETRY_REQUESTED') {
            return (
              <span className="inline-flex items-center space-x-1 rounded-full bg-amber-950/80 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-700/60">
                <RefreshCw className="h-3 w-3" />
                <span>AUTO_RETRY</span>
              </span>
            );
          }
          if (status === 'VOIDED') {
            return (
              <span className="inline-flex items-center space-x-1 rounded-full bg-rose-950/80 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-700/60">
                <XCircle className="h-3 w-3" />
                <span>ESCROW_VOIDED</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center space-x-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-300 border border-gray-700">
              <AlertCircle className="h-3 w-3" />
              <span>{status}</span>
            </span>
          );
        },
      },
      {
        field: 'paypalAuthId',
        headerName: 'PayPal Auth ID',
        width: 170,
        cellRenderer: (params: any) => (
          <span className="font-mono text-[11px] text-gray-400">
            {params.value ? `${params.value.slice(0, 14)}...` : '—'}
          </span>
        ),
      },
      {
        field: 'paypalCaptureId',
        headerName: 'Capture TxID',
        width: 170,
        cellRenderer: (params: any) => (
          <span className="font-mono text-[11px] text-emerald-400">
            {params.value ? `${params.value.slice(0, 14)}...` : '—'}
          </span>
        ),
      },
      {
        field: 'buyerAgentId',
        headerName: 'Buyer Agent',
        width: 140,
        cellRenderer: (params: any) => (
          <span className="text-xs text-indigo-300 font-mono">{params.value?.slice(0, 10)}</span>
        ),
      },
      {
        field: 'workerAgentId',
        headerName: 'Worker Agent',
        width: 140,
        cellRenderer: (params: any) => (
          <span className="text-xs text-emerald-300 font-mono">{params.value?.slice(0, 10)}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="h-full w-full rounded-2xl border border-gray-800 bg-[#111827] overflow-hidden shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/70 px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200">
            AgentSLA Cryptographic Milestone Ledger
          </h2>
        </div>
        <span className="text-xs font-mono text-gray-400">
          Total Contracts: <strong className="text-white">{contracts.length}</strong>
        </span>
      </div>

      <div className="ag-theme-quartz-dark flex-1 w-full min-h-[350px]">
        <AgGridReact
          rowData={contracts}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          rowSelection="single"
          onRowClicked={(event) => onSelectContract && onSelectContract(event.data)}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
}
