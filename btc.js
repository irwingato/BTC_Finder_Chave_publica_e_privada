import readline from 'readline';
import chalk from 'chalk';
import encontrarBitcoins from './bitcoin-find.js';
import ranges from './ranges.js';
import fs from 'fs';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
        const { min, max } = ranges[answer - 1];
        console.log('Carteira escolhida: ', chalk.cyan(answer), ' Min: ', chalk.yellow(min), ' Max: ', chalk.yellow(max));
        console.log('Número possível de chaves:', chalk.yellow(parseInt(BigInt(max) - BigInt(min)).toLocaleString('pt-BR')));

        rl.question(`Escolha uma opção (${chalk.cyan(1)} - Começar do início, ${chalk.cyan(2)} - Escolher uma porcentagem, ${chalk.cyan(3)} - Escolher mínimo): `, (answer2) => {
            if (parseInt(answer2) === 1) {
                encontrarBitcoins(min, max, answer)
                    .then(keysFound => {
                        if (keysFound.length > 0) {
                            console.log('Chaves encontradas:', keysFound);
                        } else {
                            console.log('Nenhuma chave encontrada.');
                        }
                        rl.close();
                    })
                    .catch(error => {
                        console.error('Erro ao encontrar chaves:', error);
                        rl.close();
                    });
            } else if (parseInt(answer2) === 2) {
                rl.question(`Digite a porcentagem de onde começar (0-100): `, (percentage) => {
                    const perc = parseFloat(percentage);
                    if (isNaN(perc) || perc < 0 || perc > 100) {
                        console.log(chalk.bgRed('Erro: você precisa escolher uma porcentagem entre 0 e 100'));
                        rl.close();
                        process.exit(1);
                    } else {
                        const newMin = BigInt(min) + (BigInt(max) - BigInt(min)) * BigInt(Math.round(perc * 100)) / 10000n;
                        encontrarBitcoins(newMin, max, answer)
                            .then(keysFound => {
                                if (keysFound.length > 0) {
                                    console.log('Chaves encontradas:', keysFound);
                                } else {
                                    console.log('Nenhuma chave encontrada.');
                                }
                                rl.close();
                            })
                            .catch(error => {
                                console.error('Erro ao encontrar chaves:', error);
                                rl.close();
                            });
                    }
                });
            }
            else if (parseInt(answer2) === 3) {
                rl.question(`Digite o valor mínimo hexadecimal: `, (hexMin) => {
                    const cleanedHexMin = hexMin.trim().replace(/^0x/i, ''); // Remove o prefixo "0x" e espaços em branco
                    const newMin = BigInt('0x' + cleanedHexMin);
                    if (newMin < BigInt(min) || newMin > BigInt(max)) {
                        console.log(chalk.bgRed(`Erro: o valor mínimo deve estar entre ${min} e ${max}`));
                        rl.close();
                        process.exit(1);
                    } else {
                        const percentageFromHex = ((newMin - BigInt(min)) * 100n) / (BigInt(max) - BigInt(min));
                        encontrarBitcoins(newMin, max, answer, parseFloat(percentageFromHex.toString()))
                            .then(keysFound => {
                                if (keysFound.length > 0) {
                                    console.log('Chaves encontradas:', keysFound);
                                } else {
                                    console.log('Nenhuma chave encontrada.');
                                }
                                rl.close();
                            })
                            .catch(error => {
                                console.error('Erro ao encontrar chaves:', error);
                                rl.close();
                            });
                    }
                });
            }
            else {
                console.log(chalk.bgRed('Erro: opção inválida.'));
                rl.close();
                process.exit(1);
            }
        });
    }
});
