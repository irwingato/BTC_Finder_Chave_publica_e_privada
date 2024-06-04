import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import { workerData } from 'worker_threads';
import fs from 'fs';

const { min, max } = workerData;

let foundKey = null;
let stopSearching = false;
const walletsSet = new Set(walletsArray);

function findKeyInRange(start, end) {
    if (start > end || stopSearching) return;

    const mid = (start + end) / BigInt(2);
    const pkey = mid.toString(16).padStart(64, '0');
    const publicKey = generatePublic(pkey);

    if (walletsSet.has(publicKey)) {
        foundKey = {
            privateKey: pkey,
            wif: generateWIF(pkey)
        };
        stopSearching = true; // Para de procurar quando a chave é encontrada
        saveFoundKey(); // Salva a chave encontrada
        return;
    }

    if (mid === end) return;

    findKeyInRange(start, mid - BigInt(1)); // Procura no intervalor da metade esquerda
    findKeyInRange(mid + BigInt(1), end); // Procura no intervalo da metade direita
}

function saveFoundKey() {
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
    saveFoundKey(); // Save the found key if any
    process.exit();
});

findKeyInRange(BigInt(min), BigInt(max));

function generatePublic(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    _key.compressed = true;
    return _key.publicAddress;
}

function generateWIF(privateKey) {
    let _key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return _key.privateWif;
}