export const randf = (lo: number, hi: number) => Math.random() * (hi - lo) + lo
export const randi = (lo: number, hi: number) => Math.floor(randf(lo, hi))

// A 2D vector utility
export class Vec {
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
export const line_intersect = (p1: Vec, p2: Vec, p3: Vec, p4: Vec) => {
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

export const line_point_intersect = (p1: Vec, p2: Vec, p0: Vec, rad: number) => {
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