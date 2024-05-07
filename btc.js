const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const CoinKey = require('coinkey');

const wallets = ['13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so'];

const min = BigInt('0');
const maxPart1 = BigInt('0xffffffffffffffff');
const maxPart2 = BigInt('0xfffffffebaaedce6af48a03bbfd25e8cd0364141');
const max = (maxPart1 << 128n) + maxPart2;

function generateRandomPrivateKey() {
    const privateKey = BigInt(Math.floor(Math.random() * Number(max)));
    return privateKey.toString(16).padStart(64, '0');
}

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

if (isMainThread) {
    const numThreads = 4;
    for (let i = 0; i < numThreads; i++) {
        new Worker(__filename);
    }
} else {
    while (true) {
        const privateKey = generateRandomPrivateKey();
        console.log(`Tentando chave privada: ${privateKey}`); // Print the current private key attempt
        const publicKey = generatePublic(privateKey);
        console.log(`Chave pública correspondente: ${publicKey}`);
        if (wallets.includes(publicKey)) {
            console.log(`Chave privada encontrada: ${privateKey}`);
            console.log(`Chave pública encontrada: ${publicKey}`);
            process.exit();
        }
    }
}