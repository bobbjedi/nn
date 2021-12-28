import RL from './RL'

type I_DQN = {
    act: (s: number[], isNoNeedSoftMax: boolean) => number | number[],
    forwardQPublic: (s: number[]) => number,
    learn: (r: number) => number
}

const DQNAgent = (RL as any).DQNAgent

export default class A2C {
  actor: I_DQN
  critic: I_DQN
  countSet = 2
  criticSet: Set[] = []

  constructor (actorSpec: Spec, criticSpec: Spec) {
    const actorParams = optsAndSpec(actorSpec)
    const criticParams = optsAndSpec(criticSpec)
    console.log({ actorParams, criticParams })
    this.actor = new DQNAgent(actorParams.opt, actorParams.spec)
    this.critic = new DQNAgent(criticParams.opt, criticParams.spec)
  }
  act (s: number[]) {
    const acts = Array.from(this.actor.act(s, true) as number[])
    const sa = s.concat(acts)
    const q = critictActsToReward(this.critic.forwardQPublic(sa))
    this.actor.learn(q)
    this.criticSet.push({ q, sa })
    return softMax(acts)
  }

  learn (reward: number) {
    if (reward > 0) { ok++ }
    if (reward < 0) { errors++ }
    // console.log('Reward', reward)
    // this.actor.learn(reward)
    // reward = 0
    if (reward === 0 && this.criticSet.length <= this.countSet) { return }
    // console.log('Reward!', this.criticSet.length)
    this.criticSet.forEach(s => {
      const pred_q = critictActsToReward(this.critic.act(s.sa, false) as number)
      if (pred_q < 0 && reward < 0 || pred_q > 0 && reward > 0) {
        this.critic.learn(1)
        // ok++
      } else {
        // errors++
        this.critic.learn(-1)
      }
    })
    this.criticSet = []
  }
}
let errors = 0
let ok = 0

const critictActsToReward = (act: number) => {
  if (act === 0) { return -1 }
  if (act === 1) { return 0 }
  if (act === 2) { return 1 }
}
setInterval(() => {
  console.log('Res:', errors / ok)
}, 5000)
const optsAndSpec = (spec: Spec) => {
  const spec_ = { ...spec }
  const opt: Opt = {
    getNumStates: () => spec_.statesCount,
    getMaxNumActions: () => spec_.actionsCount
  }
  return { opt, spec: spec_ }
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
const regressionToReward = (a: number, b: number) => {
  const dif = Math.abs((b - a) / a)
  return (.5 - dif) * 2
}
export type Spec = {
    statesCount: number
    actionsCount: number
    update:'qlearn' | 'sarsa'// qlearn | sarsa
    gamma: number // discount factor, [0, 1)
    epsilon:number // initial epsilon for epsilon-greedy policy, [0, 1)
    alpha: number // value function learning rate
    experience_add_every: number // = 5. number of time steps before we add another experience to replay memory
    experience_size: number // size of experience
    learning_steps_per_iteration: number // =20 better but slowly
    tderror_clamp: number // for robustness
    num_hidden_units: number // number of neurons in hidden layer
}
export type Opt = {
    getNumStates?: ()=> number
    getMaxNumActions?: ()=> number
}
type Set = {
    sa: number[]
    q: number
}