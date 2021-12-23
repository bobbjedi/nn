import getBestMove from './board'
// import ndarray from 'ndarray'
const win_: any = window
win_.stepsNumMinimax = 3

export default class Player {
  brain: any
  isCPU: boolean
  private predStepReward = 0
  private stepsNum = 0
  constructor (brain: any, isCPU: boolean) {
    this.brain = brain
    this.isCPU = isCPU
    this.stepsNum = 0
  }
  finalEpisode (rewards: number) {
    if (this.isCPU) { return }
    if (this.brain.closeEpisode) {
      this.brain.closeEpisode(rewards)
    } else {
      this.brain.learn(rewards)
    }
    // if(!this.brain.step) return
    // this.brain.step(ndarray([0, 0, 0, 0, 0, 0, 0, 0, 0]), this.predStepReward, true)
    // this.brain.learn()
  }
  resetStepsNum () {
    this.stepsNum = 0
  }

  run (input: number[], isRnd = false): number {
    if (this.isCPU) {
      const act = this.stepsNum > win_.stepsNumMinimax ? minimaxStep(input) : rndStep(input)
      // const act = Math.random() > 0.3 ? rndStep(input) : minimaxStep(input)
      this.stepsNum++
      return act
    } else if (this.brain.isNew) {
      // const res = this.brain.step(ndarray(input), this.predStepReward, false)
      // return res
    }
    return isRnd ? rndStep(input) : this.brain.act(input)
  }
  learn (reward: number) {
    if (this.isCPU) { return }
    this.brain.learn(reward)
  }
}
const rndStep = (board: number[]) => {
  // console.log('rrnd')
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
  // console.log('mmmm')
  // console.log('CPU CHECK', JSON.stringify(board))
  return getBestMove(board.map(c => {
    if (c === 1) { return 'x' }
    if (c === 0) { return 'o' }
    return ''
  }))
}

// setInterval(() => console.log('Average score:', +(scores / countPays).toFixed(2)), 10000)