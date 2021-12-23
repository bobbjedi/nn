// const neataptic = (window as any).neataptic
// console.log('INFO', neataptic)

// const dataSet = [
//     { input: [0, 0], output: [0] },
//     { input: [0, 1], output: [1] },
//     { input: [1, 0], output: [1] },
//     { input: [1, 1], output: [0] }
// ]

// const inputSize = 2
// const outputSize = 1
// const popsize = 100
// const MUTATION_RATE = .3
// const ELITISM_PERCENT = 10

// const neat = new neataptic.Neat(
//     inputSize,
//     outputSize,
//     {
//         mutation: neataptic.methods.mutation.ALL,
//         popsize,
//         mutationRate: MUTATION_RATE,
//         elitism: Math.round(ELITISM_PERCENT * popsize),
//         network: new neataptic.architect.Random(inputSize, 6, outputSize)
//     }
// );


// class Player {
//     score = 0
//     brain: any
//     constructor(brain) {
//         this.brain = brain;
//         this.brain.score = 0;
//     }
//     run(input: number[]): number[] {
//         return this.brain.activate(input)
//     }
//     upScore(score: number) {
//         this.score += score
//         this.brain.score += score
//     }
// }

// function startEvaluation() {
//     const players: Player[] = [];

//     for (var genome of neat.population) {
//         players.push(new Player(genome))
//     }
//     dataSet.forEach(s => {
//         players.forEach(p => {
//             const res = p.run(s.input)[0]
//             if (Math.abs(res - s.output[0]) < 0.1) {
//                 p.upScore(1)
//             }
//         })
//     })
//     endEvaluation()
// }

// function endEvaluation() {
//     neat.sort();
//     const bestNN = neat.population.slice(0, 3).map(n => n.toJSON())
//     console.log('Generation:', neat.generation, '-best:', neat.getFittest().score, '-average:', neat.getAverage());
//     const newPopulation: any[] = bestNN.map(json => neataptic.Network.fromJSON(json));
//     // const newPopulation: any[] = [];
//     // Elitism
//     for (let i = 0; i < neat.elitism; i++) {
//         newPopulation.push(neat.population[i]);
//     }

//     // Breed the next individuals
//     for (var i = 0; i < neat.popsize - neat.elitism; i++) {
//         newPopulation.push(neat.getOffspring());
//     }

//     // Replace the old population with the new population
//     neat.population = newPopulation;
//     neat.mutate();

//     neat.generation++;
//     // startEvaluation();
// }

// let i = 0
// while (i++ < 50)
//     startEvaluation()
