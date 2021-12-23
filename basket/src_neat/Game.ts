import getBestMove from './board'

import Player from './Player'
export default class Game {
  isActive = true
  gameId: number
  player0: Player | 'H'
  board = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  // board = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  nextStep: (0 | 1) = 0
  isLog = false
  stepCount = 0
  // predReccurentOutputs = []

  constructor (gameId: number, player0: Game['player0'], isLog = false) {
    this.gameId = gameId
    this.player0 = player0
    this.isLog = isLog
  }

  checkWinner () {
    if (!this.isActive) { return }
    const result = checkWinner(this.board)
    // const result = false
    if (result === false) {
      if (!this.board.some(c => c === 0.5)) {
        this.isLog && console.log('EQUAL BOARD')
        this.player0 !== 'H' && this.player0.upScore(2)
        // TODO: score +за ничью
        return this.isActive = false
      }
      return
    }
    this.isActive = false
    if (this.player0 === 'H') {
      return
    }
    if (result === 0) {
      this.player0.upScore(-1)
      // this.isLog && console.log('CPU WIN', this.board)
      this.isLog && console.log('CPU WIN')
    } else {
      this.player0.upScore(5)
      this.isLog && console.log('>>>>>>>>>>>>>>.WINNER!!')
      // this.isLog && console.log('WINNER!!', result, this.board)
    }
    // LOGIC FINAL and scores!
    // console.log('STOP GAME', this.gameId, this.board)
  }

  cpuStep () {
    // return rndStep(this.board)
    return this.stepCount >= 4 ? minimaxStep(this.board) : rndStep(this.board)
    // return minimaxStep(this.board)
  }
  // run (inputs: number[], countReccurentInputs: number) {
  step () {
    if (!this.isActive) { return }
    this.stepCount++
    if (this.nextStep === 0) { // CPU step
      this.board[this.cpuStep()] = 0
    } else {
      if (this.player0 === 'H') {
        console.log('HANDLE:')
      } else {
        const res = this.player0.run(this.board)
        // console.log(this.gameId, 'NN STEP:', this.board, res)
        if (this.board[res] !== 0.5) {
          this.isLog && console.log('ERROR! ALREADY SETTED!')
          this.player0.upScore(-10)
          return this.isActive = false
        }
        this.player0.upScore(1)
        this.board[res] = 1
      }
    }
    this.nextStep = this.nextStep === 0 ? 1 : 0
    this.checkWinner()
  }
  step_prep_set() {
    if (!this.isActive) { return }
    this.stepCount++
    if (this.nextStep === 0) { // CPU step
      const r = this.cpuStep()
      const setEl = this.board.slice().concat(r)
      const newElAsString = setEl.toString()
      if (!set.some(e => e.toString() === newElAsString)) {
        set.push(setEl)
      }
      this.board[this.cpuStep()] = 0
    } else {
      const r = this.cpuStep()
      const setEl = this.board.slice().concat(r)
      const newElAsString = setEl.toString()
      if (!set.some(e => e.toString() === newElAsString)) {
        set.push(setEl)
      }
      this.board[this.cpuStep()] = 1
    }

    this.nextStep = this.nextStep === 0 ? 1 : 0
    this.checkWinner()
  }
}

export const set: number[][] = []
const rndStep = (board: Game['board']) => {
  // console.log('RND CHECK', JSON.stringify(board))
  const filledNums:number[] = []
  board.forEach((c, i) => c === 0.5 && filledNums.push(i))
  // console.log(filledNums)
  return filledNums[rnd(0, filledNums.length - 1)]
}

const minimaxStep = (board: Game['board']) => {
  // console.log('CPU CHECK', JSON.stringify(board))
  return getBestMove(board.map(c => {
    if (c === 1) { return 'x' }
    if (c === 0) { return 'o' }
    return ''
  }))
}

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

// console.log('CHECK', checkWinner([0.5, 0.5, 1, 0.5, 1, 0.5, 0.5, 0.5, 0.5]))
// console.log('rndStep', rndStep([0.5, 0.5, 0, 0.5, 1, 0.5, 0.5, 0.5, 0.5]))

function rnd (min: number, max: number) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}