import CoinKey from 'coinkey';
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';

const { start, end } = workerData;
const walletsSet = new Set(workerData.walletsArray);

let stopSearching = false;

function binarySearch(min, max) {
    while (min <= max && !stopSearching) {
        const mid = (min + max) / BigInt(2);
        const pkey = mid.toString(16).padStart(64, '0');
        const publicKey = generatePublic(pkey);

        if (walletsSet.has(publicKey)) {
            const foundKey = {
                privateKey: pkey,
                wif: generateWIF(pkey)
            };
            parentPort.postMessage(foundKey);
            stopSearching = true;
            saveFoundKey(foundKey);
            break;
        } else if (mid < max) {
            min = mid + BigInt(1);
        } else {
            max = mid - BigInt(1);
        }
    }
}

function saveFoundKey(foundKey) {
    if (foundKey) {
        console.log('Chave encontrada:', foundKey.privateKey);
        console.log('WIF:', foundKey.wif);
        try {
            fs.appendFileSync('keys.txt', `Chave encontrada: ${foundKey.privateKey}, WIF: ${foundKey.wif}\n`);
        } catch (err) {
            console.error('Erro ao salvar a chave encontrada:', err);
        }
    }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('Bye Bye até mais tarde SIGINT (Ctrl+C)');
    process.exit();
});

binarySearch(BigInt(start), BigInt(end));

function generatePublic(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    _key.compressed = true;
    return _key.publicAddress;
}

function generateWIF(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return _key.privateWif;
}
