import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import chalk from 'chalk';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { cpus } from 'os';

const walletsSet = new Set(walletsArray);
const numWorkers = cpus().length;

function encontrarBitcoins(min, max) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const keysFound = [];
        let workersCompleted = 0;

        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('./worker.js');

            worker.on('message', (foundKey) => {
                if (foundKey) {
                    keysFound.push(foundKey);
                } else {
                    console.log('Nenhuma chave encontrada.');
                }
            });

            worker.on('exit', () => {
                workersCompleted++;

                if (workersCompleted === numWorkers) {
                    resolve(keysFound);
                }
            });

            const start = BigInt(min) + BigInt(i) * BigInt(Math.floor(Number((BigInt(max) - BigInt(min)) / BigInt(numWorkers))));
            const end = BigInt(min) + BigInt(i + 1) * BigInt(Math.floor(Number((BigInt(max) - BigInt(min)) / BigInt(numWorkers)))) - BigInt(1);
            worker.postMessage({ start, end, min, max });
        }
    });
}



async function generatePublic(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    _key.compressed = true;
    return _key.publicAddress;
}

async function generateWIF(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return _key.privateWif;
}

export default encontrarBitcoins;