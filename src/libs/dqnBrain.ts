import * as brain from '../../basket/src/brain'

export default class A2CAgent {
  render = false
  state_size: number
  action_size: number
  value_size = 1

  discount_factor = 0.99
  actor_learningr = 0.001
  critic_learningr = 0.005
  discountRate = .9
  actor: brain.NeuralNetwork
  // critic: brain.NeuralNetwork

  pred_actions: number[]
  pred_state: number[]
  pred_reward = 0

  isTrain = false

  savedStates: number[][] = []
  savedStatesActions: number[][] = []
  savedAdvs: number[][] = []
  savedTargets: number[][] = []

  positiveActorSets: { state: number[], acts: number[] }[] = []

  memory = new Memory(1000)

  constructor (state_size: number, action_size: number) {
    this.state_size = state_size
    this.action_size = action_size
    this.pred_state = zero(state_size)
    this.pred_actions = zero(action_size)
    this.pred_reward = 0
    // create a simple feed forward neural network with backpropagation
    this.actor = new brain.NeuralNetwork({
      // inputSize: state_size,
      hiddenLayers: [180, 180],
      learningRate: 0.1,
      // outputSize: action_size,
    })
    this.actor.train([{ input: convertSoftMax(state_size, 0, 1), output: convertSoftMax(action_size, 0, 1) }])
    // this.critic = new brain.NeuralNetwork({
    //   inputSize: state_size + action_size,
    //   hiddenLayers: [150, 150],
    //   outputSize: this.value_size,
    // })
  }

  act (state: number[]) {
    // [state, action, reward, nextState]
    // this.memory.addSample([this.pred_state, softMax(this.pred_actions), this.pred_reward, state])
    this.pred_reward && this.memory.addSample([this.pred_state, softMax(this.pred_actions), this.pred_reward, state])
    this.pred_state = state
    this.pred_actions = Math.random() > 0.1 ? this.actor.run(state) : convertSoftMax(this.action_size, rnd(0, this.action_size), Math.random())
    // console.log('PRED:', softMax(this.pred_actions))
    return softMax(this.pred_actions)
  }

  async learn (reward: number) {
    this.pred_reward = reward
    if (this.isTrain || Math.random() > .1 || !this.memory.samples.length) {
      return
    }
    this.isTrain = true
    const batch = this.memory.sample(15)
    const states = batch.map(([state]) => state)
    const nextStates = batch.map(([, , , nextState]) => nextState ? nextState : zero(this.state_size))
    // Predict the values of each action at each state
    const qsa = states.map((state) => this.actor.run(state))
    // Predict the values of each action at each next state
    const qsad = nextStates.map((nextState) => this.actor.run(nextState))
    const x: number[][] = []
    const y: number[][] = []

    // Update the states rewards with the discounted next states rewards
    batch.forEach(
      ([state, action, reward, nextState], index) => {
        const currentQ = qsa[index]
        currentQ[action] = nextState ? reward + this.discountRate * softMax(qsad[index]) : reward
        x.push(state)
        y.push(currentQ)
      }
    )

    // console.log('SET', x.map((input, i) => {
    //   return {
    //     input,
    //     output: y[i]
    //   } as Set
    // }))
    // Learn the Q(s, a) values given associated discounted rewards
    const stat = await this.actor.trainAsync(x.map((input, i) => {
      return {
        input,
        output: x[i]
      }
    }), { iterations: 5 })
    console.log('Done', stat)
    this.isTrain = false

    // if (!reward) { return }
    // const target = convertSoftMax(this.value_size, 0, reward)
    // const q = this.critic.run(this.pred_state.concat(this.pred_actions))[0]
    // const advantages = convertSoftMax(this.action_size, softMax(this.pred_actions), q)

    // const advantages = convertSoftMax(this.action_size, softMax(this.pred_actions), reward)

    // this.savedAdvs.push(advantages)
    // // this.savedTargets.push(target)
    // this.savedStates.push(this.pred_state)
    // this.savedStatesActions.push(this.pred_state.concat(this.pred_actions))

    // if (reward !== 0) {
    //   const act = softMax(this.pred_actions)
    //   this.positiveActorSets.push({
    //     acts: convertSoftMax(this.action_size, act, reward),
    //     state: this.pred_state.slice()
    //   })
    // }

    // if (this.isTrain || Math.random() > .1 || !this.positiveActorSets.length) {
    //   return
    // }
    // this.isTrain = true
    // // const dopArr = this.positiveActorSets.slice().splice(-50)

    // const actorSet: Set[] = this.positiveActorSets.map(s => {
    //   return {
    //     input: s.state,
    //     output: s.acts
    //   }
    // }).splice(-3)
    // shuffle(this.positiveActorSets)
    // // console.log('actorSet>', actorSet)
    // const aLoss = await this.actor.trainAsync(actorSet, { iterations: 1 })
    // // const cLoss = await this.critic.fit(tf.tensor2d(this.savedStatesActions), tf.tensor2d(this.savedTargets), { epochs: 2 })
    // // console.log(aLoss.history.loss[0], cLoss.history.loss[0])
    // console.log('Aloos', this.positiveActorSets.length, aLoss)
    // this.savedAdvs = []
    // this.savedTargets = []
    // this.savedStates = []
    // this.savedStatesActions = []
    // this.isTrain = false
  }
}
type Set = {
  input: number[],
  output: number[]
}
type Simple = [number[], number, number, number[]]
const softMax = (arr: number[]) => {
  let maxIndex = 0
  arr.forEach((res, i) => {
    if (res > arr[maxIndex]) {
      maxIndex = i
    }
  })
  return maxIndex
}

const convertSoftMax = (len: number, pos: number, value: number) => {
  const arr = []
  for (let i = 0; i < len; i++) {
    arr.push(i === pos ? value : 0)
  }
  return arr
}
const zero = (size: number) => convertSoftMax(size, 0, 0)
const shuffle = <T>(arr: T[]): T[] => arr.slice().sort(() => Math.random() - .5)
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

// import { sampleSize } from 'lodash'

class Memory {
  maxMemory: number
  samples: Simple[] = []

  constructor (maxMemory: number) {
    this.maxMemory = maxMemory
  }

  /**
     * @param {Array} sample
     */
  //  ([state, action, reward, nextState]
  addSample (sample: [number[], number, number, number[]]) {
    this.samples.push(sample)
    if (this.samples.length > this.maxMemory) {
      this.samples.shift()
    }
  }

  /**
     * @param {number} nSamples
     * @returns {Array} Randomly selected samples
     */
  sample (nSamples: number) {
    return shuffle(this.samples.slice()).splice(-nSamples)
  }
}