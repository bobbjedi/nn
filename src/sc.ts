import { Agent } from './Agent'

const neataptic = (window as any).neataptic
const inputSize = 152
const outputSize = 4
// const popsize = 100
const MUTATION_RATE = .3
const ELITISM_PERCENT = 30

export default (agents: Agent[]) => {
  const neat = new neataptic.Neat(
    inputSize,
    outputSize,
    null,
    {
    //   mutation: neataptic.methods.mutation.FFW,
      mutation: neataptic.methods.mutation.ALL,
      popsize: agents.length,
      mutationRate: MUTATION_RATE,
      elitism: Math.round(agents.length / 100 * ELITISM_PERCENT),
      //   network: new neataptic.architect.Random(inputSize, 100, outputSize)
      network: new neataptic.architect.Perceptron(inputSize, 100, outputSize)
    }
  )
  function startEvaluation () {
    neat.mutate()
    // console.log(agents)
    for (let i in neat.population as any[]) {
      agents[i].brain = neat.population[i]
      agents[i].resetPos()
      neat.population[i].score = 0
      neat.population[i].act = (input: number[]) => {
        return softMax(neat.population[i].activate(input))
      }
    }

    setTimeout(endEvaluation, iteratInterval * 1000)
  }

  function endEvaluation () {
    neat.sort()
    // const bestNN = neat.population.slice(0, 3).map((n: any) => n.toJSON())
    console.log('G', neat.generation, neat.population[0].score)
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
    // neat.population = neat.population[] = (bestNN.map((json: any) => neataptic.Network.fromJSON(json)))
    neat.generation++
    startEvaluation()
  }
  return {
    neat,
    startEvaluation
  }
}

const softMax = (arr: number[]) => {
  let maxIndex = 0
  arr.forEach((res, i) => {
    if (res > arr[maxIndex]) {
      maxIndex = i
    }
  })
  return maxIndex
}

(window as any).iteratInterval = 15