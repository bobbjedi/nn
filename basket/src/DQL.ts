import * as brainjs from './brain'

export default class DQL {
  brain: brainjs.NeuralNetwork
  opt: Options // TODO: inputRange

  private currentEpisodeSteps: EpisodeStep[] = []
  private savedSets: StoredStep[] = JSON.parse(localStorage.getItem('brain_set') || '[]')
  private countEpisodes = 0
  private isTrain = false
  private lastInput: number[] = []
  private lastAct: number = -1
  private lastReward = 0

  constructor (opt: Options) {
    opt.countStoredSets = opt.countStoredSets || 5000
    opt.trainEachEpisodes = opt.trainEachEpisodes || 10
    this.opt = opt

    const config = {
      hiddenLayers: opt.hiddensLayers, // array of ints for the sizes of the hidden layers in the network
      activation: 'sigmoid', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    }
    this.brain = new brainjs.NeuralNetwork(config)
    this.brain.train([{ input: convertSoftMax(opt.inputSize, 0, 0), output: convertSoftMax(opt.inputSize, 0, 0) }])
    setTimeout(() => console.log('console.log(this.savedSets)', this.savedSets.length))
  }

  act (input: number[], isForceRnd = false) {
    input = input.slice()
    const inputStr = input.toString()
    let act: number

    const isNotValidStep = inputStr === this.lastInput.toString() && (this.lastReward < 0) // looks like not valid last act
    if (isNotValidStep) {
      this.currentEpisodeSteps.splice(-1)
    } // rm last step, because already set negative reward

    if (
      isForceRnd
      || isNotValidStep
      || rnd(0, 1) < this.opt.epsilon
    ) {
      act = rnd(0, this.opt.outputSize - 1)
    } else {
      act = softMax(this.brain.run(input))
    }
    this.lastInput = input.slice()
    this.lastAct = act
    this.currentEpisodeSteps.push({ input, act })
    return act
  }

  learn (reward: number) {
    this.lastReward = reward
    this.updOrCreateNewSet(this.lastInput, this.lastAct, reward)
  }

  async closeEpisode (reward: number) {
    this.countEpisodes++
    if (reward > 10 || reward < -10) { console.warn('Rewards must be [-10 .... 10]') }
    // this.learn(reward)

    const rewardedSteps = this.currentEpisodeSteps.splice(-2).reverse()
    rewardedSteps.forEach((e, i) => this.updOrCreateNewSet(e.input, e.act, (reward / i + 1)))

    this.currentEpisodeSteps = []
    await this.train()
  }

  updOrCreateNewSet (input: number[], act: number, reward: number) {
    const inputStr = input.toString()
    let set = this.savedSets.find(s => s.inputStr === inputStr)
    if (!set) {
      set = {
        input: input,
        output: convertSoftMax(this.opt.outputSize, 0, 0),
        inputStr
      }
      this.savedSets.push(set)
    }
    // console.log('Stored or new:', JSON.stringify(set))
    set.output[act] += reward / 10
    set.output[act] = Math.max(set.output[act], -1)
    set.output[act] = Math.min(set.output[act], 1)
    // console.log('Stored after add:', JSON.stringify(set))
  }
  async train () {
    if (this.countEpisodes % this.opt.trainEachEpisodes !== 0 || this.isTrain) {
      return
    }
    console.log('Start train')
    this.isTrain = true
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
    const count = this.countEpisodes
    const clone = (new brainjs.NeuralNetwork()).fromJSON(this.brain.toJSON())
    const time = new Date().getTime()
    const stat = await clone.trainAsync(shuffle(JSON.parse(JSON.stringify(this.savedSets))).splice(-1000000000), {
      iterations: 500,
      log: true,
      logPeriod: 50,
      learningRate: 0.3,
      momentum: 0.1
    })
    this.brain = (new brainjs.NeuralNetwork()).fromJSON(clone.toJSON())
    this.isTrain = false
    console.log('Stat', 'time:', ((new Date().getTime() - time) / 1000).toFixed(2) + 's', 'Episodes:', count, 'Set:', this.savedSets.length, stat)
    localStorage.setItem('brain_set', JSON.stringify(this.savedSets))
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

type EpisodeStep = {
  input: number[]
  act: number
}
type StoredStep = {
    input: number[]
    output: number[]
    inputStr: string
}

type Options = {
    inputSize: number
    outputSize: number
    epsilon: number
    hiddensLayers: number[]
    lastRevardedStepsOfEpisode: number
    trainEachEpisodes?: number
    countStoredSets?: number
}