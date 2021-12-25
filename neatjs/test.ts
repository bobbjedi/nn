import NEAT from '../neatjs/NEAT'
import activation from '../neatjs/ActivationFunction'
import mutate from '../neatjs/Mutate'
import crossover from '../neatjs/Crossover'

const set = [
  { input: [0, 0], output: [0] },
  { input: [1, 0], output: [1] },
  { input: [0, 1], output: [1] },
  { input: [1, 1], output: [0] },
]

let config = {
  model: [
    { nodeCount: 2, type: 'input' },
    { nodeCount: 6, type: 'hidden', activationfunc: activation.RELU },
    { nodeCount: 1, type: 'output', activationfunc: activation.RELU }
  ],
  mutationRate: 0.1,
  crossoverMethod: crossover.RANDOM,
  mutationMethod: mutate.RANDOM,
  populationSize: 1000
}

const neat = new NEAT(config)

let i = 0
while (i++ < 50) {
  neat.doGen()
  neat.creatures.forEach(c => {
    set.forEach(s => {
      const res = c.run(s.input)[0]
      // console.log('RES', res)
      if (Math.abs(res - s.output[0]) < 0.1) {
        c.score++
      } else {
        c.score--
      }
    })
  })
  // console.log(neat.creatures.map(c => c.score).sort((a, b) => b - a))
}
set.forEach(s => {
  console.log(s.output[0], neat.creatures[neat.bestCreature()].run(s.input)[0])
})