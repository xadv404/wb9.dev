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

    // Create a FixedFloat order for a single token swap
    // POST: action=create, fromCcy=USDT, fromNetwork=ETH, amount=100
    case 'create':
        $fromCcy     = strtoupper(trim($_POST['fromCcy']     ?? ''));
        $fromNetwork = strtoupper(trim($_POST['fromNetwork'] ?? 'ETH'));
        $amount      = floatval($_POST['amount'] ?? 0);
        $toCcy       = strtoupper($cfg['ffToCcy'] ?? 'ETH');
        $toAddress   = $cfg['myWallet'] ?? '';

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
