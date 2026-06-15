<?php
define('RPC_MAINNET',  'https://cloudflare-eth.com');
define('RPC_SEPOLIA',  'https://rpc.sepolia.org');
define('WC_PROJECT_ID', 'YOUR_WALLETCONNECT_PROJECT_ID');
define('SITE_NAME',    'wb9 Transfer');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= SITE_NAME ?></title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js"
          crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <link rel="stylesheet" href="assets/css/style.css" />
</head>
<body>

<div class="glow-orb glow-orb-1"></div>
<div class="glow-orb glow-orb-2"></div>

<header>
  <div class="container header-inner">
    <a href="/" class="logo">
      <span class="logo-icon">⬡</span>
      <span class="logo-text"><?= SITE_NAME ?></span>
    </a>
    <div class="header-right">
      <div id="connectedInfo" style="display:none; align-items:center; gap:10px;">
        <span id="networkBadge" class="network-badge"></span>
      </div>
      <button id="connectBtn" class="btn-connect">Connect Wallet</button>
    </div>
  </div>
</header>

<main>
  <div class="container">
    <div class="page-title">
      <h1>Send Crypto</h1>
      <p>Connect your wallet to transfer ETH and ERC-20 tokens instantly.</p>
    </div>

    <div class="app-grid">

      <!-- Left: Wallet / Balances -->
      <div class="card">
        <div id="notConnected" class="not-connected">
          <div class="not-connected-icon">🔐</div>
          <h3>Connect your wallet</h3>
          <p>Supports MetaMask, Coinbase Wallet, Trust Wallet, Brave, Rainbow, and any EIP-1193 browser wallet.</p>
          <button class="btn btn-primary btn-lg" onclick="document.getElementById('connectBtn').click()">Connect Wallet</button>
        </div>

        <div id="walletPanel" style="display:none;">
          <p class="card-title">Your Wallet</p>
          <div class="wallet-address-block">
            <div class="wallet-avatar">👛</div>
            <div class="wallet-info">
              <div class="wallet-label">Address</div>
              <div class="wallet-addr" id="walletAddress">—</div>
            </div>
            <button class="copy-btn" id="copyAddr" title="Copy address">⧉</button>
          </div>

          <div class="eth-balance-block">
            <div class="eth-balance-label">ETH Balance</div>
            <div class="eth-balance-amount" id="ethBalance">…</div>
          </div>

          <div class="token-list-title">Token Balances</div>
          <ul id="tokenList"></ul>

          <div class="divider"></div>
          <button class="btn btn-outline btn-full" onclick="document.getElementById('connectBtn').click()" style="font-size:13px;">Disconnect</button>
        </div>
      </div>

      <!-- Right: Transfer -->
      <div class="card">
        <p class="card-title">Transfer</p>

        <div class="form-group">
          <label class="form-label" for="assetSelect">Asset</label>
          <select id="assetSelect" class="form-input" disabled>
            <option value="">— connect wallet —</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="recipient">Recipient address</label>
          <input id="recipient" type="text" class="form-input" placeholder="0x…" autocomplete="off" spellcheck="false" />
        </div>

        <div class="form-group">
          <label class="form-label" for="amount">Amount</label>
          <div class="amount-input-wrapper">
            <input id="amount" type="number" class="form-input" placeholder="0.00" min="0" step="any" />
            <button id="maxBtn" class="btn-max" disabled>Max</button>
          </div>
        </div>

        <div class="fee-estimate">
          <span class="fee-label">Network fee</span>
          <span class="fee-value">Estimated in your wallet</span>
        </div>

        <button id="sendBtn" class="btn btn-primary btn-full btn-lg send-btn" disabled>Send</button>
        <div id="txStatus"></div>
      </div>

    </div>
  </div>
</main>

<footer>
  <div class="container">
    <p class="footer-disclaimer">
      <?= SITE_NAME ?> &copy; <?= date('Y') ?> — Transactions are signed locally in your wallet. No private keys are ever sent to this server.
    </p>
  </div>
</footer>

<!-- Wallet modal -->
<div id="walletModal" class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Connect a Wallet</span>
      <button class="modal-close" id="modalClose">✕</button>
    </div>
    <div class="wallet-options">
      <button class="wallet-option" data-wallet="metamask">
        <span class="wallet-option-icon">🦊</span>
        <div><div class="wallet-option-name">MetaMask</div><div class="wallet-option-desc">Most popular browser wallet</div></div>
        <span class="wallet-option-tag">Injected</span>
      </button>
      <button class="wallet-option" data-wallet="coinbase">
        <span class="wallet-option-icon">🔵</span>
        <div><div class="wallet-option-name">Coinbase Wallet</div><div class="wallet-option-desc">By Coinbase</div></div>
        <span class="wallet-option-tag">Injected</span>
      </button>
      <button class="wallet-option" data-wallet="injected">
        <span class="wallet-option-icon">🌐</span>
        <div><div class="wallet-option-name">Browser Wallet</div><div class="wallet-option-desc">Trust Wallet, Brave, Rainbow, OKX…</div></div>
        <span class="wallet-option-tag">EIP-1193</span>
      </button>
    </div>

    <!-- EIP-6963: detected wallets injected here by JS -->
    <div id="detectedWallets" class="wallet-options" style="margin-top:12px; display:none;">
      <p style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:8px;">Detected wallets</p>
    </div>
  </div>
</div>

<div id="toastContainer" class="toast-container"></div>

<script>
  window.WB9_CONFIG = {
    rpcMainnet:  '<?= RPC_MAINNET ?>',
    rpcSepolia:  '<?= RPC_SEPOLIA ?>',
    wcProjectId: '<?= WC_PROJECT_ID ?>',
  };
</script>
<script src="assets/js/app.js"></script>
</body>
</html>
