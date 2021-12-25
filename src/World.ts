import { Agent } from './Agent'
import { Item, Wall } from './envClasses'
import RL from './libs/RL'
import { line_intersect, line_point_intersect, randf, randi, Vec } from './utills'

export class World {
  canvas: HTMLCanvasElement
  agents: Agent[] = []
  W: number
  H: number
  walls: Wall[] = []
  items: Item[] = []
  collpoints: number[] = []
  clock = 0
  itemsCount = 100
  constructor (canvas: HTMLCanvasElement, itemsCount: number) {
    this.W = canvas.width
    this.H = canvas.height
    this.itemsCount = itemsCount
    // set up walls in the world
    var pad = 0
    Wall.util_add_box(this.walls, pad, pad, this.W - pad * 2, this.H - pad * 2)

    // Wall.util_add_box(this.walls, 100, 100, 200, 300) // inner walls
    // this.walls.pop()
    // Wall.util_add_box(this.walls, 400, 100, 200, 300)
    // this.walls.pop()

    // set up food and poison
    for (var k = 0; k < itemsCount; k++) {
      var x = randf(20, this.W - 20)
      var y = randf(20, this.H - 20)
      var t = randi(1, 3) // food or poison (1 and 2)
      var it = new Item(x, y, t)
      this.items.push(it)
    }
  }

  initAgents (spec: any, agentsCount = 1) {
    this.agents = []
    for (var k = 0; k < agentsCount; k++) {
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

      // check collide for each Agent
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

      if (it.age > 5000 && this.clock % 10 === 0 && randf(0, 1) < 0.1) {
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
    if (this.items.length < this.itemsCount && this.clock % 10 === 0 && randf(0, 1) < 0.5 || this.items.length < (this.itemsCount / 2)) {
    // if (this.items.length < this.itemsCount) {
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