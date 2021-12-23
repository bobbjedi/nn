var canvas, ctx

// Draw everything
function draw () {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = 1
  var agents = w.agents

  // draw walls in environment
  ctx.strokeStyle = 'rgb(0,0,0)'
  ctx.beginPath()
  for (var i = 0, n = w.walls.length; i < n; i++) {
    var q = w.walls[i]
    ctx.moveTo(q.p1.x, q.p1.y)
    ctx.lineTo(q.p2.x, q.p2.y)
  }
  ctx.stroke()

  // draw agents
  // color agent based on reward it is experiencing at the moment
  var r = 0
  ctx.fillStyle = 'rgb(' + r + ', 150, 150)'
  ctx.strokeStyle = 'rgb(0,0,0)'
  for (var i = 0, n = agents.length; i < n; i++) {
    var a = agents[i]

    // draw agents body
    ctx.beginPath()
    ctx.arc(a.op.x, a.op.y, a.rad, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.stroke()

    // draw agents sight
    for (var ei = 0, ne = a.eyes.length; ei < ne; ei++) {
      var e = a.eyes[ei]
      var sr = e.sensed_proximity
      if (e.sensed_type === -1 || e.sensed_type === 0) {
        ctx.strokeStyle = 'rgb(200,200,200)' // wall or nothing
      }
      if (e.sensed_type === 1) { ctx.strokeStyle = 'rgb(255,150,150)' } // apples
      if (e.sensed_type === 2) { ctx.strokeStyle = 'rgb(150,255,150)' } // poison
      ctx.beginPath()
      ctx.moveTo(a.op.x, a.op.y)
      ctx.lineTo(a.op.x + sr * Math.sin(a.oangle + e.angle),
        a.op.y + sr * Math.cos(a.oangle + e.angle))
      ctx.stroke()
    }
  }

  // draw items
  ctx.strokeStyle = 'rgb(0,0,0)'
  for (var i = 0, n = w.items.length; i < n; i++) {
    var it = w.items[i]
    if (it.type === 1) { ctx.fillStyle = 'rgb(255, 150, 150)' }
    if (it.type === 2) { ctx.fillStyle = 'rgb(150, 255, 150)' }
    ctx.beginPath()
    ctx.arc(it.p.x, it.p.y, it.rad, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.stroke()
  }
}

// Tick the world
var smooth_reward_history = []
var smooth_reward = null
var flott = 0
function tick () {

  if (simspeed === 3) {
    for (var k = 0; k < 50; k++) {
      w.tick()
    }
  } else {
    w.tick()
  }
  draw()

  var rew = w.agents[0].last_reward
  if (smooth_reward == null) { smooth_reward = rew }
  smooth_reward = smooth_reward * 0.999 + rew * 0.001
  flott += 1
  if (flott === 50) {
    // record smooth reward
    if (smooth_reward_history.length >= nflot) {
      smooth_reward_history = smooth_reward_history.slice(1)
    }
    smooth_reward_history.push(smooth_reward)
    flott = 0
  }

  var agent = w.agents[0]
  if (typeof agent.expi !== 'undefined') {
    $('#expi').html(agent.expi)
  }
  if (typeof agent.tderror !== 'undefined') {
    $('#tde').html(agent.tderror.toFixed(3))
  }
}

// flot stuff
var nflot = 1000
function initFlot () {
  var container = $('#flotreward')
  var res = getFlotRewards()
  series = [{
    data: res,
    lines: { fill: true }
  }]
  var plot = $.plot(container, series, {
    grid: {
      borderWidth: 1,
      minBorderMargin: 20,
      labelMargin: 10,
      backgroundColor: {
        colors: ['#FFF', '#e4f4f4']
      },
      margin: {
        top: 10,
        bottom: 10,
        left: 10,
      }
    },
    xaxis: {
      min: 0,
      max: nflot
    },
    yaxis: {
      min: -0.1,
      max: 0.1
    }
  })
  setInterval(function () {
    series[0].data = getFlotRewards()
    plot.setData(series)
    plot.draw()
  }, 100)
}
function getFlotRewards () {
  // zip rewards into flot data
  var res = []
  for (var i = 0, n = smooth_reward_history.length; i < n; i++) {
    res.push([i, smooth_reward_history[i]])
  }
  return res
}

var simspeed = 2
function goveryfast () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 0)
  skipdraw = true
  simspeed = 3
}
function gofast () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 0)
  skipdraw = true
  simspeed = 2
}
function gonormal () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 30)
  skipdraw = false
  simspeed = 1
}
function goslow () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 200)
  skipdraw = false
  simspeed = 0
}

function saveAgent () {
  var brain = w.agents[0].brain
  $('#mysterybox').fadeIn()
  $('#mysterybox').val(JSON.stringify(brain.toJSON()))
}

function resetAgent () {
  eval($('#agentspec').val())
  var brain = new RL.DQNAgent(env, spec)
  w.agents[0].brain = brain
}

var w // global world object
var current_interval_id
var skipdraw = false
function start () {
  canvas = document.getElementById('canvas')
  ctx = canvas.getContext('2d')

  // agent parameter spec to play with (this gets eval()'d on Agent reset)
  var spec = {}
  spec.update = 'qlearn' // qlearn | sarsa
  spec.gamma = 0.9 // discount factor, [0, 1)
  spec.epsilon = 0.2 // initial epsilon for epsilon-greedy policy, [0, 1)
  spec.alpha = 0.005 // value function learning rate
  spec.experience_add_every = 5 // number of time steps before we add another experience to replay memory
  spec.experience_size = 10000 // size of experience
  spec.learning_steps_per_iteration = 5
  spec.tderror_clamp = 1.0 // for robustness
  spec.num_hidden_units = 100 // number of neurons in hidden layer

  w = new World()
  w.agents = []
  for (var k = 0; k < 1; k++) {
    var a = new Agent()
    env = a
    a.brain = new RL.DQNAgent(env, spec) // give agent a TD brain
    // a.brain = new RL.RecurrentReinforceAgent(env, {});
    w.agents.push(a)
  }
  console.log(w)
  gonormal()

}