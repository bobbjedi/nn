import { Vec } from './utills'

// World object contains many agents and walls and food and stuff
// Wall is made up of two points
export class Wall {
  p1: Vec
  p2: Vec
  constructor (p1: Vec, p2: Vec) {
    this.p1 = p1
    this.p2 = p2
  }
  static util_add_box = (lst: Wall[], x: number, y: number, w: number, h: number) => {
    lst.push(new Wall(new Vec(x, y), new Vec(x + w, y)))
    lst.push(new Wall(new Vec(x + w, y), new Vec(x + w, y + h)))
    lst.push(new Wall(new Vec(x + w, y + h), new Vec(x, y + h)))
    lst.push(new Wall(new Vec(x, y + h), new Vec(x, y)))
  }
}

// item is circle thing on the floor that agent can interact with (see or eat, etc)
export class Item {
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