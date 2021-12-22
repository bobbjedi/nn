import Player from './Player'
import { show, setVis, showWinner } from './show'

let nextStep: (0 | 1) = 0
export default class Game {
  isActive = true
  gameId: number
  player0: Player
  player1: Player
  board = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  nextStep: (0 | 1)
  isLog = false
  stepCount = 0

  constructor (player0: Player, player1: Player) {
    nextStep = nextStep === 1 ? 0 : 1
    this.nextStep = nextStep
    this.player0 = player0
    this.player1 = player1
    createCounter(0)
    createCounter(1)
    show()
  }

  async checkWinner () {
    if (!this.isActive) { return }
    const result = checkWinner(this.board)
    // const result = false
    if (result === false) {
      if (!this.board.some(c => c === 0.5)) {
        this.player0.upScore(5)
        this.player1.upScore(5)
        return this.isActive = false
      }
      return
    }
    this.isActive = false
    if (result === 0) {
      this.player0.upScore(10)
      this.player1.upScore(0)
      counters[0].wins++
      counters[1].lose++
    } else {
      this.player0.upScore(0)
      this.player1.upScore(10)
      counters[1].wins++
      counters[0].lose++
    }
    showWinner(result)
    this.player1.final()
    win_.isShow && await delay(3)
  }
  // run (inputs: number[], countReccurentInputs: number) {
  async step () {
    if (!this.isActive) { return }
    win_.isShow && await delay(.5)
    this.playerStep()
    this.stepCount++
    await this.checkWinner()
    this.nextStep = this.nextStep === 0 ? 1 : 0
  }

  playerStep () {
    const player = this[('player' + this.nextStep.toString() as 'player0')]
    let isOk = false
    let res = player.run(this.board)
    while (!isOk) {
      if (this.board[res] !== 0.5) {
        res = player.brain.rndActInsteadLast()
        counters[this.nextStep].fail++
      } else {
        counters[this.nextStep].ok++
        isOk = true
        setVis(res, this.nextStep)
      }
    }
    this.board[res] = this.nextStep
  }
}

const defaultCounter = {
  wins: 0,
  lose: 0,
  ok: 0,
  fail: 0
}
const delay = (t: number) => new Promise(r => setTimeout(r, t * 1000))
const counters: { [key: string]: typeof defaultCounter } = {}
const predCounters: typeof counters = {}
const createCounter = (id: string | number) => {
  counters[id] = counters[id] || { ...defaultCounter }
  predCounters[id] = { ...predCounters[id] } || { ...defaultCounter }
  return counters[id]
}

setInterval(() => {
  Object.keys(counters).forEach(id => {
    const counter = counters[id]
    // console.log('#' + id, counter, `Error: ${+(counter.fail / counter.ok).toFixed(5)} | Effect: ${+(counter.wins / counter.lose).toFixed(5)}`)
    console.log('#' + id, counter, `Error: ${+((counter.fail - predCounters[id].fail) / (counter.ok - predCounters[id].ok)).toFixed(5)} | Effect: ${+(counter.wins / counter.lose).toFixed(5)}`)
    predCounters[id] = { ...counters[id] }
  })
}, 10000)

const checkWinner = (board: Game['board']) => {
  if (winnecCombos.some(combo => {
    for (let cell of combo) {
      if (board[cell] !== 0) {
        return false
      }
    }
    return true
  }
  )) { return 0 }
  if (winnecCombos.some(combo => {
    for (let cell of combo) {
      if (board[cell] !== 1) {
        return false
      }
    }
    return true
  }
  )) { return 1 }
  return false
}

const winnecCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const win_ = (window as any)
win_.isShow = false
win_.toggleVis = () => win_.isShow = !win_.isShow