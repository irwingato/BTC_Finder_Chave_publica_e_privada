const { Worker, isMainThread, workerData } = require('worker_threads');
const fs = require('fs');
const CoinKey = require('coinkey');
const os = require('os');
const cluster = require('cluster');

const wallets = ['1AWCLZAjKbV1P7AHvaPNCKiB7ZWVDMxFiz'];
const numCPUs = os.cpus().length;
const numThreads = Math.min(4, numCPUs); // Use no máximo 4 threads, ou o número de CPUs disponíveis, o que for menor

function generateRandomPrivateKey() {
    const randomBytes = require('crypto').randomBytes(32);
    const privateKey = BigInt(`0x${randomBytes.toString('hex')}`);
    return privateKey.toString(16).padStart(64, '0');
}

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

function saveAttempt(privateKey) {
    fs.appendFileSync('attempts.txt', `${privateKey}\n`);
}

function loadLastAttempt() {
    try {
        const attempts = fs.readFileSync('attempts.txt', 'utf8').trim().split('\n');
        return attempts[attempts.length - 1];
    } catch (err) {
        console.error('Erro ao carregar a última tentativa:', err.message);
        return null;
    }
}

if (isMainThread) {
    if (cluster.isMaster) {
        // Cria workers com o mesmo script
        for (let i = 0; i < numThreads; i++) {
            cluster.fork();
        }
        // Se um worker morrer, cria um novo
        cluster.on('exit', (worker, code, signal) => {
            console.log(`Worker ${worker.process.pid} morreu`);
            cluster.fork();
        });
    } else {
        let lastAttempt = loadLastAttempt();
        if (!lastAttempt) {
            console.log('Não foi possível carregar a última tentativa. Iniciando uma nova busca...');
        } else {
            console.log('Retomando a busca a partir da última tentativa:', lastAttempt);
        }

        while (true) {
            const privateKey = generateRandomPrivateKey();
            if (privateKey === lastAttempt) {
                console.log('Retomando a busca a partir do ponto salvo.');
                lastAttempt = null;
            }
            saveAttempt(privateKey);
            const publicKey = generatePublic(privateKey);
            if (wallets.includes(publicKey)) {
                console.log(`Chave privada encontrada: ${privateKey}`);
                console.log(`Chave pública correspondente: ${publicKey}`);
                process.exit();
            }
            if (!lastAttempt) {
                saveAttempt(privateKey);
            }
        }
    }
} else {
    console.log(`Worker ${process.pid} iniciado`);
}
