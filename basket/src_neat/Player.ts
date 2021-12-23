export default class Player {
  score = 0
  brain: any
  constructor (brain: any) {
    this.brain = brain
    this.brain.score = 0
  }
  run (input: number[]): number {
    // console.log('INPUT', input)
    // TODO: softmax
    const outputs = this.brain.activate(input)
    // const output = Math.round(this.brain.activate(input)[0] * input.length)
    // console.log(output)
    // return output
    // console.log('outputs', outputs)
    let maxIndex = 0
    outputs.forEach((res: number, i: number) => {
      if (res > outputs[maxIndex]) {
        maxIndex = i
      }
    })
    // console.log(outputs, maxIndex)
    return maxIndex
  }
  upScore (score: number) {
    this.score += score
    this.brain.score += score
  }
}