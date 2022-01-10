import DQNAgent, { Mat } from './RL'

export default class FT {
  actor: DQNAgent
  exp: Exp[] = []
  countSet: number

  pred_rw = 0
  pred_s: number[] = []
  pred_a = -1

  constructor (env: Env, spec: Spec, countSet = 3) {
    console.log('Spec:', spec)
    this.actor = new DQNAgent(env, spec)
    this.countSet = countSet
  }

  act (s: number[], validActs?: number[]) {
    if (this.pred_a >= 0) {
      this.exp.push([this.pred_s, this.pred_a, s])
      this.learnActor(this.pred_rw)
    }
    const act = this.actor.clearAct(s, validActs)
    this.pred_s = s
    this.pred_a = act
    return act
  }

  learnActor (reward: number) {
    if (!reward && this.exp.length < this.countSet) { return }
    this.exp.forEach((exp, i) => {
      this.actor.setExp(matFromArr(exp[0]), exp[1], reward / (this.exp.length - i), matFromArr(exp[2]))
      this.actor.replayLearn()
    })
    this.exp = []
  }

  learn (reward: number) {
    this.pred_rw = reward
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
  arch?: 'p' | 'lstm'
}
export type Env = {
  getNumStates?: () => number
  getMaxNumActions?: () => number
}

// pred_s a, s
type Exp = [number[], number, number[]]

const matFromArr = (arr: number[]) => {
  const m = new Mat(arr.length, 1)
  m.setFrom(arr)
  return m
}