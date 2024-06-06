import CoinKey from 'coinkey';
import { parentPort, workerData } from 'worker_threads';

const { start, end, walletsArray } = workerData;
const walletsSet = new Set(walletsArray);

let stopSearching = false;
let current = BigInt(start);

function findKeyInRange(start, end) {
    for (let i = start; i <= end && !stopSearching; i++) {
        current = i;
        const pkey = i.toString(16).padStart(64, '0');
        const publicKey = generatePublic(pkey);

        if (walletsSet.has(publicKey)) {
            const foundKey = {
                privateKey: pkey,
                wif: generateWIF(pkey),
                current: current.toString()
            };
            parentPort.postMessage(foundKey);
            stopSearching = true;
            break;
        }
    }
    parentPort.postMessage({ status: 'completed', current: current.toString() });
}

findKeyInRange(BigInt(start), BigInt(end));

function generatePublic(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    _key.compressed = true;
    return _key.publicAddress;
}

function generateWIF(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return _key.privateWif;
}
