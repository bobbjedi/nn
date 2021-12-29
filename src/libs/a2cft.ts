import * as tf from '@tensorflow/tfjs'
import { createTFNet } from './tfjsPerc'

export default class A2CAgent {
  render = false
  state_size: number
  action_size: number
  value_size = 1

  discount_factor = 0.99
  actor_learningr = 0.001
  critic_learningr = 0.005

  actor: tf.Sequential
  critic: tf.Sequential

  pred_actions: number[]
  pred_state: number[]

  isTrain = false

  savedStates: number[][] = []
  savedStatesActions: number[][] = []
  savedAdvs: number[][] = []
  savedTargets: number[][] = []

  positiveActorSets: { state: number[], acts: number[] }[] = []

  constructor (state_size: number, action_size: number) {
    this.state_size = state_size
    this.action_size = action_size
    this.pred_state = convertSoftMax(state_size, 0, 0)
    this.pred_actions = convertSoftMax(action_size, 0, 0)

    this.actor = createTFNet(state_size, [100], action_size)
    this.critic = createTFNet(state_size + action_size, [100], this.value_size)
  }

  act (state: number[]) {
    this.pred_state = state
    this.pred_actions = Math.random() > 0.05 ? predictFromNet(this.actor, state) : convertSoftMax(this.action_size, rnd(0, this.action_size), Math.random())
    // console.log(this.pred_actions)
    return softMax(this.pred_actions)
  }

  async learn (reward: number) {
    // if (!reward) { return }
    const target = convertSoftMax(this.value_size, 0, reward)
    const q = predictFromNet(this.critic, this.pred_state.concat(this.pred_actions))[0]
    const advantages = convertSoftMax(this.action_size, softMax(this.pred_actions), q)
    // const advantages = convertSoftMax(this.action_size, softMax(this.pred_actions), reward)

    this.savedAdvs.push(advantages)
    this.savedTargets.push(target)
    this.savedStates.push(this.pred_state)
    this.savedStatesActions.push(this.pred_state.concat(this.pred_actions))

    if (reward !== 0) {
      this.positiveActorSets.push({
        acts: this.pred_actions.slice(),
        state: this.pred_state.slice()
      })
    }
    if (this.isTrain || Math.random() > .3) {
      return
    }
    this.isTrain = true
    const dopArr = shuffle(this.positiveActorSets).slice(0, 5)
    // console.log('Dop arr', dopArr)
    const aLoss = await this.actor.fit(tf.tensor2d(this.savedStates.concat(dopArr.map(d => d.state))), tf.tensor2d(this.savedAdvs.concat(dopArr.map(d => d.acts))), { epochs: 2 })
    const cLoss = await this.critic.fit(tf.tensor2d(this.savedStatesActions), tf.tensor2d(this.savedTargets), { epochs: 2 })
    console.log(aLoss.history.loss[0], cLoss.history.loss[0])
    this.savedAdvs = []
    this.savedTargets = []
    this.savedStates = []
    this.savedStatesActions = []
    this.isTrain = false
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

const convertSoftMax = (len: number, pos: number, value: number) => {
  const arr = []
  for (let i = 0; i < len; i++) {
    arr.push(i === pos ? value : 0)
  }
  return arr
}
const shuffle = <T>(arr: T[]): T[] => arr.slice().sort(() => Math.random() - .5)
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)
const predictFromNet = (model: tf.Sequential, input: number[]): number[] => (model.predict(tf.tensor2d([input])) as any).arraySync()[0]