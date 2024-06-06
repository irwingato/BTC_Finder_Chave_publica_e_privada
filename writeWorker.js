import { parentPort } from 'worker_threads';
import fs from 'fs';

parentPort.on('message', (message) => {
    if (message.privateKey) {
        try {
            fs.appendFileSync('keys.txt', `Chave encontrada: ${message.privateKey}, WIF: ${message.wif}\n`);
            parentPort.postMessage({ status: 'success' });
        } catch (err) {
            console.error('Erro ao salvar a chave encontrada:', err);
            parentPort.postMessage({ status: 'error', error: err });
        }
    } else if (message.status === 'completed') {
        try {
            const progress = {
                current: message.current
            };
            fs.writeFileSync('progress.json', JSON.stringify(progress, null, 2));
            parentPort.postMessage({ status: 'progress_saved' });
        } catch (err) {
            console.error('Erro ao salvar o progresso:', err);
            parentPort.postMessage({ status: 'error', error: err });
        }
    }
});
