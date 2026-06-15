"use client";

import { useState } from "react";
import { useAccount, useChainId, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress } from "viem";

export function TransferForm() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const { sendTransaction, data: txHash, isPending, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const explorerBase =
    chainId === 11155111
      ? "https://sepolia.etherscan.io/tx/"
      : "https://etherscan.io/tx/";

  function handleSend() {
    setError("");
    if (!isAddress(to)) {
      setError("Invalid Ethereum address.");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      sendTransaction({ to: to as `0x${string}`, value: parseEther(amount) });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Transaction failed.");
    }
  }

  function handleReset() {
    reset();
    setTo("");
    setAmount("");
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-gray-400">
        Connect your wallet to send ETH.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Send ETH</h2>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Recipient address</label>
        <input
          type="text"
          placeholder="0x..."
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-purple-500 transition font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Amount (ETH)</label>
        <input
          type="number"
          placeholder="0.01"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-purple-500 transition"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!txHash && (
        <button
          onClick={handleSend}
          disabled={isPending}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 transition"
        >
          {isPending ? "Confirm in wallet…" : "Send ETH"}
        </button>
      )}

      {txHash && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
          {isConfirming && (
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              Waiting for confirmation…
            </p>
          )}
          {isSuccess && <p className="text-green-400 text-sm font-semibold">Transaction confirmed!</p>}
          <p className="text-xs text-gray-400">Tx hash:</p>
          <a
            href={`${explorerBase}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-xs font-mono break-all hover:underline"
          >
            {txHash}
          </a>
          {isSuccess && (
            <button
              onClick={handleReset}
              className="mt-2 text-sm text-gray-400 hover:text-white transition"
            >
              Send another
            </button>
          )}
        </div>
      )}
    </div>
  );
}
