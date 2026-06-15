"use client";

import { useAccount, useChainId } from "wagmi";
import { useEffect, useState } from "react";

interface Tx {
  hash: string;
  to: string;
  from: string;
  value: string;
  timeStamp: string;
}

export function TxHistory() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  const explorerBase =
    chainId === 11155111
      ? "https://sepolia.etherscan.io/tx/"
      : "https://etherscan.io/tx/";

  const apiBase =
    chainId === 11155111
      ? "https://api-sepolia.etherscan.io/api"
      : "https://api.etherscan.io/api";

  useEffect(() => {
    if (!address || !isConnected) return;
    setLoading(true);
    fetch(
      `${apiBase}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=YourApiKeyToken`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "1") setTxs(data.result.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, isConnected, apiBase]);

  if (!isConnected) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white/10 animate-pulse rounded-lg" />
          ))}
        </div>
      )}
      {!loading && txs.length === 0 && (
        <p className="text-gray-500 text-sm">No transactions found.</p>
      )}
      {!loading && txs.length > 0 && (
        <ul className="space-y-2">
          {txs.map((tx) => {
            const isOut = tx.from.toLowerCase() === address?.toLowerCase();
            const ethVal = (parseInt(tx.value) / 1e18).toFixed(6);
            const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString();
            return (
              <li key={tx.hash} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{date}</p>
                  <a
                    href={`${explorerBase}${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-purple-400 hover:underline truncate block max-w-[200px]"
                  >
                    {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
                  </a>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${isOut ? "text-red-400" : "text-green-400"}`}
                >
                  {isOut ? "-" : "+"}{ethVal} ETH
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
