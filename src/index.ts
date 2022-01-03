// import RL from './libs/RL'
import { Spec } from './libs/A2A'
import { World } from './World'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')
const world = new World(canvas)

// Draw everything
const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = 1
  var agents = world.agents

  // draw walls in environment
  ctx.strokeStyle = 'rgb(0,0,0)'
  ctx.beginPath()
  for (var i = 0, n = world.walls.length; i < n; i++) {
    var q = world.walls[i]
    ctx.moveTo(q.p1.x, q.p1.y)
    ctx.lineTo(q.p2.x, q.p2.y)
  }
  ctx.stroke()

  // draw agents
  // color agent based on reward it is experiencing at the moment
  var r = 0
  ctx.fillStyle = 'rgb(' + r + ', 150, 150)'
  ctx.strokeStyle = 'rgb(0,0,0)'
  for (let i = 0, n = agents.length; i < n; i++) {
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
  for (let i = 0, n = world.items.length; i < n; i++) {
    var it = world.items[i]
    if (it.type === 1) { ctx.fillStyle = 'rgb(255, 150, 150)' }
    if (it.type === 2) { ctx.fillStyle = 'rgb(150, 255, 150)' }
    ctx.beginPath()
    ctx.arc(it.p.x, it.p.y, it.rad, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.stroke()
  }
}

// Tick the world
function tick () {

  if (simspeed === 3) {
    for (var k = 0; k < 50; k++) {
      world.tick()
    }
  } else {
    world.tick()
  }
  draw()
}

let current_interval_id: any
// let skipdraw = false

const init = () => {
  const spec = {} as Spec
  spec.update = 'qlearn' // qlearn | sarsa
  spec.gamma = 0.9 // discount factor, [0, 1)
  spec.epsilon = 0.2 // initial epsilon for epsilon-greedy policy, [0, 1)
  spec.alpha = 0.05 // value function learning rate
  spec.experience_add_every = 5 // = 5. number of time steps before we add another experience to replay memory
  spec.experience_size = 10000 // size of experience
  spec.learning_steps_per_iteration = 5 // =20 better but slowly
  spec.tderror_clamp = 1.0 // for robustness
  spec.num_hidden_layers = [100, 50, 20] // number of neurons in hidden layer
  world.initAgents(spec, 1)
  setTimeout(goveryfast)
}
init()

// BUTTONS!

let simspeed = 2
function goveryfast () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 0)
  //   skipdraw = true
  simspeed = 3
}
function gofast () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 0)
  //   skipdraw = true
  simspeed = 2
}
function gonormal () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 30)
  //   skipdraw = false
  simspeed = 1
}
function goslow () {
  window.clearInterval(current_interval_id)
  current_interval_id = setInterval(tick, 200)
  //   skipdraw = false
  simspeed = 0
}
(window as any).goveryfast = goveryfast;
(window as any).gofast = gofast;
(window as any).gonormal = gonormal;
(window as any).goslow = goslow
// function saveAgent () {
//   var brain = world.agents[0].brain
//   JSON.stringify(brain.toJSON())
// }

// function resetAgent () {
// //   eval($('#agentspec').val())
//   var brain = new (RL as any).DQNAgent(env, spec)
//   world.agents[0].brain = brain
// }