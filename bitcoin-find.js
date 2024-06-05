import { Worker } from 'worker_threads';
import { cpus } from 'os';
import fs from 'fs';
import ranges from './ranges.js';
import walletsArray from './wallets.js';

const numWorkers = cpus().length;

function encontrarBitcoins(min, max, walletNumber, startPercentage = 0, startMinHex = null) {
    return new Promise((resolve, reject) => {
        const keysFound = [];
        const range = BigInt(max) - BigInt(min);
        const step = range / BigInt(numWorkers);
        let workersCompleted = 0;
        const workers = [];
        const writeWorker = new Worker('./writeWorker.js');

        let actualMin = startMinHex ? BigInt(startMinHex) : BigInt(min);

        const saveProgress = () => {
            const highestProgress = workers.reduce((acc, worker) => {
                return worker.workerData && BigInt(worker.workerData.current) > acc ? BigInt(worker.workerData.current) : acc;
            }, BigInt(actualMin));
        
            const percentage = ((highestProgress - BigInt(min)) * 100n / range);
            const formattedPercentage = parseFloat(percentage.toString()).toFixed(2);

        
            const progress = {
                walletNumber,
                min: min.toString(),
                max: max.toString(),
                current: highestProgress.toString(),
                percentage: `${formattedPercentage}%`
            };
        
            fs.writeFileSync(`parada-carteira-${walletNumber}.json`, JSON.stringify(progress, null, 2));
            console.log(`Progresso salvo em parada-carteira-${walletNumber}.json`);
        };
        
        for (let i = 0; i < numWorkers; i++) {
            const workerMin = actualMin + BigInt(i) * step;
            const workerMax = (i === numWorkers - 1) ? BigInt(max) : (workerMin + step - 1n);

            const worker = new Worker('./worker.js', {
                workerData: { start: workerMin.toString(), end: workerMax.toString(), walletsArray }
            });

            worker.on('message', (foundKey) => {
                if (foundKey) {
                    keysFound.push(foundKey);
                    writeWorker.postMessage(foundKey);
                    workers.forEach(w => w.terminate());
                    writeWorker.terminate();
                    resolve(keysFound);
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
            console.log('Interrupção detectada (Ctrl+C). Salvando progresso...');
            workers.forEach(w => w.terminate());
            writeWorker.terminate();
            saveProgress();
            process.exit();
        });

        setInterval(saveProgress, 60000); // Salva o progresso a cada minuto
    });
}

export default encontrarBitcoins;
