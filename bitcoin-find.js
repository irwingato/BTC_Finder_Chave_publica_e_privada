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

        let actualMin;
        if (startMinHex) {
            actualMin = BigInt(startMinHex);
        } else if (startPercentage) {
            actualMin = BigInt(min) + (range * BigInt(Math.round(startPercentage * 100))) / 10000n;
        } else {
            actualMin = BigInt(min);
        }

        const saveProgress = (currentAddress) => {
            const progress = {
                walletNumber,
                minAddress: min.toString(16),
                maxAddress: max.toString(16),
                currentAddress: currentAddress.toString(16),
                percentage: calculatePercentage(min, max, currentAddress)
            };
        
            fs.writeFileSync(`progress-carteira-${walletNumber}.json`, JSON.stringify(progress, null, 2));
            console.log(`Progresso salvo em progress-carteira-${walletNumber}.json`);
        };

        const handleSIGINT = () => {
            console.log('Interrupção detectada (Ctrl+C). Salvando progresso...');
            saveProgress(actualMin);
            process.exit();
        };

        process.on('SIGINT', handleSIGINT);

        const calculatePercentage = (min, max, current) => {
            const percentage = parseFloat(((current - min) * 100n / range).toString()).toFixed(2);
            const remainingPercentage = parseFloat((100 - parseFloat(percentage)).toString()).toFixed(2);
            return `${percentage}% concluído. ${remainingPercentage}% restante.`;
        };

        for (let i = 0; i < numWorkers; i++) {
            const workerMin = actualMin + BigInt(i) * step;
            const workerMax = (i === numWorkers - 1) ? BigInt(max) : (workerMin + step - 1n);

            const worker = new Worker('./worker.js', {
                workerData: { start: workerMin.toString(), end: workerMax.toString(), walletsArray }
            });

            worker.on('message', (message) => {
                if (message.privateKey) {
                    keysFound.push(message);
                    writeWorker.postMessage(message);
                    workers.forEach(w => w.terminate());
                    writeWorker.terminate();
                    resolve(keysFound);
                } else if (message.status === 'progress_saved') {
                    console.log('Progresso salvo.');
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

        const getCurrentAddress = () => {
            const lastWorker = workers[workers.length - 1];
            const currentAddress = lastWorker && lastWorker.workerData && lastWorker.workerData.current;
            return currentAddress || actualMin;
        };

        saveProgress(getCurrentAddress());
        setInterval(() => saveProgress(getCurrentAddress()), 60000); // Atualiza o progresso a cada minuto
    });
}

export default encontrarBitcoins;
