<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cfg    = json_decode(file_get_contents(__DIR__ . '/config.json'), true);
$action = $_POST['action'] ?? '';

function ff_request(string $endpoint, array $body, string $key, string $secret): array {
    $json  = json_encode($body);
    $sign  = hash_hmac('sha256', $json, $secret);
    $ch    = curl_init('https://ff.io/api/v2/' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $json,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'X-API-KEY: '  . $key,
            'X-API-SIGN: ' . $sign,
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) return ['error' => $err];
    return json_decode($res, true) ?? ['error' => 'Invalid response'];
}

switch ($action) {

    // Create a FixedFloat order — 1st leg: TOKEN/ETH → XMR (if xmrWallet set), else direct to myWallet
    // POST: action=create, fromCcy=USDT, fromNetwork=ETH, amount=100
    case 'create':
        $fromCcy     = strtoupper(trim($_POST['fromCcy']     ?? ''));
        $fromNetwork = strtoupper(trim($_POST['fromNetwork'] ?? 'ETH'));
        $amount      = floatval($_POST['amount'] ?? 0);
        $xmrWallet   = $cfg['xmrWallet'] ?? '';

        if ($xmrWallet) {
            $toCcy     = 'XMR';
            $toAddress = $xmrWallet;
        } else {
            $toCcy     = strtoupper($cfg['ffToCcy'] ?? 'ETH');
            $toAddress = $cfg['myWallet'] ?? '';
        }

        if (!$fromCcy || $amount <= 0 || !$toAddress) {
            echo json_encode(['error' => 'Missing parameters']); exit;
        }

        $res = ff_request('create', [
            'fromCcy'   => $fromCcy,
            'toCcy'     => $toCcy,
            'toAddress' => $toAddress,
            'amount'    => $amount,
            'direction' => 'from',
            'type'      => 'FLOAT',
        ], $cfg['ffApiKey'], $cfg['ffApiSecret']);

        echo json_encode($res);
        break;

    // Create 2nd leg: XMR → ETH to myWallet (FLOAT, any XMR amount accepted)
    // POST: action=create_xmr_out
    case 'create_xmr_out':
        $toAddress = $cfg['myWallet'] ?? '';
        $toCcy     = strtoupper($cfg['ffToCcy'] ?? 'ETH');
        if (!$toAddress) {
            echo json_encode(['error' => 'myWallet not configured']); exit;
        }
        $res = ff_request('create', [
            'fromCcy'   => 'XMR',
            'toCcy'     => $toCcy,
            'toAddress' => $toAddress,
            'direction' => 'from',
            'type'      => 'FLOAT',
        ], $cfg['ffApiKey'], $cfg['ffApiSecret']);
        echo json_encode($res);
        break;

    // Get order status
    // POST: action=status, id=ORDER_ID, token=ORDER_TOKEN
    case 'status':
        $id    = trim($_POST['id']    ?? '');
        $token = trim($_POST['token'] ?? '');
        if (!$id) { echo json_encode(['error' => 'Missing id']); exit; }
        $res = ff_request('order', ['id' => $id, 'token' => $token],
            $cfg['ffApiKey'], $cfg['ffApiSecret']);
        echo json_encode($res);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
