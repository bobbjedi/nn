import * as tf from '@tensorflow/tfjs'

/**
 * Based on Andrej Karpathy's example of DQN learning.
 * https://cs.stanford.edu/people/karpathy/convnetjs/demo/rldemo.html
 */

function getRandomArbitrary (min, max) {
  return Math.random() * (max - min) + min
}

function getRandomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

export class ReplayMemory {
  /**
   * Constructor of ReplayMemory.
   *
   * @param {number} maxLen Maximal buffer length.
   */
  constructor (maxLen) {
    this.maxLen = maxLen
    this.buffer = []
    for (let i = 0; i < maxLen; ++i) {
      this.buffer.push(null)
    }
    this.index = 0
    this.length = 0

    this.bufferIndices_ = []

  }

  /**
   * Append an item to the replay buffer.
   *
   * @param {any} item The item to append.
   */
  append (item) {
    this.buffer[this.index] = item
    this.length = Math.min(this.length + 1, this.maxLen)
    this.bufferIndices_.push(this.index)
    this.index = (this.index + 1) % this.maxLen
  }

  setItem (item, index) {
    this.buffer[index] = item
  }
  /**
   * Randomly sample a batch of items from the replay buffer.
   *
   * The sampling is done *without* replacement.
   *
   * @param {number} batchSize Size of the batch.
   * @return {Array<any>} Sampled items.
   */
  sample (batchSize) {
    if (batchSize > this.maxLen) {
      throw new Error(
        `batchSize (${batchSize}) exceeds buffer length (${this.maxLen})`)
    }
    tf.util.shuffle(this.bufferIndices_)

    const out = []
    for (let i = 0; i < batchSize; ++i) {
      out.push(this.buffer[this.bufferIndices_[i]])
    }
    return out
  }
}

class Buffer {
  constructor (minsize, size) {
    this.v = []
    this.size = typeof(size) === 'undefined' ? 100 : size
    this.minsize = typeof(minsize) === 'undefined' ? 20 : minsize
    this.sum = 0
  }
  add (x) {
    this.v.push(x)
    this.sum += x
    if (this.v.length > this.size) {
      var xold = this.v.shift()
      this.sum -= xold
    }
  }
  get_average () {
    if (this.v.length < this.minsize) { return -1 }
    else { return this.sum / this.v.length }
  }
  reset (x) {
    this.v = []
    this.sum = 0
  }
}

export default class DQN {
  constructor (opt) {
    this.id = -1
    this.stepsBeforeLearn = 0
    this.temporal_window = typeof opt.temporal_window !== 'undefined' ? opt.temporal_window : 1
    this.experience_size = typeof opt.experience_size !== 'undefined' ? opt.experience_size : 30000
    this.start_learn_threshold = typeof opt.start_learn_threshold !== 'undefined' ? opt.start_learn_threshold : Math.floor(Math.min(this.experience_size * 0.1, 1000))
    this.gamma = typeof opt.gamma !== 'undefined' ? opt.gamma : 0.8
    this.learning_steps_total = typeof opt.learning_steps_total !== 'undefined' ? opt.learning_steps_total : 100000
    this.learning_steps_burnin = typeof opt.learning_steps_burnin !== 'undefined' ? opt.learning_steps_burnin : 3000
    this.epsilon_min = typeof opt.epsilon_min !== 'undefined' ? opt.epsilon_min : 0.05
    this.epsilon_test_time = typeof opt.epsilon_test_time !== 'undefined' ? opt.epsilon_test_time : 0.01
    this.learn_each_rewards = opt.learn_each_rewards || 100

    if (typeof opt.num_actions === 'number') {
      this.num_actions = opt.num_actions
    } else {
      throw new Error('num_actions must be specified')
    }

    if (typeof opt.num_states === 'number') {
      this.num_states = opt.num_states
    } else {
      throw new Error('num_states must be specified')
    }

    if (typeof opt.random_action_distribution !== 'undefined') {
      this.random_action_distribution = opt.random_action_distribution
      if (this.random_action_distribution.length !== opt.num_actions) {
        console.log('TROUBLE. random_action_distribution should be same length as num_actions.')
      }
      var a = this.random_action_distribution
      var s = 0.0; for (var k = 0; k < a.length; k++) { s += a[k] }
      if (Math.abs(s - 1.0) > 0.0001) { console.log('TROUBLE. random_action_distribution should sum to 1!') }
    } else {
      this.random_action_distribution = []
    }
    this.input_shape = this.num_states * this.temporal_window + this.num_actions * this.temporal_window + this.num_states
    this.experience_line_length = this.input_shape * 2 + 2
    this.current_experience_size = 0
    this.window_size = Math.max(this.temporal_window, 2) // must be at least 2, but if we want more context even more
    this.state_window = new Array(this.window_size)
    this.action_window = new Array(this.window_size)
    this.reward_window = new Array(this.window_size)
    this.net_window = new Array(this.window_size)
    this.NN = new tf.sequential()
    // this.NN.add(tf.layers.dense({ inputShape: [this.input_shape], units: 100, activation: 'relu' }))
    this.NN.add(tf.layers.dense({ inputShape: [this.input_shape], units: 100, activation: 'relu' }))
    this.NN.add(tf.layers.dense({ units: 36, activation: 'relu' }))
    // this.NN.add(tf.layers.dense({ units: 36, activation: 'relu' }))
    this.NN.add(tf.layers.dense({
      units: this.num_actions,
      kernelRegularizer: tf.regularizers.l2(),
      activation: 'linear',
      name: 'outter'
    }))
    this.BATCH_SIZE = 64
    this.optimizer = tf.train.sgd(0.01)
    this.experience = new ReplayMemory(this.experience_size)
    this.age = 0 // incremented every backward()
    this.forward_passes = 0 // incremented every forward()
    this.epsilon = 1.0 // controls exploration exploitation tradeoff. Should be annealed over time
    this.latest_reward = 0
    this.last_input_array = []
    this.average_reward_window = new Buffer(10, 1000)
    this.average_loss_window = new Buffer(10, 1000)
    this.learning = true
  }

  getNetInput (xt) {
    // return s = (x,a,x,a,x,a,xt) state vector.
    // It's a concatenation of last window_size (x,a) pairs and current state x
    var w = []
    w = w.concat(xt) // start with current state
    // and now go backwards and append states and actions from history temporal_window times
    var n = this.window_size
    for (var k = 0; k < this.temporal_window; k++) {
      // state
      w = w.concat(this.state_window[n - 1 - k])
      // action, encoded as 1-of-k indicator vector. We scale it up a bit because
      // we dont want weight regularization to undervalue this information, as it only exists once
      var action1ofk = new Array(this.num_actions)
      for (var q = 0; q < this.num_actions; q++) { action1ofk[q] = 0.0 }
      action1ofk[this.action_window[n - 1 - k]] = 1.0 * this.num_states
      w = w.concat(action1ofk)
    }
    return w
  }

  async policy (s) {
    let tens = tf.tensor(s)
    let tens1 = tens.reshape([1, this.input_shape])
    var action_values = this.NN.apply(tens1)
    var argm = await action_values.argMax(1).dataSync()[0]
    var val = await action_values.max().dataSync()[0]
    let ret = { action: argm, value: val }
    tf.dispose(action_values)
    tf.dispose(tens1)
    tf.dispose(tens)
    return ret
  }

  act (input_array) {
    this.forward_passes += 1
    this.last_input_array = input_array // back this up

    // create network input
    let action
    let net_input = []
    if (this.forward_passes > this.temporal_window) {
      net_input = this.getNetInput(input_array)
      if (this.learning) {
        this.epsilon = Math.min(1.0, Math.max(this.epsilon_min, 1.0 - (this.age - this.learning_steps_burnin) / (this.learning_steps_total - this.learning_steps_burnin)))
      } else {
        this.epsilon = this.epsilon_test_time // use test-time value
      }
      var rf = Math.random()
      if (rf < this.epsilon) {
        action = this.random_action()
      } else {
        // otherwise use our policy to make decision
        var maxact = this.policy(net_input)
        action = maxact.action
      }
    } else {
      // pathological case that happens first few iterations
      // before we accumulate window_size inputs

      action = this.random_action()
    }

    // remember the state and action we took for backward pass
    this.net_window.shift()
    this.net_window.push(net_input)
    this.state_window.shift()
    this.state_window.push(input_array)
    this.action_window.shift()
    this.action_window.push(action)

    return action
  }

  random_action () {
    if (this.random_action_distribution.length === 0) {
      return getRandomInt(0, this.num_actions)
    } else {
      // okay, lets do some fancier sampling:
      var p = getRandomArbitrary(0, 1.0)
      var cumprob = 0.0
      for (var k = 0; k < this.num_actions; k++) {
        cumprob += this.random_action_distribution[k]
        if (p < cumprob) { return k }
      }
    }
  }

  async learn (reward) {
    this.latest_reward = reward
    this.average_reward_window.add(reward)
    this.reward_window.shift()
    this.reward_window.push(reward)

    if (!this.learning) { return }

    // various book-keeping
    this.age += 1

    if (this.forward_passes > this.temporal_window + 1) {
      var n = this.window_size
      var item = [this.net_window[n - 2], this.action_window[n - 2], this.reward_window[n - 2], this.net_window[n - 1]]
      if (this.experience.index < this.experience_size) {
        this.experience.append(item)
      } else {
        var ri = getRandomInt(0, this.experience_size)
        this.experience.setItem(ri, item)
      }
    }
    const lossFunction = () => tf.tidy(() => {
      let x_tensor = tf.tensor(x, [1, this.input_shape])
      let y_tensor = tf.tensor(y)
      let y_s = tf.tensor(y_new)
      let output = this.NN.apply(x_tensor)
      output = output.reshape([output.shape[1]])
      const loss = tf.mul(output, y_s).sub(y_tensor).square().sum().mul(0.5)
      return loss
    })
    this.stepsBeforeLearn++
    if (this.experience.length > this.start_learn_threshold && this.stepsBeforeLearn > this.learn_each_rewards) {
      this.stepsBeforeLearn = 0
      var samples = this.experience.sample(this.BATCH_SIZE)
      for (var k = 0; k < this.BATCH_SIZE; k++) {
        var e = samples[k]
        var x = e[0]
        var maxact = this.policy(e[3])
        var r = e[2] + this.gamma * maxact.value
        var y = new Array(this.num_actions); for (let i = 0; i < this.num_actions; ++i) { y[i] = 0 }
        y[e[1]] = r
        var y_new = new Array(this.num_actions); for (let i = 0; i < this.num_actions; ++i) { y_new[i] = 0 }
        y_new[e[1]] = 1

        var grads = tf.variableGrads(lossFunction, this.NN.getWeights())
        this.optimizer.applyGradients(grads.grads)
        tf.dispose(grads)
        // avcost += lossFunction().dataSync()[0];
      }
      // avcost = avcost/this.BATCH_SIZE;
      // this.average_loss_window.add(avcost);
      // console.log('avg: %s', this.average_reward_window.get_average())
    }

  }
}