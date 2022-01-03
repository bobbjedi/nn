import DQNAgent from './RL'

export default class A2C {
  actor: DQNAgent
  criticSet: number[][] = []
  countSet = 2

  constructor (env: Env, spec: Spec) {
    this.actor = new DQNAgent(env, spec)
    // setInterval(() => {
    // console.log('Res:', this.countSet, { errors, ok }, errors / ok)
    // errors = 0
    // ok = 0
    // }, 10000)
  }

  act (s: number[]) {
    // return this.actor.act(s)
    this.criticSet.push(s)
    const act = this.actor.forwardQPublic(s)
    return act
  }
  violationRules (reward: number) {
    this.actor.act(this.criticSet.splice(-1)[0])
    this.actor.learn(reward)
  }
  learn (reward: number) {
    // if (reward > 0) { ok++ }
    // if (reward < 0) { errors++ }
    // return this.actor.learn(reward)
    if (reward === 0 && this.criticSet.length <= this.countSet) { return }
    // console.log('Reward:', reward, 'Count:', this.criticSet.length)
    // this.criticSet.reverse()
    this.criticSet.forEach((s, i) => {
      this.actor.act(s)
      this.actor.learn(reward / (this.criticSet.length - i))
    })
    this.criticSet = []
  }
}
// let errors = 0
// let ok = 0

export type Spec = {
  statesCount: number
  actionsCount: number
  update: 'qlearn' | 'sarsa'// qlearn | sarsa
  gamma: number // discount factor, [0, 1)
  epsilon: number // initial epsilon for epsilon-greedy policy, [0, 1)
  alpha: number // value function learning rate
  experience_add_every: number // = 5. number of time steps before we add another experience to replay memory
  experience_size: number // size of experience
  learning_steps_per_iteration: number // =20 better but slowly
  tderror_clamp: number // for robustness
  num_hidden_units: number // number of neurons in hidden layer
  num_hidden_layers?: number[] // number of neurons in hidden layer
}
export type Env = {
  getNumStates?: () => number
  getMaxNumActions?: () => number
}