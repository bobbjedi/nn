import getBestMove from './board'
import DQL from './DQL'
// import ndarray from 'ndarray'

export default class Player {
  brain: DQL
  isCPU: boolean
  private stepsNum = 0
  constructor (brain: any, isCPU: boolean) {
    this.brain = brain
    this.isCPU = isCPU
  }
  final () {
    // if(!this.brain.step) return
    // this.brain.step(ndarray([0, 0, 0, 0, 0, 0, 0, 0, 0]), this.predStepReward, true)
    // this.brain.learn()
  }

  run (input: number[], isRnd = false): number {
    if (this.isCPU) {
      // const act = this.stepsNum > 3 ? minimaxStep(input) : rndStep(input)
      const act = rndStep(input)
      this.stepsNum++
      return act
    }
    return isRnd ? rndStep(input) : this.brain.act(input)
  }
  upScore (reward: number) {
    if (this.isCPU) { return }
    countPays++
    scores += reward
    this.brain.closeEpisode(reward)
  }
}
let scores = 0
let countPays = 0

const rndStep = (board: number[]) => {
  // console.log('RND CHECK', JSON.stringify(board))
  const filledNums: number[] = []
  board.forEach((c, i) => c === 0.5 && filledNums.push(i))
  // console.log(filledNums)
  return filledNums[rnd(0, filledNums.length - 1)]
}
function rnd (min: number, max: number) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const minimaxStep = (board: number[]) => {
  // console.log('CPU CHECK', JSON.stringify(board))
  return getBestMove(board.map(c => {
    if (c === 1) { return 'x' }
    if (c === 0) { return 'o' }
    return ''
  }))
}

setInterval(() => console.log('Average score:', +(scores / countPays).toFixed(2)), 10000)