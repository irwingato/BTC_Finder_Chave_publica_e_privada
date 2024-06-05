import { Worker } from 'worker_threads';
import { cpus } from 'os';
import ranges from './ranges.js';
import walletsArray from './wallets.js';

const numWorkers = cpus().length;

function encontrarBitcoins(min, max) {
    return new Promise((resolve, reject) => {
        const keysFound = [];
        const range = BigInt(max) - BigInt(min);
        const step = range / BigInt(numWorkers);
        let workersCompleted = 0;
        const workers = [];
        const writeWorker = new Worker('./writeWorker.js');

        for (let i = 0; i < numWorkers; i++) {
            const workerMin = BigInt(min) + BigInt(i) * step;
            const workerMax = (i === numWorkers - 1) ? BigInt(max) : (workerMin + step - BigInt(1));

            const worker = new Worker('./worker.js', {
                workerData: { start: workerMin.toString(), end: workerMax.toString(), walletsArray }
            });

            worker.on('message', (foundKey) => {
                if (foundKey) {
                    keysFound.push(foundKey);
                    writeWorker.postMessage(foundKey);
                }
            });

            worker.on('exit', () => {
                workersCompleted++;
                if (workersCompleted === numWorkers) {
                    writeWorker.terminate();
                    resolve(keysFound);
                }
            });

            worker.on('error', (error) => {
                console.error('Erro no worker:', error);
                workers.forEach(w => w.terminate());
                writeWorker.terminate();
                reject(error);
            });

            workers.push(worker);
        }

        process.on('SIGINT', () => {
            console.log('Bye Bye até mais tarde (Ctrl+C)');
            workers.forEach(w => w.terminate());
            writeWorker.terminate();
            process.exit();
        });
    });
}

export default encontrarBitcoins;