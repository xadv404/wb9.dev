<?php
$cfg  = json_decode(file_get_contents(__DIR__ . '/config.json'), true);
$logs = [];
$logFile = __DIR__ . '/logs/transfers.json';
if (file_exists($logFile)) {
    $logs = json_decode(file_get_contents($logFile), true) ?? [];
}

$explorers = [
    'ETH'      => 'https://etherscan.io/tx/',
    'MATIC'    => 'https://polygonscan.com/tx/',
    'BSC'      => 'https://bscscan.com/tx/',
    'ARBITRUM' => 'https://arbiscan.io/tx/',
    'OPTIMISM' => 'https://optimistic.etherscan.io/tx/',
    'BASE'     => 'https://basescan.org/tx/',
    'AVAX'     => 'https://snowtrace.io/tx/',
];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Logs — <?= htmlspecialchars($cfg['siteName'] ?? 'wb9 Transfer') ?></title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <style>
    .logs-table { width:100%; border-collapse:collapse; font-size:13px; }
    .logs-table th { text-align:left; padding:10px 12px; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:.6px; border-bottom:1px solid var(--border); }
    .logs-table td { padding:12px; border-bottom:1px solid var(--border); color:var(--text-secondary); vertical-align:middle; }
    .logs-table tr:hover td { background:var(--bg-secondary); }
    .tx-link { color:var(--accent-blue); text-decoration:none; font-family:monospace; }
    .tx-link:hover { text-decoration:underline; }
    .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; background:rgba(124,58,237,.15); color:#c4b5fd; border:1px solid rgba(124,58,237,.3); }
    .amount { font-weight:600; color:var(--text-primary); }
    .empty { text-align:center; padding:60px 20px; color:var(--text-muted); }
  </style>
</head>
<body>
<div class="glow-orb glow-orb-1"></div>

<header>
  <div class="container header-inner">
    <a href="/" class="logo">
      <span class="logo-icon">⬡</span>
      <span class="logo-text"><?= htmlspecialchars($cfg['siteName'] ?? 'wb9 Transfer') ?></span>
    </a>
    <a href="/" class="btn btn-outline" style="padding:8px 16px;font-size:13px;border-radius:8px;">← Retour</a>
  </div>
</header>

<main>
  <div class="container">
    <div class="page-title">
      <h1>Transfer Logs</h1>
      <p><?= count($logs) ?> transfert(s) enregistré(s)</p>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <?php if (empty($logs)): ?>
        <div class="empty">Aucun transfert enregistré pour l'instant.</div>
      <?php else: ?>
        <table class="logs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>De</th>
              <th>Asset</th>
              <th>Montant</th>
              <th>Réseau</th>
              <th>ff.io</th>
              <th>Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($logs as $l): ?>
              <?php
                $explorer = ($explorers[$l['network'] ?? ''] ?? '') . ($l['txHash'] ?? '');
                $date     = date('d/m/Y H:i', strtotime($l['ts'] ?? 'now'));
                $addr     = $l['fromAddress'] ?? '';
                $shortAddr = $addr ? substr($addr,0,6).'…'.substr($addr,-4) : '—';
                $hash     = $l['txHash'] ?? '';
                $shortHash = $hash ? substr($hash,0,8).'…'.substr($hash,-6) : '—';
              ?>
              <tr>
                <td><?= htmlspecialchars($date) ?></td>
                <td><span title="<?= htmlspecialchars($addr) ?>" style="font-family:monospace"><?= htmlspecialchars($shortAddr) ?></span></td>
                <td><span class="badge"><?= htmlspecialchars($l['symbol'] ?? '—') ?></span></td>
                <td class="amount"><?= htmlspecialchars($l['amount'] ?? '—') ?></td>
                <td><?= htmlspecialchars($l['network'] ?? '—') ?></td>
                <td><?= $l['ffOrderId'] ? htmlspecialchars($l['ffOrderId']) : '—' ?></td>
                <td>
                  <?php if ($hash && $explorer): ?>
                    <a class="tx-link" href="<?= htmlspecialchars($explorer) ?>" target="_blank" rel="noopener"><?= htmlspecialchars($shortHash) ?> ↗</a>
                  <?php else: ?>—<?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      <?php endif; ?>
    </div>
  </div>
</main>

<footer>
  <div class="container">
    <p class="footer-disclaimer"><?= htmlspecialchars($cfg['siteName'] ?? 'wb9 Transfer') ?> &copy; <?= date('Y') ?></p>
  </div>
</footer>
</body>
</html>
