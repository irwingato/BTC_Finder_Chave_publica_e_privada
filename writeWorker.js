import { parentPort } from 'worker_threads';
import fs from 'fs';

parentPort.on('message', (foundKey) => {
    if (foundKey) {
        try {
            fs.appendFileSync('keys.txt', `Chave encontrada: ${foundKey.privateKey}, WIF: ${foundKey.wif}\n`);
            parentPort.postMessage({ status: 'success' });
        } catch (err) {
            console.error('Erro ao salvar a chave encontrada:', err);
            parentPort.postMessage({ status: 'error', error: err });
        }
    }
});
