import ranges from './ranges.js';
import { Worker } from 'worker_threads';
import readline from 'readline';
import chalk from 'chalk';
import os from 'os';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let min, max = 0;

console.clear();

console.log("\x1b[38;2;250;128;114m" + "╔════════════════════════════════════════════════════════╗\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "   ____ _____ ____   _____ ___ _   _ ____  _____ ____   " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "  | __ )_   _/ ___| |  ___|_ _| \\ | |  _ \\| ____|  _ \\  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "  |  _ \\ | || |     | |_   | ||  \\| | | | |  _| | |_) | " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "  | |_) || || |___  |  _|  | || |\\  | |_| | |___|  _ <  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "  |____/ |_| \\____| |_|   |___|_| \\_|____/|_____|_| \\_\\ " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "║" + "\x1b[0m" + "\x1b[36m" + "                                                        " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
    "╚════════════════════════════════════════════════════════╝\x1b[0m" + '\n');

rl.question(`Escolha uma carteira puzzle (${chalk.cyan(1)} - ${chalk.cyan(160)}): `, (answer) => {
    if (parseInt(answer) < 1 || parseInt(answer) > 160) {
        console.log(chalk.bgRed('Erro: você precisa escolher um número entre 1 e 160'));
        rl.close();
        process.exit(1);
    } else {
        min = ranges[answer - 1].min;
        max = ranges[answer - 1].max;
        console.log('Carteira escolhida: ', chalk.cyan(answer), ' Min: ', chalk.yellow(min), ' Max: ', chalk.yellow(max));
        console.log('Número possível de chaves:', chalk.yellow(parseInt(BigInt(max) - BigInt(min)).toLocaleString('pt-BR')));

        rl.question(`Escolha uma opção (${chalk.cyan(1)} - Começar do início, ${chalk.cyan(2)} - Escolher uma porcentagem, ${chalk.cyan(3)} - Escolher mínimo): `, (answer2) => {
            if (answer2 == '2') {
                rl.question('Escolha um número entre 0 e 1: ', (answer3) => {
                    if (parseFloat(answer3) > 1 || parseFloat(answer3) < 0) {
                        console.log(chalk.bgRed('Erro: você precisa escolher um número entre 0 e 1'));
                        rl.close();
                        process.exit(1);
                    }

                    const range = BigInt(max) - BigInt(min);
                    const percentualRange = range * BigInt(Math.floor(parseFloat(answer3) * 1e18)) / BigInt(1e18);
                    min = BigInt(min) + BigInt(percentualRange);
                    console.log('Começando em: ', chalk.yellow('0x' + min.toString(16)));
                    startFindingKeys(min, BigInt(max));
                });
            } else if (answer2 == '3') {
                rl.question('Entre o mínimo: ', (answer3) => {
                    min = BigInt(answer3);
                    console.log('Começando em: ', chalk.yellow('0x' + min.toString(16)));
                    startFindingKeys(min, BigInt(max));
                });
            } else {
                min = BigInt(min);
                startFindingKeys(min, BigInt(max));
            }
        });
    }
});

function startFindingKeys(min, max) {
    const numCPUs = os.cpus().length;
    const range = max - min;

    let workers = [];
    let foundKey = null;

    for (let i = 0; i < numCPUs; i++) {
        // Each worker starts at a random position within the range
        const workerMin = min + BigInt(Math.floor(Number(range) * Math.random()));
        const workerMax = max;

        const worker = new Worker('./worker.js', {
            workerData: { min: workerMin.toString(), max: workerMax.toString() }
        });

        worker.on('message', (message) => {
            if (message) {
                foundKey = message;
                console.log('Chave encontrada:', foundKey.privateKey);
                console.log('WIF:', foundKey.wif);

                workers.forEach(w => w.terminate());
                rl.close();
                process.exit();
            }
        });

        worker.on('error', (error) => {
            console.error('Erro no worker:', error);
            rl.close();
            process.exit(1);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.log(`Worker parado com código de saída ${code}`);
            }

            if (!foundKey && workers.every(w => w.threadId === undefined)) {
                console.log('Nenhuma chave encontrada.');
                rl.close();
                process.exit();
            }
        });

        workers.push(worker);
    }

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\nEncerrando graciosamente a partir do SIGINT (Ctrl+C)'));
        workers.forEach(w => w.terminate());
        rl.close();
        process.exit();
    });
}