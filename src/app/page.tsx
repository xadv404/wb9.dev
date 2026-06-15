import { WalletButton } from "@/components/WalletButton";
import { Balance } from "@/components/Balance";
import { TransferForm } from "@/components/TransferForm";
import { TxHistory } from "@/components/TxHistory";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur sticky top-0 z-10 bg-[#0a0a0f]/80">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500" />
            <span className="font-bold text-white text-lg tracking-tight">wb9 Transfer</span>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-4 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-2">
          Send ETH{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            instantly
          </span>
        </h1>
        <p className="text-gray-400">Connect your wallet and transfer Ethereum in seconds.</p>
      </div>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Balance />
        <TransferForm />
        <TxHistory />
      </main>

      <footer className="text-center py-8 text-gray-600 text-xs">
        Built with Next.js · wagmi · RainbowKit
      </footer>
    </div>
  );
}
