import * as brainjs from './brain'

export default class DQL {
  brain: brainjs.NeuralNetwork
  opt: Options // TODO: inputRange
  private currentEpisode: StoredStep[] = []
  private savedSets: Set[] = []
  private countEpisodes = 0
  private isTrain = false

  constructor (opt: Options) {
    opt.countStoredSets = opt.countStoredSets || 5000
    opt.trainEachEpisodes = opt.trainEachEpisodes || 10
    this.opt = opt

    const config = {
      binaryThresh: 0.5,
      hiddenLayers: opt.hiddensLayers, // array of ints for the sizes of the hidden layers in the network
      activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
      leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu'
    }
    this.brain = new brainjs.NeuralNetwork(config)
    this.brain.train([{ input: convertSoftMax(opt.inputSize, 0, 0), output: convertSoftMax(opt.inputSize, 0, 0) }])
  }

  act (input: number[]) {
    const act = softMax(this.brain.run(input))
    this.currentEpisode.push({ input, act })
    return act
  }

  // if last act was is not valid
  rndActInsteadLast () {
    const rndRes = rnd(0, this.opt.outputSize - 1)
    // change last stored act
    this.currentEpisode[this.currentEpisode.length - 1].act = rndRes
    return rndRes
  }

  async closeEpisode (reward: number) {
    this.countEpisodes++
    if (reward <= 0) { return await this.train() }
    if (reward > 10) { console.warn('Rewards max 10') }
    const rewardsCoef = Math.min(10, reward) / 10
    this.currentEpisode.forEach(e => {
      this.savedSets.push({
        input: e.input,
        output: convertSoftMax(this.opt.outputSize, e.act, rewardsCoef)
      })
    })
    this.savedSets = shuffle(this.savedSets).splice(-this.opt.countStoredSets)
    this.currentEpisode = []
    await this.train()
  }
  async train () {
    if (this.countEpisodes % this.opt.trainEachEpisodes !== 0) {
      return
    }
    // const opt = {
    //   iterations: 20000, // the maximum times to iterate the training data --> number greater than 0
    //   errorThresh: 0.005, // the acceptable error percentage from training data --> number between 0 and 1
    //   log: false, // true to use console.log, when a function is supplied it is used --> Either true or a function
    //   logPeriod: 10, // iterations between logging out --> number greater than 0
    //   learningRate: 0.3, // scales with delta to effect training rate --> number between 0 and 1
    //   momentum: 0.1, // scales with next layer's change value --> number between 0 and 1
    //   callback: null, // a periodic call back that can be triggered while training --> null or function
    //   callbackPeriod: 10, // the number of iterations through the training data between callback calls --> number greater than 0
    //   timeout: Infinity, // the max number of milliseconds to train for --> number greater than 0
    // }
    if (this.isTrain) {
      return
    }
    this.isTrain = true
    const stat = await this.brain.trainAsync(this.savedSets.slice(), {
      iterations: 100,
      learningRate: 0.3,
      momentum: 0.1
    })
    this.isTrain = false
    console.log('Stat', this.countEpisodes, stat)
    return stat
  }
}

const softMax = (arr: number[]) => {
  let maxIndex = 0
  arr.forEach((res: number, i: number) => {
    if (res > arr[maxIndex]) {
      maxIndex = i
    }
  })
  return maxIndex
}
const convertSoftMax = (len: number, pos: number, value: number) => {
  const arr: number[] = []
  for (let i = 0; i < len; i++) {
    arr.push(i === pos ? value : 0)
  }
  return arr
}

const shuffle = (arr: Array<any>) => arr.sort(() => Math.random() - .5)
const rnd = (min: number, max: number) => { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

type Set = { input: number[], output: number[] }

type StoredStep = {
    input: number[],
    act: number
}

type Options = {
    inputSize: number,
    outputSize: number,
    hiddensLayers: number[],
    trainEachEpisodes?: number,
    countStoredSets?: number
}