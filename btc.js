const { Worker, isMainThread } = require('worker_threads');
const CoinKey = require('coinkey');
const os = require('os');

const wallets = ['13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so'];
const numCPUs = os.cpus().length;
const numThreads = Math.min(4, numCPUs); // Use no máximo 4 threads, ou o número de CPUs disponíveis, o que for menor

function generateRandomPrivateKey() {
    const privateKey = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    return privateKey.toString(16).padStart(64, '0');
}

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

if (isMainThread) {
    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename);
    }
} else {
    while (true) {
        const privateKey = generateRandomPrivateKey();
        const publicKey = generatePublic(privateKey);
        if (wallets.includes(publicKey)) {
            console.log(`Chave privada encontrada: ${privateKey}`);
            console.log(`Chave pública correspondente: ${publicKey}`);
            process.exit();
        }
    }
}
