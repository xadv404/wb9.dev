/* =====================================================================
   wb9 Transfer — Web3 app logic
   Deps loaded from CDN: ethers v6 (window.ethers)
   ===================================================================== */

// ── Constants ─────────────────────────────────────────────────────────────────

const NETWORKS = {
  1:        { name: 'Ethereum',  explorer: 'https://etherscan.io/tx/',         dot: 'active' },
  11155111: { name: 'Sepolia',   explorer: 'https://sepolia.etherscan.io/tx/', dot: 'warning' },
};

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const TOKENS = {
  1: [
    { symbol: 'USDT', name: 'Tether USD',      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  icon: 'usdt' },
    { symbol: 'USDC', name: 'USD Coin',         address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  icon: 'usdc' },
    { symbol: 'DAI',  name: 'Dai Stablecoin',   address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, icon: 'dai'  },
    { symbol: 'WETH', name: 'Wrapped Ether',    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, icon: 'weth' },
  ],
  11155111: [
    { symbol: 'USDC', name: 'USD Coin (Sepolia)', address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', decimals: 6,  icon: 'usdc' },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  provider: null,
  signer:   null,
  address:  null,
  chainId:  null,
  balances: {},   // symbol → { formatted, raw, token|null }
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const connectBtn    = $('connectBtn');
const walletPanel   = $('walletPanel');
const notConnected  = $('notConnected');
const connectedInfo = $('connectedInfo');
const networkBadge  = $('networkBadge');
const addrEl        = $('walletAddress');
const ethBalEl      = $('ethBalance');
const tokenListEl   = $('tokenList');
const assetSelect   = $('assetSelect');
const recipientEl   = $('recipient');
const amountEl      = $('amount');
const maxBtn        = $('maxBtn');
const sendBtn       = $('sendBtn');
const txStatusEl    = $('txStatus');
const walletModal   = $('walletModal');
const modalClose    = $('modalClose');
const toastContainer = $('toastContainer');

// ── EIP-6963: multi-wallet discovery ─────────────────────────────────────────
// Every browser wallet that supports EIP-6963 announces itself here:
// MetaMask, Rabby, Coinbase, OKX, Brave, Rainbow, Phantom, Trust (in-browser),
// Zerion, Frame, Enkrypt, Bitget, Backpack, SafePal, TokenPocket, etc.

const eip6963Providers = new Map(); // rdns → { info, provider }

window.addEventListener('eip6963:announceProvider', (e) => {
  const { info, provider } = e.detail;
  eip6963Providers.set(info.rdns, { info, provider });
  renderDetectedWallets();
});

window.dispatchEvent(new Event('eip6963:requestProvider'));

function renderDetectedWallets() {
  const section  = document.getElementById('detectedWallets');
  const list     = document.getElementById('detectedWalletsList');
  const fallback = document.getElementById('fallbackWallets');
  if (!section || !list) return;

  list.innerHTML = '';

  eip6963Providers.forEach(({ info, provider }) => {
    const btn = document.createElement('button');
    btn.className = 'wallet-option';
    btn.innerHTML = `
      <span class="wallet-option-icon">
        ${info.icon
          ? `<img src="${info.icon}" width="28" height="28" style="border-radius:6px" alt="">`
          : '🔷'}
      </span>
      <div>
        <div class="wallet-option-name">${info.name}</div>
        <div class="wallet-option-desc">${info.rdns}</div>
      </div>
      <span class="wallet-option-tag">Detected</span>`;
    btn.addEventListener('click', async () => {
      hideWalletModal();
      await connectWithProvider(provider, info.name);
    });
    list.appendChild(btn);
  });

  const hasDetected = eip6963Providers.size > 0;
  section.style.display  = hasDetected ? 'block' : 'none';
  // Hide generic fallback buttons when EIP-6963 wallets are present
  if (fallback) fallback.style.display = hasDetected ? 'none' : 'block';
}

// ── Mobile wallet deep links ──────────────────────────────────────────────────
// On mobile, clicking these opens the wallet app directly.
// The app loads the dApp inside its built-in browser and injects window.ethereum.

// Icons from the official WalletConnect assets repo (wallet-provided logos)
const WC_ICON = (name) =>
  `https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/${encodeURIComponent(name)}/Icon.png`;

const MOBILE_WALLETS = [
  {
    name: 'MetaMask',
    icon: WC_ICON('MetaMask'),
    deeplink: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`,
  },
  {
    name: 'Trust Wallet',
    icon: WC_ICON('Trust Wallet'),
    deeplink: (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Coinbase Wallet',
    icon: WC_ICON('Coinbase Wallet'),
    deeplink: (url) => `https://go.cb-wallet.com/dapp?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Rainbow',
    icon: WC_ICON('Rainbow'),
    deeplink: (url) => `https://rnbwapp.com/dapp?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'OKX Wallet',
    icon: WC_ICON('OKX Wallet'),
    deeplink: (url) => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`,
  },
  {
    name: 'Exodus',
    icon: WC_ICON('Exodus'),
    deeplink: (url) => `exodus://dapp?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Kraken Wallet',
    icon: WC_ICON('Kraken Wallet'),
    deeplink: (url) => `krakenwallet://dapp?url=${encodeURIComponent(url)}`,
  },
];

function renderMobileWallets() {
  const list = document.getElementById('mobileWalletsList');
  if (!list) return;
  const pageUrl = window.location.href;

  MOBILE_WALLETS.forEach(({ name, icon, deeplink }) => {
    const btn = document.createElement('a');
    btn.className  = 'wallet-option';
    btn.href       = deeplink(pageUrl);
    // On desktop this opens in a new tab; on mobile it launches the app
    btn.target     = '_blank';
    btn.rel        = 'noopener noreferrer';
    btn.style.textDecoration = 'none';
    btn.innerHTML  = `
      <span class="wallet-option-icon">
        <img src="${icon}" width="28" height="28" style="border-radius:6px" alt="${name}"
             onerror="this.style.display='none';this.parentElement.textContent='📱'">
      </span>
      <div>
        <div class="wallet-option-name">${name}</div>
        <div class="wallet-option-desc">Open in ${name} app</div>
      </div>
      <span class="wallet-option-tag">Mobile</span>`;
    list.appendChild(btn);
  });
}

renderMobileWallets();

// ── Wallet connection ─────────────────────────────────────────────────────────

connectBtn.addEventListener('click', () => {
  if (state.address) disconnect();
  else showWalletModal();
});

modalClose.addEventListener('click', hideWalletModal);
walletModal.addEventListener('click', (e) => { if (e.target === walletModal) hideWalletModal(); });

function showWalletModal() { walletModal.classList.add('show'); }
function hideWalletModal() { walletModal.classList.remove('show'); }

// Static wallet option buttons (MetaMask / Coinbase / generic injected)
document.querySelectorAll('.wallet-option[data-wallet]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    hideWalletModal();
    await connectWallet(btn.dataset.wallet);
  });
});

async function connectWallet(walletType) {
  let eth = null;

  if (walletType === 'metamask') {
    // Support multi-provider arrays (EIP-5749 / legacy MetaMask coexistence)
    eth = window.ethereum?.providers?.find((p) => p.isMetaMask) ?? window.ethereum;
    if (!eth?.isMetaMask) { toast('MetaMask not detected. Install it at metamask.io', 'error'); return; }

  } else if (walletType === 'trust') {
    eth = window.ethereum?.providers?.find((p) => p.isTrust || p.isTrustWallet) ?? window.ethereum;
    if (!eth?.isTrust && !eth?.isTrustWallet) { toast('Trust Wallet extension not detected.', 'error'); return; }
  } else if (walletType === 'coinbase') {
    eth = window.ethereum?.providers?.find((p) => p.isCoinbaseWallet) ?? window.ethereum;
    if (!eth?.isCoinbaseWallet && !eth?.isCoinbaseBrowser) {
      toast('Coinbase Wallet not detected.', 'error'); return;
    }

  } else {
    // Any remaining injected provider (Brave, OKX, Trust in dApp browser, etc.)
    eth = window.ethereum;
    if (!eth) { toast('No Web3 wallet detected in this browser.', 'error'); return; }
  }

  await connectWithProvider(eth, walletType);
}

async function connectWithProvider(eth, label) {
  try {
    await eth.request({ method: 'eth_requestAccounts' });

    const provider = new ethers.BrowserProvider(eth);
    const signer   = await provider.getSigner();
    const address  = await signer.getAddress();
    const network  = await provider.getNetwork();

    state.provider = provider;
    state.signer   = signer;
    state.address  = address;
    state.chainId  = Number(network.chainId);

    onConnected();

    eth.on('accountsChanged', (accounts) => {
      if (!accounts.length) disconnect();
      else location.reload();
    });
    eth.on('chainChanged', () => location.reload());

  } catch (err) {
    if (err.code === 4001 || err.code === 'ACTION_REJECTED')
      toast('Connection rejected.', 'error');
    else
      toast('Connection failed: ' + (err.message ?? err), 'error');
  }
}

function disconnect() {
  state.provider = null;
  state.signer   = null;
  state.address  = null;
  state.chainId  = null;
  state.balances = {};
  onDisconnected();
}

// ── UI: connected / disconnected ──────────────────────────────────────────────

function onConnected() {
  const net = NETWORKS[state.chainId] ?? { name: `Chain ${state.chainId}`, explorer: '#', dot: '' };

  // Header
  connectedInfo.style.display = 'flex';
  networkBadge.innerHTML =
    `<span class="network-dot ${net.dot}"></span>${net.name}`;
  connectBtn.textContent = truncateAddr(state.address);
  connectBtn.classList.remove('btn-connect');
  connectBtn.classList.add('btn-connected');

  // Wallet panel
  notConnected.style.display = 'none';
  walletPanel.style.display  = 'block';
  addrEl.textContent = truncateAddr(state.address);

  // Form
  assetSelect.disabled = false;
  maxBtn.disabled      = false;
  sendBtn.disabled     = false;

  toast('Wallet connected!', 'success');
  loadBalances();
}

function onDisconnected() {
  connectedInfo.style.display = 'none';
  connectBtn.textContent = 'Connect Wallet';
  connectBtn.classList.add('btn-connect');
  connectBtn.classList.remove('btn-connected');

  notConnected.style.display = 'block';
  walletPanel.style.display  = 'none';
  ethBalEl.textContent = '—';
  tokenListEl.innerHTML = '';

  assetSelect.innerHTML = '<option value="">— connect wallet —</option>';
  assetSelect.disabled  = true;
  maxBtn.disabled       = true;
  sendBtn.disabled      = true;
  hideTxStatus();
}

// ── Balance loading ───────────────────────────────────────────────────────────

async function loadBalances() {
  state.balances = {};

  // ETH balance
  try {
    const raw = await state.provider.getBalance(state.address);
    const formatted = parseFloat(ethers.formatEther(raw)).toFixed(6);
    state.balances['ETH'] = { formatted, raw, token: null };
    ethBalEl.textContent = `${formatted} ETH`;
  } catch { ethBalEl.textContent = 'Error'; }

  // Token balances
  const tokens = TOKENS[state.chainId] ?? [];
  tokenListEl.innerHTML = '';

  // Populate asset selector
  assetSelect.innerHTML = `<option value="ETH">ETH — ${state.balances['ETH']?.formatted ?? '…'}</option>`;

  for (const t of tokens) {
    // Skeleton row
    const li = document.createElement('li');
    li.className = 'token-item';
    li.innerHTML = `
      <div class="token-icon ${t.icon}">${t.symbol}</div>
      <div class="token-details">
        <div class="token-name">${t.symbol}</div>
        <div class="token-fullname">${t.name}</div>
      </div>
      <div class="token-balance-info">
        <div class="token-balance token-loading" id="bal-${t.symbol}">Loading…</div>
      </div>`;
    tokenListEl.appendChild(li);

    // Add to select (balance shown after load)
    const opt = document.createElement('option');
    opt.value = t.symbol;
    opt.textContent = `${t.symbol} — …`;
    assetSelect.appendChild(opt);

    // Fetch async
    (async () => {
      try {
        const contract = new ethers.Contract(t.address, ERC20_ABI, state.provider);
        const raw      = await contract.balanceOf(state.address);
        const formatted = parseFloat(ethers.formatUnits(raw, t.decimals)).toFixed(4);
        state.balances[t.symbol] = { formatted, raw, token: t };

        document.getElementById(`bal-${t.symbol}`).textContent = `${formatted} ${t.symbol}`;
        document.getElementById(`bal-${t.symbol}`).classList.remove('token-loading');

        opt.textContent = `${t.symbol} — ${formatted}`;
      } catch {
        document.getElementById(`bal-${t.symbol}`).textContent = 'Error';
      }
    })();
  }
}

// ── Max button ────────────────────────────────────────────────────────────────

maxBtn.addEventListener('click', () => {
  const asset = assetSelect.value;
  if (!asset || !state.balances[asset]) return;
  amountEl.value = state.balances[asset].formatted;
});

// ── Send ──────────────────────────────────────────────────────────────────────

sendBtn.addEventListener('click', async () => {
  hideTxStatus();
  const asset     = assetSelect.value;
  const recipient = recipientEl.value.trim();
  const amount    = amountEl.value.trim();

  // Validate
  if (!asset)               { shakeInput(assetSelect);   return; }
  if (!ethers.isAddress(recipient)) { toast('Invalid recipient address.', 'error'); shakeInput(recipientEl); return; }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    toast('Enter a valid amount.', 'error'); shakeInput(amountEl); return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span> Confirm in wallet…';

  try {
    let txHash;

    if (asset === 'ETH') {
      const tx = await state.signer.sendTransaction({
        to:    recipient,
        value: ethers.parseEther(amount),
      });
      txHash = tx.hash;
      showTxStatus('pending', txHash);
      await tx.wait();
      showTxStatus('success', txHash);
    } else {
      const t        = state.balances[asset]?.token;
      if (!t)        { toast('Token info not loaded yet.', 'error'); return; }
      const contract = new ethers.Contract(t.address, ERC20_ABI, state.signer);
      const parsed   = ethers.parseUnits(amount, t.decimals);
      const tx       = await contract.transfer(recipient, parsed);
      txHash = tx.hash;
      showTxStatus('pending', txHash);
      await tx.wait();
      showTxStatus('success', txHash);
    }

    toast('Transaction confirmed!', 'success');
    loadBalances();
    recipientEl.value = '';
    amountEl.value    = '';
  } catch (err) {
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      toast('Transaction rejected.', 'error');
      hideTxStatus();
    } else {
      const msg = err.reason ?? err.shortMessage ?? err.message ?? 'Transaction failed.';
      showTxStatus('error', null, msg);
      toast(msg.slice(0, 80), 'error');
    }
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send';
  }
});

// ── Tx status panel ───────────────────────────────────────────────────────────

function showTxStatus(type, hash, errorMsg) {
  const net = NETWORKS[state.chainId] ?? { explorer: '#' };
  txStatusEl.style.display = 'block';
  txStatusEl.classList.add('show');

  const icons   = { pending: '⏳', success: '✅', error: '❌' };
  const titles  = { pending: 'Transaction Submitted', success: 'Confirmed!', error: 'Transaction Failed' };
  const subs    = { pending: 'Waiting for network confirmation…', success: 'Your transfer was successful.', error: errorMsg ?? 'Something went wrong.' };

  let hashHtml = '';
  if (hash) {
    const url = net.explorer + hash;
    hashHtml = `
      <div class="tx-hash-row">
        <span style="flex:1;word-break:break-all">${hash}</span>
        <a class="tx-hash-link" href="${url}" target="_blank" rel="noopener">View ↗</a>
      </div>`;
  }

  txStatusEl.innerHTML = `
    <div class="tx-status-card ${type}">
      <div class="tx-status-header">
        <span class="tx-status-icon">${icons[type]}</span>
        <div>
          <div class="tx-status-title">${titles[type]}</div>
          <div class="tx-status-subtitle">${subs[type]}</div>
        </div>
      </div>
      ${hashHtml}
    </div>`;
}

function hideTxStatus() {
  txStatusEl.style.display = 'none';
  txStatusEl.innerHTML = '';
}

// ── Copy address ──────────────────────────────────────────────────────────────

document.getElementById('copyAddr').addEventListener('click', () => {
  if (!state.address) return;
  navigator.clipboard.writeText(state.address).then(() => toast('Address copied!', 'info'));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddr(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function shakeInput(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.3s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── Shake animation (injected) ────────────────────────────────────────────────

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}`;
document.head.appendChild(shakeStyle);
