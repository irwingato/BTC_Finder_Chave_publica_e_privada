const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const CoinKey = require('coinkey');
const os = require('os');
const crypto = require('crypto');
const path = require('path');

const wallets = ['1AWCLZAjKbV1P7AHvaPNCKiB7ZWVDMxFiz'];
const numCPUs = os.cpus().length;
const numThreads = Math.min(4, numCPUs); // Use no máximo 4 threads, ou o número de CPUs disponíveis, o que for menor

const min = BigInt('0x2a90675934c000000');
const max = BigInt('0x3ffffffffffffffff');

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

function saveAttempt(privateKey, attemptNumber) {
    const logDir = 'attempts';
    const logFile = path.join(logDir, `attempts_${attemptNumber}.txt`);

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    fs.appendFileSync(logFile, `${privateKey}\n`);
}

function loadLastAttempt() {
    try {
        const attemptsDir = 'attempts';
        const attemptFiles = fs.readdirSync(attemptsDir);
        const lastAttemptFile = attemptFiles.pop(); // Último arquivo é o mais recente

        if (!lastAttemptFile) {
            console.log('Nenhum arquivo de tentativa encontrado.');
            return null;
        }

        const lastAttemptFilePath = path.join(attemptsDir, lastAttemptFile);
        const lastAttemptContent = fs.readFileSync(lastAttemptFilePath, 'utf8').trim();
        const lastAttemptLines = lastAttemptContent.split('\n');

        return lastAttemptLines[lastAttemptLines.length - 1];
    } catch (err) {
        console.error('Erro ao carregar a última tentativa:', err.message);
        return null;
    }
}

function createWorker(start, end, lastAttempt) {
    return new Worker(__filename, {
        workerData: { start, end, wallets, lastAttempt }
    });
}

function getRandomBigInt(min, max) {
    const range = max - min;
    const randomOffset = BigInt(Math.floor(Math.random() * Number(range)));
    return min + randomOffset;
}

if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

if (!fs.existsSync('attempts.txt')) {
    fs.writeFileSync('attempts.txt', '');
}

if (isMainThread) {
    console.log(`Master ${process.pid} is running`);

    let lastAttempt = loadLastAttempt();
    if (!lastAttempt) {
        console.log('Não foi possível carregar a última tentativa. Iniciando uma nova busca...');
    } else {
        console.log('Retomando a busca a partir da última tentativa:', lastAttempt);
    }

    const range = (max - min) / BigInt(numThreads);
    const startWorkers = () => {
        for (let i = 0; i < numThreads; i++) {
            const start = min + BigInt(i) * range;
            const end = (i === numThreads - 1) ? max : start + range - BigInt(1);
            const worker = createWorker(start, end, lastAttempt);

            worker.on('message', (message) => {
                if (message.found) {
                    console.log(`Chave privada encontrada: ${message.privateKey}`);
                    console.log(`Chave pública correspondente: ${message.publicKey}`);
                    process.exit();
                }
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                    // Restart the worker
                    const newWorker = createWorker(start, end, lastAttempt);
                    newWorker.on('message', (message) => {
                        if (message.found) {
                            console.log(`Chave privada encontrada: ${message.privateKey}`);
                            console.log(`Chave pública correspondente: ${message.publicKey}`);
                            process.exit();
                        }
                    });
                }
            });
        }
    };

    startWorkers();
} else {
    const { start, end, wallets, lastAttempt } = workerData;

    console.log(`Worker ${process.pid} started`);

    (async () => {
        const increment = BigInt(1);
        const walletSet = new Set(wallets);

        let key = lastAttempt ? BigInt('0x' + lastAttempt) + increment : start;
        let attemptNumber = 0;
        while (true) {
            let randomKey = getRandomBigInt(start, end);
            const privateKey = randomKey.toString(16).padStart(64, '0');
            saveAttempt(privateKey, attemptNumber);

            const publicKey = generatePublic(privateKey);
            if (walletSet.has(publicKey)) {
                parentPort.postMessage({ found: true, privateKey, publicKey });
                return;
            }

            attemptNumber++;
        }
    })();
}
