import { Vec } from './utills'

// A single agent
export class Agent {

  // positional information
  p = new Vec(300, 300)
  v = new Vec(0, 0)
  op = this.p // old position
  angle = 0 // direction facing
  oangle = 0 // direction facing
  actions = [0, 1, 2, 3]
  rad = 10
  reward_bonus = 0.0
  digestion_signal = 0.0
  last_reward: number
  // outputs on world
  action = 0
  prevactionix = -1
  num_states: number

  eyes: Eye[] = []
  brain: any

  constructor () {
    for (var k = 0; k < 30; k++) {
      this.eyes.push(new Eye(k * 0.21))
    }
    this.num_states = this.eyes.length * 5 + 2
  }

  getNumStates () {
    return this.num_states
  }
  getMaxNumActions () {
    return this.actions.length
  }
  forward () {
    // in forward pass the agent simply behaves in the environment
    // create input to brain
    var num_eyes = this.eyes.length
    var ne = num_eyes * 5 // 5 states for each eye
    var input_array = new Array(this.num_states)
    for (var i = 0; i < num_eyes; i++) {
      var e = this.eyes[i]
      // "i" is num of eye
      input_array[i * 5] = 1.0 // ?? sensed type 1      |
      input_array[i * 5 + 1] = 1.0 // ?? senset type 2  | ?? this value is distance? Max normalize distanse is 1?
      input_array[i * 5 + 2] = 1.0 // ?? sensed type 3  | looks like 1 means that direction is free
      input_array[i * 5 + 3] = e.vx // velocity information of the sensed target
      input_array[i * 5 + 4] = e.vy
      if (e.sensed_type !== -1) { // for eye
        // sensed_type is 0 for wall, 1 for food and 2 for poison.
        // lets do a 1-of-k encoding into the input array
        input_array[i * 5 + e.sensed_type] = e.sensed_proximity / e.max_range // ?? distance to target? (normalize to [0,1])
        // console.log(i * 5, i * 5 + 1, i * 5 + 2, 'r', i * 5 + e.sensed_type)
      }
    }
    // console.log(input_array)
    // proprioception and orientation
    input_array[ne + 0] = this.v.x
    input_array[ne + 1] = this.v.y

    this.action = this.brain.act(input_array)
    // var action = this.actions[actionix];
    // demultiplex into behavior variables
    // this.action = action;
  }
  backward () {
    const reward = this.digestion_signal
    if (reward > 0) { positiveRw++ }
    if (reward < 0) { negativeRw++ }
    countRw++
    // console.log(this.digestion_signal)
    // var proximity_reward = 0.0;
    // var num_eyes = this.eyes.length;
    // for(var i=0;i<num_eyes;i++) {
    //   var e = this.eyes[i];
    //   // agents dont like to see walls, especially up close
    //   proximity_reward += e.sensed_type === 0 ? e.sensed_proximity/e.max_range : 1.0;
    // }
    // proximity_reward = proximity_reward/num_eyes;
    // reward += proximity_reward;

    // var forward_reward = 0.0;
    // if(this.actionix === 0) forward_reward = 1;

    this.last_reward = reward // for vis
    this.brain.learn(reward)
  }
}
let positiveRw = 0
let negativeRw = 0
let countRw = 0
setInterval(() => console.log('Q:', +(positiveRw / negativeRw).toFixed(2)), 10000)
setInterval(() => console.log({ steps: +(countRw / 1000).toFixed(), positiveRw, negativeRw }, positiveRw = negativeRw = 0), 60000)
// Eye sensor has a maximum range and senses walls
class Eye {
  angle: number
  max_range = 120
  sensed_proximity = 120 // what the eye is seeing. will be set in world.tick()
  sensed_type = -1 // what does the eye see?
  vx = 0 // sensed velocity
  vy = 0
  constructor (angle: number) {
    this.angle = angle // angle relative to agent its on
  }
}