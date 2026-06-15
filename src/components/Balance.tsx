"use client";

import { useAccount, useBalance } from "wagmi";

export function Balance() {
  const { address, isConnected } = useAccount();
  const { data, isLoading } = useBalance({ address });

  if (!isConnected || !address) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <p className="text-sm text-gray-400 mb-1">Your Balance</p>
      {isLoading ? (
        <div className="h-8 w-32 bg-white/10 animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-white">
          {parseFloat(data?.formatted ?? "0").toFixed(6)}{" "}
          <span className="text-purple-400">{data?.symbol}</span>
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500 font-mono break-all">{address}</p>
    </div>
  );
}
