const { Worker, isMainThread } = require('worker_threads');
const CoinKey = require('coinkey');
const os = require('os');

const wallets = ['1AWCLZAjKbV1P7AHvaPNCKiB7ZWVDMxFiz'];
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
    // Função para gerar chaves aleatórias de forma mais uniforme
    function generateRandomPrivateKeyUniform() {
        // Gera um número aleatório entre 0 e 2^256 - 1
        const randomBytes = require('crypto').randomBytes(32);
        const privateKey = BigInt(`0x${randomBytes.toString('hex')}`);
        return privateKey.toString(16).padStart(64, '0');
    }

    while (true) {
        const privateKey = generateRandomPrivateKeyUniform(); // Usar a nova função de geração de chaves
        const publicKey = generatePublic(privateKey);
        if (wallets.includes(publicKey)) {
            console.log(`Chave privada encontrada: ${privateKey}`);
            console.log(`Chave pública correspondente: ${publicKey}`);
            process.exit();
        }
    }
}
