import Player from './Player'
import Game, { set } from './Game'

let neataptic = (globalThis as any).neataptic
if (!neataptic) {
  // neataptic = require('../lib')
}
console.log('INFO', neataptic)

const inputSize = 9
const outputSize = 9
const popsize = 10000
const ITERATS = 200
const MUTATION_RATE = .3
const ELITISM_PERCENT = 30

const neat = new neataptic.Neat(
  inputSize,
  outputSize,
  null,
  {
    mutation: neataptic.methods.mutation.ALL,
    popsize,
    mutationRate: MUTATION_RATE,
    elitism: Math.round(popsize / 100 * ELITISM_PERCENT),
    network: new neataptic.architect.Random(inputSize, 20, 20, outputSize)
    // network: new neataptic.Architect.Perceptron(inputSize, inputSize * 2, outputSize)
  }
)

function startEvaluation() {
  const players: Player[] = []

  for (var genome of neat.population) {
    players.push(new Player(genome))
  }
  let i = 0
  while (i++ < 5) {
    // console.log(i)
    const games = players.map((p, i) => new Game(i, p))
    while (games.some(g => g.isActive)) {
      games.forEach(g => g.step())
    }
  }

  endEvaluation()
}

function endEvaluation() {
  neat.sort()
  const testGame = new Game(-1, new Player(neat.population[0]), true)
  // let s = 0
  while (testGame.isActive) {
    testGame.step()
    // console.log('step', s++, testGame.board)
  }
  const bestNN = neat.population.slice(0, 3).map((n: any) => n.toJSON())
  console.log('Generation:', neat.generation, '-best:', neat.getFittest().score, '-average:', neat.getAverage(), 'Set', set.length)
  // const newPopulation: any[] = bestNN.map((json: any) => neataptic.Network.fromJSON(json))
  const newPopulation: any[] = []
  // Elitism
  for (let i = 0; i < neat.elitism; i++) {
    newPopulation.push(neat.population[i])
  }

  // Breed the next individuals
  for (var i = 0; i < neat.popsize - neat.elitism; i++) {
    newPopulation.push(neat.getOffspring())
  }

  // Replace the old population with the new population
  neat.population = newPopulation
  neat.mutate()
  neat.population = neat.population.concat(bestNN.map((json: any) => neataptic.Network.fromJSON(json)))
  neat.generation++
}
const delay = () => new Promise(r => setTimeout(r, 10));

(async () => {
  // return
  let i = 0
  while (i++ < ITERATS) {
    await delay()
    startEvaluation()
  }
  console.log('SET:', set)
  // localStorage.setItem('set', JSON.stringify(set))
})()

// Game

var network = new neataptic.architect.Random(9, 10, 1);

// XOR dataset
(async () => {
  return
  // console.log(localStorage.getItem('set'))
  const data: number[][] = JSON.parse(localStorage.getItem('set'))
  const trainingSet = data.map(input => {
    return {
      output: [input.splice(-1)[0] / 8],
      input
    }
  })


  const config = {
    binaryThresh: 0.5,
    log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
    logPeriod: 100, 
    hiddenLayers: [3], // array of ints for the sizes of the hidden layers in the network
    activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu',
    callback(){
        let isTrue = 0
        let isErr = 0
        trainingSet.forEach(s=>{
          const res = Math.round(network.activate(s.input)[0] * 8)
          console.log(res)
          if(s.input[res] === 0.5){
            isTrue++
          } else {
            isErr++
          }
        })
        console.log({isErr, isTrue})

    }, // a periodic call back that can be triggered while training --> null or function
    callbackPeriod: 10, // 
  };
  
  // create a simple feed forward neural network with backpropagation
  const net = new (window as any).brain.NeuralNetwork(config);
  
  net.train([
    { input: [0, 0], output: [0] },
    { input: [0, 1], output: [1] },
    { input: [1, 0], output: [1] },
    { input: [1, 1], output: [0] },
  ]);
  
  const output = net.run([1, 0]); // [0.987]


  // console.log(trainingSet)
return
  console.log('Traning:', await network.train(trainingSet, {
    // mutation: neataptic.methods.mutation.FFW,
    // equal: true,
    // elitism: 5,
    error: 0.0001,
    rate: 0.2,
    log: 100,
    schedule: {
      function() {
        let isTrue = 0
        let isErr = 0
        trainingSet.forEach(s=>{
          const res = Math.round(network.activate(s.input)[0] * 8)
          if(s.input[res] === 0.5){
            isTrue++
          } else {
            isErr++
          }
        })
        console.log({isErr, isTrue})
      },
      iterations: 100
    },
    mutationRate: 0.5
  }));


  //  console.log(network.activate([0, 0])); // 0.2413
  //  console.log(network.activate([0, 1])); // 1.0000
  //  console.log(network.activate([1, 0])); // 0.7663
  //  console.log( network.activate([1, 1])); // -0.008
})()
