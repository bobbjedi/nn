import RL from './libs/RL'

const randf = (lo: number, hi: number) => Math.random() * (hi - lo) + lo
const randi = (lo: number, hi: number) => Math.floor(randf(lo, hi))

// A 2D vector utility
class Vec {
  x: number
  y: number
  constructor (x: number, y: number) {
    this.x = x
    this.y = y
  }

  // utilities
  dist_from (v: Vec) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)) }
  length () { return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)) }

  // new vector returning operations
  add (v: Vec) { return new Vec(this.x + v.x, this.y + v.y) }
  sub (v: Vec) { return new Vec(this.x - v.x, this.y - v.y) }
  rotate (a: number) { // CLOCKWISE
    return new Vec(this.x * Math.cos(a) + this.y * Math.sin(a),
      -this.x * Math.sin(a) + this.y * Math.cos(a))
  }

  // in place operations
  scale (s: number) { this.x *= s; this.y *= s }
  normalize () { var d = this.length(); this.scale(1.0 / d) }
}

// line intersection helper function: does line segment (p1,p2) intersect segment (p3,p4) ?
const line_intersect = (p1: Vec, p2: Vec, p3: Vec, p4: Vec) => {
  var denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y)
  if (denom === 0.0) { return false } // parallel lines
  var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom
  var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom
  if (ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0) {
    var up = new Vec(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y))
    return { ua, ub, up } // up is intersection point
  }
  return false
}

const line_point_intersect = (p1: Vec, p2: Vec, p0: Vec, rad: number) => {
  var v = new Vec(p2.y - p1.y, -(p2.x - p1.x)) // perpendicular vector
  var d = Math.abs((p2.x - p1.x) * (p1.y - p0.y) - (p1.x - p0.x) * (p2.y - p1.y))
  d = d / v.length()
  if (d > rad) { return false }

  v.normalize()
  v.scale(d)
  var up = p0.add(v)
  let ua: number
  if (Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)) {
    ua = (up.x - p1.x) / (p2.x - p1.x)
  } else {
    ua = (up.y - p1.y) / (p2.y - p1.y)
  }
  if (ua > 0.0 && ua < 1.0) {
    return { ua: ua, up: up }
  }
  return false
}

// Wall is made up of two points
class Wall {
  p1: Vec
  p2: Vec
  constructor (p1: Vec, p2: Vec) {
    this.p1 = p1
    this.p2 = p2
  }
}

// World object contains many agents and walls and food and stuff
const util_add_box = (lst: Wall[], x: number, y: number, w: number, h: number) => {
  lst.push(new Wall(new Vec(x, y), new Vec(x + w, y)))
  lst.push(new Wall(new Vec(x + w, y), new Vec(x + w, y + h)))
  lst.push(new Wall(new Vec(x + w, y + h), new Vec(x, y + h)))
  lst.push(new Wall(new Vec(x, y + h), new Vec(x, y)))
}

// item is circle thing on the floor that agent can interact with (see or eat, etc)
class Item {
  p: Vec
  v: Vec
  type: any
  rad = 10
  age = 0
  cleanup_ = false
  constructor (x: number, y: number, type: any) {
    this.p = new Vec(x, y) // position
    this.v = new Vec(Math.random() * 5 - 2.5, Math.random() * 5 - 2.5)
    this.type = type
  }
}

export class World {
  canvas: HTMLCanvasElement
  agents: Agent[] = []
  W: number
  H: number
  walls: Wall[] = []
  items: Item[] = []
  collpoints: number[] = []
  clock = 0
  constructor (canvas: HTMLCanvasElement) {
    this.W = canvas.width
    this.H = canvas.height
    // set up walls in the world
    var pad = 0
    util_add_box(this.walls, pad, pad, this.W - pad * 2, this.H - pad * 2)
    /*
  util_add_box(this.walls, 100, 100, 200, 300); // inner walls
  this.walls.pop();
  util_add_box(this.walls, 400, 100, 200, 300);
  this.walls.pop();
  */

    // set up food and poison
    for (var k = 0; k < 50; k++) {
      var x = randf(20, this.W - 20)
      var y = randf(20, this.H - 20)
      var t = randi(1, 3) // food or poison (1 and 2)
      var it = new Item(x, y, t)
      this.items.push(it)
    }
  }

  initAgents (spec: any) {
    this.agents = []
    for (var k = 0; k < 1; k++) {
      const a = new Agent()
      a.brain = new (RL as any).DQNAgent(a, spec) // give agent a TD brain
      this.agents.push(a)
    }
  }

  // helper function to get closest colliding walls/items
  stuff_collide_ (p1: Vec, p2: Vec, check_walls: Vec, check_items: Vec) {
    let minres: any = false

    // collide with walls
    if (check_walls) {
      for (let i = 0, n = this.walls.length; i < n; i++) {
        const wall = this.walls[i]
        const res = line_intersect(p1, p2, wall.p1, wall.p2)
        if (res) {
          (res as any).type = 0 // 0 is wall
          if (!minres) { minres = res }
          else {
            // check if its closer
            if (res.ua < minres.ua) {
              // if yes replace it
              minres = res
            }
          }
        }
      }
    }

    // collide with items
    if (check_items) {
      for (let i = 0, n = this.items.length; i < n; i++) {
        const it = this.items[i]
        const res: any = line_point_intersect(p1, p2, it.p, it.rad)
        if (res) {
          res.type = it.type // store type of item
          res.vx = it.v.x // velocty information
          res.vy = it.v.y
          if (!minres) { minres = res }
          else {
            if (res.ua < minres.ua) { minres = res }
          }
        }
      }
    }

    return minres
  }

  tick () {
    // tick the environment
    this.clock++

    // fix input to all agents based on environment
    // process eyes
    this.collpoints = []
    for (let i = 0, n = this.agents.length; i < n; i++) {
      const a = this.agents[i]
      for (let ei = 0, ne = a.eyes.length; ei < ne; ei++) {
        var e = a.eyes[ei]
        // we have a line from p to p->eyep
        var eyep = new Vec(a.p.x + e.max_range * Math.sin(a.angle + e.angle),
          a.p.y + e.max_range * Math.cos(a.angle + e.angle))
        var res = this.stuff_collide_(a.p, eyep, (true as any as Vec), (true as any as Vec))
        if (res) {
          // eye collided with wall
          e.sensed_proximity = res.up.dist_from(a.p)
          e.sensed_type = res.type
          if ('vx' in res) {
            e.vx = res.vx
            e.vy = res.vy
          } else {
            e.vx = 0
            e.vy = 0
          }
        } else {
          e.sensed_proximity = e.max_range
          e.sensed_type = -1
          e.vx = 0
          e.vy = 0
        }
      }
    }

    // let the agents behave in the world based on their input
    for (let i = 0, n = this.agents.length; i < n; i++) {
      this.agents[i].forward()
    }
    // apply outputs of agents on evironment
    for (let i = 0, n = this.agents.length; i < n; i++) {
      const a = this.agents[i]
      a.op = a.p // back up old position
      a.oangle = a.angle // and angle

      // execute agent's desired action
      var speed = 1
      if (a.action === 0) {
        a.v.x += -speed
      }
      if (a.action === 1) {
        a.v.x += speed
      }
      if (a.action === 2) {
        a.v.y += -speed
      }
      if (a.action === 3) {
        a.v.y += speed
      }

      // forward the agent by velocity
      a.v.x *= 0.95; a.v.y *= 0.95
      a.p.x += a.v.x; a.p.y += a.v.y

      // agent is trying to move from p to op. Check walls
      // var res = this.stuff_collide_(a.op, a.p, true, false);
      // if(res) {
      // wall collision...
      // }

      // handle boundary conditions.. bounce agent
      if (a.p.x < 1) { a.p.x = 1; a.v.x = 0; a.v.y = 0 }
      if (a.p.x > this.W - 1) { a.p.x = this.W - 1; a.v.x = 0; a.v.y = 0 }
      if (a.p.y < 1) { a.p.y = 1; a.v.x = 0; a.v.y = 0 }
      if (a.p.y > this.H - 1) { a.p.y = this.H - 1; a.v.x = 0; a.v.y = 0 }

      // if(a.p.x<0) { a.p.x= this.W -1; };
      // if(a.p.x>this.W) { a.p.x= 1; }
      // if(a.p.y<0) { a.p.y= this.H -1; };
      // if(a.p.y>this.H) { a.p.y= 1; };
    }

    // tick all items
    var update_items = false
    for (var j = 0, m = this.agents.length; j < m; j++) {
      this.agents[j].digestion_signal = 0 // important - reset this!
    }
    for (var i = 0, n = this.items.length; i < n; i++) {
      var it = this.items[i]
      it.age += 1

      // see if some agent gets lunch
      for (let j = 0, m = this.agents.length; j < m; j++) {
        var a = this.agents[j]
        var d = a.p.dist_from(it.p)
        if (d < it.rad + a.rad) {

          // wait lets just make sure that this isn't through a wall
          // var rescheck = this.stuff_collide_(a.p, it.p, true, false);
          var rescheck = false
          if (!rescheck) {
            // ding! nom nom nom
            if (it.type === 1) { a.digestion_signal += 1.0 } // mmm delicious apple
            if (it.type === 2) { a.digestion_signal += -1.0 } // ewww poison
            it.cleanup_ = true
            update_items = true
            break // break out of loop, item was consumed
          }
        }
      }

      // move the items
      it.p.x += it.v.x
      it.p.y += it.v.y
      if (it.p.x < 1) { it.p.x = 1; it.v.x *= -1 }
      if (it.p.x > this.W - 1) { it.p.x = this.W - 1; it.v.x *= -1 }
      if (it.p.y < 1) { it.p.y = 1; it.v.y *= -1 }
      if (it.p.y > this.H - 1) { it.p.y = this.H - 1; it.v.y *= -1 }

      if (it.age > 5000 && this.clock % 100 === 0 && randf(0, 1) < 0.1) {
        it.cleanup_ = true // replace this one, has been around too long
        update_items = true
      }

    }
    if (update_items) {
      var nt = []
      for (let i = 0, n = this.items.length; i < n; i++) {
        let it = this.items[i]
        if (!it.cleanup_) { nt.push(it) }
      }
      this.items = nt // swap
    }
    if (this.items.length < 50 && this.clock % 10 === 0 && randf(0, 1) < 0.25) {
      var newitx = randf(20, this.W - 20)
      var newity = randf(20, this.H - 20)
      var newitt = randi(1, 3) // food or poison (1 and 2)
      var newit = new Item(newitx, newity, newitt)
      this.items.push(newit)
    }

    // agents are given the opportunity to learn based on feedback of their action on environment
    for (let i = 0, n = this.agents.length; i < n; i++) {
      this.agents[i].backward()
    }
  }
}

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

// A single agent
class Agent {

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
    for (var k = 0; k < 30; k++) { this.eyes.push(new Eye(k * 0.21)) }
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
    var ne = num_eyes * 5
    var input_array = new Array(this.num_states)
    for (var i = 0; i < num_eyes; i++) {
      var e = this.eyes[i]
      input_array[i * 5] = 1.0
      input_array[i * 5 + 1] = 1.0
      input_array[i * 5 + 2] = 1.0
      input_array[i * 5 + 3] = e.vx // velocity information of the sensed target
      input_array[i * 5 + 4] = e.vy
      if (e.sensed_type !== -1) {
        // sensed_type is 0 for wall, 1 for food and 2 for poison.
        // lets do a 1-of-k encoding into the input array
        input_array[i * 5 + e.sensed_type] = e.sensed_proximity / e.max_range // normalize to [0,1]
      }
    }
    // proprioception and orientation
    input_array[ne + 0] = this.v.x
    input_array[ne + 1] = this.v.y

    this.action = this.brain.act(input_array)
    // var action = this.actions[actionix];
    // demultiplex into behavior variables
    // this.action = action;
  }
  backward () {
    var reward = this.digestion_signal

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

// export { World }