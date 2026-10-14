// Situações curtas; os mesmos operandos alimentam o texto, a resposta e a dica.
const everydayProblems = {
    '+': [
        (a, b) => `Lia tinha ${a} figurinhas e ganhou mais ${b}. Quantas figurinhas ela tem agora?`,
        (a, b) => `Na estante da sala havia ${a} livros. A turma colocou mais ${b}. Quantos livros há na estante agora?`,
        (a, b) => `No recreio, ${a} crianças estavam brincando. Chegaram mais ${b} para brincar. Quantas crianças estão brincando agora?`,
        (a, b) => `Na caixa havia ${a} peças de montar. Bia guardou mais ${b} peças nela. Quantas peças há na caixa agora?`
    ],
    '-': [
        (a, b) => `Caio tinha ${a} figurinhas e deu ${b} para uma amiga. Com quantas figurinhas ele ficou?`,
        (a, b) => `Na biblioteca havia ${a} livros na mesa. A turma guardou ${b} na estante. Quantos livros ficaram na mesa?`,
        (a, b) => `Havia ${a} folhas para desenhar. A turma usou ${b}. Quantas folhas ainda podem ser usadas?`,
        (a, b) => `Bia tinha ${a} peças na caixa e tirou ${b} para brincar. Quantas peças ficaram na caixa?`
    ],
    '×': [
        (a, b) => `Lia abriu ${a} pacotes de figurinhas. Cada pacote tinha ${b} figurinhas. Quantas figurinhas havia ao todo?`,
        (a, b) => `A turma organizou ${a} caixas com ${b} lápis em cada uma. Quantos lápis foram guardados ao todo?`,
        (a, b) => `Caio desenhou ${a} flores com ${b} pétalas em cada flor. Quantas pétalas ele desenhou ao todo?`,
        (a, b) => `Bia montou ${a} torres com ${b} peças em cada torre. Quantas peças ela usou ao todo?`
    ],
    '÷': [
        (a, b) => `Lia dividiu ${a} figurinhas igualmente entre ${b} envelopes, sem sobrar nenhuma. Quantas figurinhas ficaram em cada envelope?`,
        (a, b) => `A turma guardou ${a} lápis em ${b} caixas, com a mesma quantidade em cada caixa e sem sobras. Quantos lápis ficaram em cada caixa?`,
        (a, b) => `Caio repartiu ${a} cartas igualmente entre ${b} jogadores, sem sobrar nenhuma. Quantas cartas cada jogador recebeu?`,
        (a, b) => `Bia separou ${a} peças em ${b} grupos iguais, sem sobrar nenhuma. Quantas peças ficaram em cada grupo?`
    ]
};

function createEverydayProblem(operation, a, b, index) {
    const models = everydayProblems[operation];
    const selected = Number.isInteger(index) ? index % models.length : Math.floor(Math.random() * models.length);
    return models[selected](a, b);
}
