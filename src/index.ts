import Player from './Player'
import Game from './Game'
import RL from './ql'

const win_: any = window

var env = {
  getNumStates: () => 8,
  getMaxNumActions: () => 9
}
// create the agent, yay!
const spec: any = { alpha: 0.01 } // see full options on top of this page
spec.update = 'qlearn' // qlearn | sarsa
spec.gamma = 0.9 // discount factor, [0, 1)
spec.epsilon = 0.2 // initial epsilon for epsilon-greedy policy, [0, 1)
spec.alpha = 0.01 // value function learning rate

spec.experience_add_every = 5 // По умолчанию = 5. number of time steps before we add another experience to replay memory
// REINFORCEjs не добавит новых возможностей для воспроизведения каждого кадра, чтобы попытаться сэкономить ресурсы
// и добиться большего разнообразия. Вы можете отключить это, установив для этого параметра значение 1.

spec.experience_size = 5000 // size of experience replay memory  размер памяти. Для более сложных задач может потребоваться больший объем памяти
spec.learning_steps_per_iteration = 2 // По умолчанию = 20. чем больше, тем лучше, но медленнее.
spec.tderror_clamp = 1.0 // for robustness
spec.num_hidden_units = 100 // number of neurons in hidden layer

const agent0 = new (RL as any).DQNAgent(env, spec)
spec.learning_steps_per_iteration = 50
spec.num_hidden_units = 100 // number of neurons in hidden layer
const agent1 = new (RL as any).DQNAgent(env, spec)

// import DQN from './webndq'
// const { ReLU, Linear, MSE, SGD, Sequential } = require('weblearn')

// let model = Sequential({
//   optimizer: SGD(.01),
//   loss: MSE()
// })

// const STATE_SIZE = 9
// const NUM_ACTIONS = 9
// // model input should match state size
// // and have one output for each action
// model
// .add(Linear(STATE_SIZE, 40, false))
// .add(ReLU())
// .add(Linear(40, 40))
// .add(ReLU())
// .add(Linear(40, NUM_ACTIONS, false))

// let agent1 = new DQN({
//   model: model, // weblearn model. required.
//   numActions: NUM_ACTIONS, // number of actions. required.
//   // epsilon: .02,
//   // finalEpsilon: .1,
//   // epsilonDecaySteps: 10000,
//   gamma: .9
// } as any)
// agent1.isNew = true
// get these from your environment:
// let observation = ndarray([.2, .74])
// let reward = .3
// let done = false

// let action = agent.step(observation, reward, done)
// `action` is an integer in the range of [0, NUM_ACTIONS)

// call this whenever ya wanna do a learn step.
// you can call this after each `agent.step()`, but you can also call it more or less often.
// just keep in mind, depending on the size of your model, this may block for a relatively long time.
// let loss = agent.learn()

// const agent1 = new (RL as any).DQNAgent(env, spec);
agent0.id = 0
agent1.id = 1
// setInterval(()=>console.log(agent), 10000)
// setInterval(function(){ // start the learning loop
//   var action = agent.act(s); // s is an array of length 8
//   // execute action in environment and get the reward
//   agent.learn(reward); // the agent improves its Q,policy,model, etc. reward is a float
// }, 0);
const player0 = new Player(agent0, false)
const player1 = new Player(agent1, false)
const playerCPU0 = new Player({ id: 'CPU0' }, true)
const playerCPU1 = new Player({ id: 'CPU1' }, true)
// playerCPU.brain.id = 'CPU'
// function startEvaluation() {
const delay = () => new Promise(r => setTimeout(r, .1));
(async () => {
  console.log('Start')
  let i = 0
  while (i++ < 1000000) {
    player0.brain.epsilon -= player0.brain.epsilon * 0.00001
    player1.brain.epsilon -= player1.brain.epsilon * 0.00001

    i % 1000 === 0 && console.log('Iterates: ', '' + i / 1000 + 'k', 'Epsilon:', player0.brain.epsilon)
    await delay()
    // const p1 = !win_.isShow && (Math.random() < .1) ? playerCPU0 : player0
    // const p2 = !win_.isShow && !String(p1.brain.id).includes('CPU') && (Math.random() < .1) ? playerCPU0 : player1
    // const p2 = !win_.isShow && !String(p1.brain.id).includes('CPU') && (Math.random() < .1) ? playerCPU0 : player1
    // win_.isShow && console.log(p1.brain.id, p2.brain.id)
    // const testGame = new Game(p1, p2)
    const testGame = new Game(playerCPU1, player1)
    while (testGame.isActive) {
      await testGame.step()
    }
  }
})()