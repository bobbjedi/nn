import { Agent } from './Agent'

const inputSize = 152
const outputSize = 4

export default (agents: Agent[]) => {
  // var opt = {
  //   input: inputSize,
  //   output: outputSize,
  //   population_size: agents.length,
  //   mutation_size: 0.5,
  //   mutation_rate: 0.5,
  //   init_weight_magnitude: 0.1,
  //   elite_percentage: 0.30
  // }

  // const neat = new (window as any).convNE(opt)

  function startEvaluation () {
    // neat.startEvolve()
    // for (let i in neat.genes as any[]) {
    //   agents[i].brain = neat.genes[i]
    //   agents[i].resetPos()
    //   neat.genes[i].score = 0
    //   neat.genes[i].act = (input: number[]) => {
    //     const out = Array.from(neat.genes[i].forward(neat.arrayToVector(input)).w) as number[]
    //     return softMax(out)
    //   }
    // }
    // setTimeout(endEvaluation, (window as any).iteratInterval * 1000)
  }

  function endEvaluation () {
    // neat.stopEvolve()
    // startEvaluation()
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