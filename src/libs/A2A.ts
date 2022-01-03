import DQNAgent from './RL'

export default class A2A {
  actor: DQNAgent
  criticSet: number[][] = []
  countSet: number

  constructor (env: Env, spec: Spec, countSet = 0) {
    this.actor = new DQNAgent(env, spec)
    this.countSet = countSet
  }

  act (s: number[], validActs?: number[]) {
    this.criticSet.push(s)
    const act = this.actor.clearAct(s, validActs)
    return act
  }
  violationRules (reward: number) {
    this.actor.act(this.criticSet.splice(-1)[0])
    this.actor.learn(reward)
  }
  learn (reward: number) {
    if (reward === 0 && this.criticSet.length <= this.countSet) { return }
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