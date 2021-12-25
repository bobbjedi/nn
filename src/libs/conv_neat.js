
/*

	GA addon for convnet.js

	@licstart  The following is the entire license notice for the
	JavaScript code in this page.

	Copyright (C) 2015 david ha, otoro.net, otoro labs

	The JavaScript code in this page is free software: you can
	redistribute it and/or modify it under the terms of the GNU
	General Public License (GNU GPL) as published by the Free Software
	Foundation, either version 3 of the License, or (at your option)
	any later version.  The code is distributed WITHOUT ANY WARRANTY;
	without even the implied warranty of MERCHANTABILITY or FITNESS
	FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

	As additional permission under GNU GPL version 3 section 7, you
	may distribute non-source (e.g., minimized or compacted) forms of
	that code without the copy of the GNU GPL normally required by
	section 4, provided you include this license notice and a URL
	through which recipients can access the Corresponding Source.

	@licend  The above is the entire license notice
	for the JavaScript code in this page.
*/
var convnetjs = convnetjs || { REVISION: 'ALPHA' };
(function (global) {
  'use strict'

  // Random number utilities
  var return_v = false
  var v_val = 0.0
  var gaussRandom = function () {
    if (return_v) {
      return_v = false
      return v_val
    }
    var u = 2 * Math.random() - 1
    var v = 2 * Math.random() - 1
    var r = u * u + v * v
    if (r == 0 || r > 1) { return gaussRandom() }
    var c = Math.sqrt(-2 * Math.log(r) / r)
    v_val = v * c // cache this
    return_v = true
    return u * c
  }
  var randf = function (a, b) { return Math.random() * (b - a) + a }
  var randi = function (a, b) { return Math.floor(Math.random() * (b - a) + a) }
  var randn = function (mu, std) { return mu + gaussRandom() * std }

  // Array utilities
  var zeros = function (n) {
    if (typeof(n) === 'undefined' || isNaN(n)) { return [] }
    if (typeof ArrayBuffer === 'undefined') {
      // lacking browser support
      var arr = new Array(n)
      for (var i = 0; i < n; i++) { arr[i] = 0 }
      return arr
    } else {
      return new Float64Array(n)
    }
  }

  var arrContains = function (arr, elt) {
    for (var i = 0, n = arr.length; i < n; i++) {
      if (arr[i] === elt) { return true }
    }
    return false
  }

  var arrUnique = function (arr) {
    var b = []
    for (var i = 0, n = arr.length; i < n; i++) {
      if (!arrContains(b, arr[i])) {
        b.push(arr[i])
      }
    }
    return b
  }

  // return max and min of a given non-empty array.
  var maxmin = function (w) {
    if (w.length === 0) { return {} } // ... ;s
    var maxv = w[0]
    var minv = w[0]
    var maxi = 0
    var mini = 0
    var n = w.length
    for (var i = 1; i < n; i++) {
      if (w[i] > maxv) { maxv = w[i]; maxi = i }
      if (w[i] < minv) { minv = w[i]; mini = i }
    }
    return { maxi: maxi, maxv: maxv, mini: mini, minv: minv, dv: maxv - minv }
  }

  // create random permutation of numbers, in range [0...n-1]
  var randperm = function (n) {
    var i = n,
      j = 0,
      temp
    var array = []
    for (var q = 0; q < n; q++) { array[q] = q }
    while (i--) {
      j = Math.floor(Math.random() * (i + 1))
      temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
    return array
  }

  // sample from list lst according to probabilities in list probs
  // the two lists are of same size, and probs adds up to 1
  var weightedSample = function (lst, probs) {
    var p = randf(0, 1.0)
    var cumprob = 0.0
    for (var k = 0, n = lst.length; k < n; k++) {
      cumprob += probs[k]
      if (p < cumprob) { return lst[k] }
    }
  }

  // syntactic sugar function for getting default parameter values
  var getopt = function (opt, field_name, default_value) {
    return typeof opt[field_name] !== 'undefined' ? opt[field_name] : default_value
  }

  global.randf = randf
  global.randi = randi
  global.randn = randn
  global.zeros = zeros
  global.maxmin = maxmin
  global.randperm = randperm
  global.weightedSample = weightedSample
  global.arrUnique = arrUnique
  global.arrContains = arrContains
  global.getopt = getopt

})(convnetjs);
(function (global) {
  'use strict'

  // Vol is the basic building block of all data in a net.
  // it is essentially just a 3D volume of numbers, with a
  // width (sx), height (sy), and depth (depth).
  // it is used to hold data for all filters, all volumes,
  // all weights, and also stores all gradients w.r.t.
  // the data. c is optionally a value to initialize the volume
  // with. If c is missing, fills the Vol with random numbers.
  var Vol = function (sx, sy, depth, c) {
    // this is how you check if a variable is an array. Oh, Javascript :)
    if (Object.prototype.toString.call(sx) === '[object Array]') {
      // we were given a list in sx, assume 1D volume and fill it up
      this.sx = 1
      this.sy = 1
      this.depth = sx.length
      // we have to do the following copy because we want to use
      // fast typed arrays, not an ordinary javascript array
      this.w = global.zeros(this.depth)
      this.dw = global.zeros(this.depth)
      for (var i = 0; i < this.depth; i++) {
        this.w[i] = sx[i]
      }
    } else {
      // we were given dimensions of the vol
      this.sx = sx
      this.sy = sy
      this.depth = depth
      var n = sx * sy * depth
      this.w = global.zeros(n)
      this.dw = global.zeros(n)
      if (typeof c === 'undefined') {
        // weight normalization is done to equalize the output
        // variance of every neuron, otherwise neurons with a lot
        // of incoming connections have outputs of larger variance
        var scale = Math.sqrt(1.0 / (sx * sy * depth))
        for (var i = 0; i < n; i++) {
          this.w[i] = global.randn(0.0, scale)
        }
      } else {
        for (var i = 0; i < n; i++) {
          this.w[i] = c
        }
      }
    }
  }

  Vol.prototype = {
    get: function (x, y, d) {
      var ix = ((this.sx * y) + x) * this.depth + d
      return this.w[ix]
    },
    set: function (x, y, d, v) {
      var ix = ((this.sx * y) + x) * this.depth + d
      this.w[ix] = v
    },
    add: function (x, y, d, v) {
      var ix = ((this.sx * y) + x) * this.depth + d
      this.w[ix] += v
    },
    get_grad: function (x, y, d) {
      var ix = ((this.sx * y) + x) * this.depth + d
      return this.dw[ix]
    },
    set_grad: function (x, y, d, v) {
      var ix = ((this.sx * y) + x) * this.depth + d
      this.dw[ix] = v
    },
    add_grad: function (x, y, d, v) {
      var ix = ((this.sx * y) + x) * this.depth + d
      this.dw[ix] += v
    },
    cloneAndZero: function () { return new Vol(this.sx, this.sy, this.depth, 0.0) },
    clone: function () {
      var V = new Vol(this.sx, this.sy, this.depth, 0.0)
      var n = this.w.length
      for (var i = 0; i < n; i++) { V.w[i] = this.w[i] }
      return V
    },
    addFrom: function (V) { for (var k = 0; k < this.w.length; k++) { this.w[k] += V.w[k] } },
    addFromScaled: function (V, a) { for (var k = 0; k < this.w.length; k++) { this.w[k] += a * V.w[k] } },
    setConst: function (a) { for (var k = 0; k < this.w.length; k++) { this.w[k] = a } },

    toJSON: function () {
      // todo: we may want to only save d most significant digits to save space
      var json = {}
      json.sx = this.sx
      json.sy = this.sy
      json.depth = this.depth
      json.w = this.w
      return json
      // we wont back up gradients to save space
    },
    fromJSON: function (json) {
      this.sx = json.sx
      this.sy = json.sy
      this.depth = json.depth

      var n = this.sx * this.sy * this.depth
      this.w = global.zeros(n)
      this.dw = global.zeros(n)
      // copy over the elements.
      for (var i = 0; i < n; i++) {
        this.w[i] = json.w[i]
      }
    }
  }

  global.Vol = Vol
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // Volume utilities
  // intended for use with data augmentation
  // crop is the size of output
  // dx,dy are offset wrt incoming volume, of the shift
  // fliplr is boolean on whether we also want to flip left<->right
  var augment = function (V, crop, dx, dy, fliplr) {
    // note assumes square outputs of size crop x crop
    if (typeof(fliplr) === 'undefined') { var fliplr = false }
    if (typeof(dx) === 'undefined') { var dx = global.randi(0, V.sx - crop) }
    if (typeof(dy) === 'undefined') { var dy = global.randi(0, V.sy - crop) }

    // randomly sample a crop in the input volume
    var W
    if (crop !== V.sx || dx !== 0 || dy !== 0) {
      W = new Vol(crop, crop, V.depth, 0.0)
      for (var x = 0; x < crop; x++) {
        for (var y = 0; y < crop; y++) {
          if (x + dx < 0 || x + dx >= V.sx || y + dy < 0 || y + dy >= V.sy) { continue } // oob
          for (var d = 0; d < V.depth; d++) {
            W.set(x, y, d, V.get(x + dx, y + dy, d)) // copy data over
          }
        }
      }
    } else {
      W = V
    }

    if (fliplr) {
      // flip volume horziontally
      var W2 = W.cloneAndZero()
      for (var x = 0; x < W.sx; x++) {
        for (var y = 0; y < W.sy; y++) {
          for (var d = 0; d < W.depth; d++) {
            W2.set(x, y, d, W.get(W.sx - x - 1, y, d)) // copy data over
          }
        }
      }
      W = W2 // swap
    }
    return W
  }

  // img is a DOM element that contains a loaded image
  // returns a Vol of size (W, H, 4). 4 is for RGBA
  var img_to_vol = function (img, convert_grayscale) {

    if (typeof(convert_grayscale) === 'undefined') { var convert_grayscale = false }

    var canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    var ctx = canvas.getContext('2d')

    // due to a Firefox bug
    try {
      ctx.drawImage(img, 0, 0)
    } catch (e) {
      if (e.name === 'NS_ERROR_NOT_AVAILABLE') {
        // sometimes happens, lets just abort
        return false
      } else {
        throw e
      }
    }

    try {
      var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } catch (e) {
      if (e.name === 'IndexSizeError') {
        return false // not sure what causes this sometimes but okay abort
      } else {
        throw e
      }
    }

    // prepare the input: get pixels and normalize them
    var p = img_data.data
    var W = img.width
    var H = img.height
    var pv = []
    for (var i = 0; i < p.length; i++) {
      pv.push(p[i] / 255.0 - 0.5) // normalize image pixels to [-0.5, 0.5]
    }
    var x = new Vol(W, H, 4, 0.0) // input volume (image)
    x.w = pv

    if (convert_grayscale) {
      // flatten into depth=1 array
      var x1 = new Vol(W, H, 1, 0.0)
      for (var i = 0; i < W; i++) {
        for (var j = 0; j < H; j++) {
          x1.set(i, j, 0, x.get(i, j, 0))
        }
      }
      x = x1
    }

    return x
  }

  global.augment = augment
  global.img_to_vol = img_to_vol

})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // This file contains all layers that do dot products with input,
  // but usually in a different connectivity pattern and weight sharing
  // schemes:
  // - FullyConn is fully connected dot products
  // - ConvLayer does convolutions (so weight sharing spatially)
  // putting them together in one file because they are very similar
  var ConvLayer = function (opt) {
    var opt = opt || {}

    // required
    this.out_depth = opt.filters
    this.sx = opt.sx // filter size. Should be odd if possible, it's cleaner.
    this.in_depth = opt.in_depth
    this.in_sx = opt.in_sx
    this.in_sy = opt.in_sy

    // optional
    this.sy = typeof opt.sy !== 'undefined' ? opt.sy : this.sx
    this.stride = typeof opt.stride !== 'undefined' ? opt.stride : 1 // stride at which we apply filters to input volume
    this.pad = typeof opt.pad !== 'undefined' ? opt.pad : 0 // amount of 0 padding to add around borders of input volume
    this.l1_decay_mul = typeof opt.l1_decay_mul !== 'undefined' ? opt.l1_decay_mul : 0.0
    this.l2_decay_mul = typeof opt.l2_decay_mul !== 'undefined' ? opt.l2_decay_mul : 1.0

    // computed
    // note we are doing floor, so if the strided convolution of the filter doesnt fit into the input
    // volume exactly, the output volume will be trimmed and not contain the (incomplete) computed
    // final application.
    this.out_sx = Math.floor((this.in_sx + this.pad * 2 - this.sx) / this.stride + 1)
    this.out_sy = Math.floor((this.in_sy + this.pad * 2 - this.sy) / this.stride + 1)
    this.layer_type = 'conv'

    // initializations
    var bias = typeof opt.bias_pref !== 'undefined' ? opt.bias_pref : 0.0
    this.filters = []
    for (var i = 0; i < this.out_depth; i++) { this.filters.push(new Vol(this.sx, this.sy, this.in_depth)) }
    this.biases = new Vol(1, 1, this.out_depth, bias)
  }
  ConvLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V

      var A = new Vol(this.out_sx, this.out_sy, this.out_depth, 0.0)
      for (var d = 0; d < this.out_depth; d++) {
        var f = this.filters[d]
        var x = -this.pad
        var y = -this.pad
        for (var ax = 0; ax < this.out_sx; x += this.stride, ax++) {
          y = -this.pad
          for (var ay = 0; ay < this.out_sy; y += this.stride, ay++) {

            // convolve centered at this particular location
            // could be bit more efficient, going for correctness first
            var a = 0.0
            for (var fx = 0; fx < f.sx; fx++) {
              for (var fy = 0; fy < f.sy; fy++) {
                for (var fd = 0; fd < f.depth; fd++) {
                  var oy = y + fy // coordinates in the original input array coordinates
                  var ox = x + fx
                  if (oy >= 0 && oy < V.sy && ox >= 0 && ox < V.sx) {
                    // a += f.get(fx, fy, fd) * V.get(ox, oy, fd);
                    // avoid function call overhead for efficiency, compromise modularity :(
                    a += f.w[((f.sx * fy) + fx) * f.depth + fd] * V.w[((V.sx * oy) + ox) * V.depth + fd]
                  }
                }
              }
            }
            a += this.biases.w[d]
            A.set(ax, ay, d, a)
          }
        }
      }
      this.out_act = A
      return this.out_act
    },
    backward: function () {

      // compute gradient wrt weights, biases and input data
      var V = this.in_act
      V.dw = global.zeros(V.w.length) // zero out gradient wrt bottom data, we're about to fill it
      for (var d = 0; d < this.out_depth; d++) {
        var f = this.filters[d]
        var x = -this.pad
        var y = -this.pad
        for (var ax = 0; ax < this.out_sx; x += this.stride, ax++) {
          y = -this.pad
          for (var ay = 0; ay < this.out_sy; y += this.stride, ay++) {
            // convolve and add up the gradients.
            // could be more efficient, going for correctness first
            var chain_grad = this.out_act.get_grad(ax, ay, d) // gradient from above, from chain rule
            for (var fx = 0; fx < f.sx; fx++) {
              for (var fy = 0; fy < f.sy; fy++) {
                for (var fd = 0; fd < f.depth; fd++) {
                  var oy = y + fy
                  var ox = x + fx
                  if (oy >= 0 && oy < V.sy && ox >= 0 && ox < V.sx) {
                    // forward prop calculated: a += f.get(fx, fy, fd) * V.get(ox, oy, fd);
                    // f.add_grad(fx, fy, fd, V.get(ox, oy, fd) * chain_grad);
                    // V.add_grad(ox, oy, fd, f.get(fx, fy, fd) * chain_grad);

                    // avoid function call overhead and use Vols directly for efficiency
                    var ix1 = ((V.sx * oy) + ox) * V.depth + fd
                    var ix2 = ((f.sx * fy) + fx) * f.depth + fd
                    f.dw[ix2] += V.w[ix1] * chain_grad
                    V.dw[ix1] += f.w[ix2] * chain_grad
                  }
                }
              }
            }
            this.biases.dw[d] += chain_grad
          }
        }
      }
    },
    getParamsAndGrads: function () {
      var response = []
      for (var i = 0; i < this.out_depth; i++) {
        response.push({ params: this.filters[i].w, grads: this.filters[i].dw, l2_decay_mul: this.l2_decay_mul, l1_decay_mul: this.l1_decay_mul })
      }
      response.push({ params: this.biases.w, grads: this.biases.dw, l1_decay_mul: 0.0, l2_decay_mul: 0.0 })
      return response
    },
    toJSON: function () {
      var json = {}
      json.sx = this.sx // filter size in x, y dims
      json.sy = this.sy
      json.stride = this.stride
      json.in_depth = this.in_depth
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.l1_decay_mul = this.l1_decay_mul
      json.l2_decay_mul = this.l2_decay_mul
      json.pad = this.pad
      json.filters = []
      for (var i = 0; i < this.filters.length; i++) {
        json.filters.push(this.filters[i].toJSON())
      }
      json.biases = this.biases.toJSON()
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.sx = json.sx // filter size in x, y dims
      this.sy = json.sy
      this.stride = json.stride
      this.in_depth = json.in_depth // depth of input volume
      this.filters = []
      this.l1_decay_mul = typeof json.l1_decay_mul !== 'undefined' ? json.l1_decay_mul : 1.0
      this.l2_decay_mul = typeof json.l2_decay_mul !== 'undefined' ? json.l2_decay_mul : 1.0
      this.pad = typeof json.pad !== 'undefined' ? json.pad : 0
      for (var i = 0; i < json.filters.length; i++) {
        var v = new Vol(0, 0, 0, 0)
        v.fromJSON(json.filters[i])
        this.filters.push(v)
      }
      this.biases = new Vol(0, 0, 0, 0)
      this.biases.fromJSON(json.biases)
    }
  }

  var FullyConnLayer = function (opt) {
    var opt = opt || {}

    // required
    // ok fine we will allow 'filters' as the word as well
    this.out_depth = typeof opt.num_neurons !== 'undefined' ? opt.num_neurons : opt.filters

    // optional
    this.l1_decay_mul = typeof opt.l1_decay_mul !== 'undefined' ? opt.l1_decay_mul : 0.0
    this.l2_decay_mul = typeof opt.l2_decay_mul !== 'undefined' ? opt.l2_decay_mul : 1.0

    // computed
    this.num_inputs = opt.in_sx * opt.in_sy * opt.in_depth
    this.out_sx = 1
    this.out_sy = 1
    this.layer_type = 'fc'

    // initializations
    var bias = typeof opt.bias_pref !== 'undefined' ? opt.bias_pref : 0.0
    this.filters = []
    for (var i = 0; i < this.out_depth; i++) { this.filters.push(new Vol(1, 1, this.num_inputs)) }
    this.biases = new Vol(1, 1, this.out_depth, bias)
  }

  FullyConnLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var A = new Vol(1, 1, this.out_depth, 0.0)
      var Vw = V.w
      for (var i = 0; i < this.out_depth; i++) {
        var a = 0.0
        var wi = this.filters[i].w
        for (var d = 0; d < this.num_inputs; d++) {
          a += Vw[d] * wi[d] // for efficiency use Vols directly for now
        }
        a += this.biases.w[i]
        A.w[i] = a
      }
      this.out_act = A
      return this.out_act
    },
    backward: function () {
      var V = this.in_act
      V.dw = global.zeros(V.w.length) // zero out the gradient in input Vol

      // compute gradient wrt weights and data
      for (var i = 0; i < this.out_depth; i++) {
        var tfi = this.filters[i]
        var chain_grad = this.out_act.dw[i]
        for (var d = 0; d < this.num_inputs; d++) {
          V.dw[d] += tfi.w[d] * chain_grad // grad wrt input data
          tfi.dw[d] += V.w[d] * chain_grad // grad wrt params
        }
        this.biases.dw[i] += chain_grad
      }
    },
    getParamsAndGrads: function () {
      var response = []
      for (var i = 0; i < this.out_depth; i++) {
        response.push({ params: this.filters[i].w, grads: this.filters[i].dw, l1_decay_mul: this.l1_decay_mul, l2_decay_mul: this.l2_decay_mul })
      }
      response.push({ params: this.biases.w, grads: this.biases.dw, l1_decay_mul: 0.0, l2_decay_mul: 0.0 })
      return response
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.num_inputs = this.num_inputs
      json.l1_decay_mul = this.l1_decay_mul
      json.l2_decay_mul = this.l2_decay_mul
      json.filters = []
      for (var i = 0; i < this.filters.length; i++) {
        json.filters.push(this.filters[i].toJSON())
      }
      json.biases = this.biases.toJSON()
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.num_inputs = json.num_inputs
      this.l1_decay_mul = typeof json.l1_decay_mul !== 'undefined' ? json.l1_decay_mul : 1.0
      this.l2_decay_mul = typeof json.l2_decay_mul !== 'undefined' ? json.l2_decay_mul : 1.0
      this.filters = []
      for (var i = 0; i < json.filters.length; i++) {
        var v = new Vol(0, 0, 0, 0)
        v.fromJSON(json.filters[i])
        this.filters.push(v)
      }
      this.biases = new Vol(0, 0, 0, 0)
      this.biases.fromJSON(json.biases)
    }
  }

  global.ConvLayer = ConvLayer
  global.FullyConnLayer = FullyConnLayer

})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  var PoolLayer = function (opt) {

    var opt = opt || {}

    // required
    this.sx = opt.sx // filter size
    this.in_depth = opt.in_depth
    this.in_sx = opt.in_sx
    this.in_sy = opt.in_sy

    // optional
    this.sy = typeof opt.sy !== 'undefined' ? opt.sy : this.sx
    this.stride = typeof opt.stride !== 'undefined' ? opt.stride : 2
    this.pad = typeof opt.pad !== 'undefined' ? opt.pad : 0 // amount of 0 padding to add around borders of input volume

    // computed
    this.out_depth = this.in_depth
    this.out_sx = Math.floor((this.in_sx + this.pad * 2 - this.sx) / this.stride + 1)
    this.out_sy = Math.floor((this.in_sy + this.pad * 2 - this.sy) / this.stride + 1)
    this.layer_type = 'pool'
    // store switches for x,y coordinates for where the max comes from, for each output neuron
    this.switchx = global.zeros(this.out_sx * this.out_sy * this.out_depth)
    this.switchy = global.zeros(this.out_sx * this.out_sy * this.out_depth)
  }

  PoolLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V

      var A = new Vol(this.out_sx, this.out_sy, this.out_depth, 0.0)

      var n = 0 // a counter for switches
      for (var d = 0; d < this.out_depth; d++) {
        var x = -this.pad
        var y = -this.pad
        for (var ax = 0; ax < this.out_sx; x += this.stride, ax++) {
          y = -this.pad
          for (var ay = 0; ay < this.out_sy; y += this.stride, ay++) {

            // convolve centered at this particular location
            var a = -99999 // hopefully small enough ;\
            var winx = -1, winy = -1
            for (var fx = 0; fx < this.sx; fx++) {
              for (var fy = 0; fy < this.sy; fy++) {
                var oy = y + fy
                var ox = x + fx
                if (oy >= 0 && oy < V.sy && ox >= 0 && ox < V.sx) {
                  var v = V.get(ox, oy, d)
                  // perform max pooling and store pointers to where
                  // the max came from. This will speed up backprop
                  // and can help make nice visualizations in future
                  if (v > a) { a = v; winx = ox; winy = oy }
                }
              }
            }
            this.switchx[n] = winx
            this.switchy[n] = winy
            n++
            A.set(ax, ay, d, a)
          }
        }
      }
      this.out_act = A
      return this.out_act
    },
    backward: function () {
      // pooling layers have no parameters, so simply compute
      // gradient wrt data here
      var V = this.in_act
      V.dw = global.zeros(V.w.length) // zero out gradient wrt data
      var A = this.out_act // computed in forward pass

      var n = 0
      for (var d = 0; d < this.out_depth; d++) {
        var x = -this.pad
        var y = -this.pad
        for (var ax = 0; ax < this.out_sx; x += this.stride, ax++) {
          y = -this.pad
          for (var ay = 0; ay < this.out_sy; y += this.stride, ay++) {

            var chain_grad = this.out_act.get_grad(ax, ay, d)
            V.add_grad(this.switchx[n], this.switchy[n], d, chain_grad)
            n++

          }
        }
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.sx = this.sx
      json.sy = this.sy
      json.stride = this.stride
      json.in_depth = this.in_depth
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.pad = this.pad
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.sx = json.sx
      this.sy = json.sy
      this.stride = json.stride
      this.in_depth = json.in_depth
      this.pad = typeof json.pad !== 'undefined' ? json.pad : 0 // backwards compatibility
      this.switchx = global.zeros(this.out_sx * this.out_sy * this.out_depth) // need to re-init these appropriately
      this.switchy = global.zeros(this.out_sx * this.out_sy * this.out_depth)
    }
  }

  global.PoolLayer = PoolLayer

})(convnetjs);

(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  var InputLayer = function (opt) {
    var opt = opt || {}

    // this is a bit silly but lets allow people to specify either ins or outs
    this.out_sx = typeof opt.out_sx !== 'undefined' ? opt.out_sx : opt.in_sx
    this.out_sy = typeof opt.out_sy !== 'undefined' ? opt.out_sy : opt.in_sy
    this.out_depth = typeof opt.out_depth !== 'undefined' ? opt.out_depth : opt.in_depth
    this.layer_type = 'input'
  }
  InputLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      this.out_act = V
      return this.out_act // dummy identity function for now
    },
    backward: function () { },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
    }
  }

  global.InputLayer = InputLayer
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // Layers that implement a loss. Currently these are the layers that
  // can initiate a backward() pass. In future we probably want a more
  // flexible system that can accomodate multiple losses to do multi-task
  // learning, and stuff like that. But for now, one of the layers in this
  // file must be the final layer in a Net.

  // This is a classifier, with N discrete classes from 0 to N-1
  // it gets a stream of N incoming numbers and computes the softmax
  // function (exponentiate and normalize to sum to 1 as probabilities should)
  var SoftmaxLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.num_inputs = opt.in_sx * opt.in_sy * opt.in_depth
    this.out_depth = this.num_inputs
    this.out_sx = 1
    this.out_sy = 1
    this.layer_type = 'softmax'
  }

  SoftmaxLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V

      var A = new Vol(1, 1, this.out_depth, 0.0)

      // compute max activation
      var as = V.w
      var amax = V.w[0]
      for (var i = 1; i < this.out_depth; i++) {
        if (as[i] > amax) { amax = as[i] }
      }

      // compute exponentials (carefully to not blow up)
      var es = global.zeros(this.out_depth)
      var esum = 0.0
      for (var i = 0; i < this.out_depth; i++) {
        var e = Math.exp(as[i] - amax)
        esum += e
        es[i] = e
      }

      // normalize and output to sum to one
      for (var i = 0; i < this.out_depth; i++) {
        es[i] /= esum
        A.w[i] = es[i]
      }

      this.es = es // save these for backprop
      this.out_act = A
      return this.out_act
    },
    backward: function (y) {

      // compute and accumulate gradient wrt weights and bias of this layer
      var x = this.in_act
      x.dw = global.zeros(x.w.length) // zero out the gradient of input Vol

      for (var i = 0; i < this.out_depth; i++) {
        var indicator = i === y ? 1.0 : 0.0
        var mul = -(indicator - this.es[i])
        x.dw[i] = mul
      }

      // loss is the class negative log likelihood
      return -Math.log(this.es[y])
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.num_inputs = this.num_inputs
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.num_inputs = json.num_inputs
    }
  }

  // implements an L2 regression cost layer,
  // so penalizes \sum_i(||x_i - y_i||^2), where x is its input
  // and y is the user-provided array of "correct" values.
  var RegressionLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.num_inputs = opt.in_sx * opt.in_sy * opt.in_depth
    this.out_depth = this.num_inputs
    this.out_sx = 1
    this.out_sy = 1
    this.layer_type = 'regression'
  }

  RegressionLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      this.out_act = V
      return V // identity function
    },
    // y is a list here of size num_inputs
    backward: function (y) {

      // compute and accumulate gradient wrt weights and bias of this layer
      var x = this.in_act
      x.dw = global.zeros(x.w.length) // zero out the gradient of input Vol
      var loss = 0.0
      if (y instanceof Array || y instanceof Float64Array) {
        for (var i = 0; i < this.out_depth; i++) {
          var dy = x.w[i] - y[i]
          x.dw[i] = dy
          loss += 2 * dy * dy
        }
      } else {
        // assume it is a struct with entries .dim and .val
        // and we pass gradient only along dimension dim to be equal to val
        var i = y.dim
        var yi = y.val
        var dy = x.w[i] - yi
        x.dw[i] = dy
        loss += 2 * dy * dy
      }
      return loss
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.num_inputs = this.num_inputs
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.num_inputs = json.num_inputs
    }
  }

  var SVMLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.num_inputs = opt.in_sx * opt.in_sy * opt.in_depth
    this.out_depth = this.num_inputs
    this.out_sx = 1
    this.out_sy = 1
    this.layer_type = 'svm'
  }

  SVMLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      this.out_act = V // nothing to do, output raw scores
      return V
    },
    backward: function (y) {

      // compute and accumulate gradient wrt weights and bias of this layer
      var x = this.in_act
      x.dw = global.zeros(x.w.length) // zero out the gradient of input Vol

      var yscore = x.w[y] // score of ground truth
      var margin = 1.0
      var loss = 0.0
      for (var i = 0; i < this.out_depth; i++) {
        if (-yscore + x.w[i] + margin > 0) {
          // violating example, apply loss
          // I love hinge loss, by the way. Truly.
          // Seriously, compare this SVM code with Softmax forward AND backprop code above
          // it's clear which one is superior, not only in code, simplicity
          // and beauty, but also in practice.
          x.dw[i] += 1
          x.dw[y] -= 1
          loss += -yscore + x.w[i] + margin
        }
      }

      return loss
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.num_inputs = this.num_inputs
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.num_inputs = json.num_inputs
    }
  }

  global.RegressionLayer = RegressionLayer
  global.SoftmaxLayer = SoftmaxLayer
  global.SVMLayer = SVMLayer

})(convnetjs);

(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // Implements ReLU nonlinearity elementwise
  // x -> max(0, x)
  // the output is in [0, inf)
  var ReluLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = opt.in_depth
    this.layer_type = 'relu'
  }
  ReluLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var V2 = V.clone()
      var N = V.w.length
      var V2w = V2.w
      for (var i = 0; i < N; i++) {
        if (V2w[i] < 0) { V2w[i] = 0 } // threshold at 0
      }
      this.out_act = V2
      return this.out_act
    },
    backward: function () {
      var V = this.in_act // we need to set dw of this
      var V2 = this.out_act
      var N = V.w.length
      V.dw = global.zeros(N) // zero out gradient wrt data
      for (var i = 0; i < N; i++) {
        if (V2.w[i] <= 0) { V.dw[i] = 0 } // threshold
        else { V.dw[i] = V2.dw[i] }
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
    }
  }

  // Implements Sigmoid nnonlinearity elementwise
  // x -> 1/(1+e^(-x))
  // so the output is between 0 and 1.
  var SigmoidLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = opt.in_depth
    this.layer_type = 'sigmoid'
  }
  SigmoidLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var V2 = V.cloneAndZero()
      var N = V.w.length
      var V2w = V2.w
      var Vw = V.w
      for (var i = 0; i < N; i++) {
        V2w[i] = 1.0 / (1.0 + Math.exp(-Vw[i]))
      }
      this.out_act = V2
      return this.out_act
    },
    backward: function () {
      var V = this.in_act // we need to set dw of this
      var V2 = this.out_act
      var N = V.w.length
      V.dw = global.zeros(N) // zero out gradient wrt data
      for (var i = 0; i < N; i++) {
        var v2wi = V2.w[i]
        V.dw[i] = v2wi * (1.0 - v2wi) * V2.dw[i]
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
    }
  }

  // Implements Maxout nnonlinearity that computes
  // x -> max(x)
  // where x is a vector of size group_size. Ideally of course,
  // the input size should be exactly divisible by group_size
  var MaxoutLayer = function (opt) {
    var opt = opt || {}

    // required
    this.group_size = typeof opt.group_size !== 'undefined' ? opt.group_size : 2

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = Math.floor(opt.in_depth / this.group_size)
    this.layer_type = 'maxout'

    this.switches = global.zeros(this.out_sx * this.out_sy * this.out_depth) // useful for backprop
  }
  MaxoutLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var N = this.out_depth
      var V2 = new Vol(this.out_sx, this.out_sy, this.out_depth, 0.0)

      // optimization branch. If we're operating on 1D arrays we dont have
      // to worry about keeping track of x,y,d coordinates inside
      // input volumes. In convnets we do :(
      if (this.out_sx === 1 && this.out_sy === 1) {
        for (var i = 0; i < N; i++) {
          var ix = i * this.group_size // base index offset
          var a = V.w[ix]
          var ai = 0
          for (var j = 1; j < this.group_size; j++) {
            var a2 = V.w[ix + j]
            if (a2 > a) {
              a = a2
              ai = j
            }
          }
          V2.w[i] = a
          this.switches[i] = ix + ai
        }
      } else {
        var n = 0 // counter for switches
        for (var x = 0; x < V.sx; x++) {
          for (var y = 0; y < V.sy; y++) {
            for (var i = 0; i < N; i++) {
              var ix = i * this.group_size
              var a = V.get(x, y, ix)
              var ai = 0
              for (var j = 1; j < this.group_size; j++) {
                var a2 = V.get(x, y, ix + j)
                if (a2 > a) {
                  a = a2
                  ai = j
                }
              }
              V2.set(x, y, i, a)
              this.switches[n] = ix + ai
              n++
            }
          }
        }

      }
      this.out_act = V2
      return this.out_act
    },
    backward: function () {
      var V = this.in_act // we need to set dw of this
      var V2 = this.out_act
      var N = this.out_depth
      V.dw = global.zeros(V.w.length) // zero out gradient wrt data

      // pass the gradient through the appropriate switch
      if (this.out_sx === 1 && this.out_sy === 1) {
        for (var i = 0; i < N; i++) {
          var chain_grad = V2.dw[i]
          V.dw[this.switches[i]] = chain_grad
        }
      } else {
        // bleh okay, lets do this the hard way
        var n = 0 // counter for switches
        for (var x = 0; x < V2.sx; x++) {
          for (var y = 0; y < V2.sy; y++) {
            for (var i = 0; i < N; i++) {
              var chain_grad = V2.get_grad(x, y, i)
              V.set_grad(x, y, this.switches[n], chain_grad)
              n++
            }
          }
        }
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.group_size = this.group_size
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.group_size = json.group_size
      this.switches = global.zeros(this.group_size)
    }
  }

  // a helper function, since tanh is not yet part of ECMAScript. Will be in v6.
  function tanh (x) {
    var y = Math.exp(2 * x)
    return (y - 1) / (y + 1)
  }
  // Implements Tanh nnonlinearity elementwise
  // x -> tanh(x)
  // so the output is between -1 and 1.
  var TanhLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = opt.in_depth
    this.layer_type = 'tanh'
  }
  TanhLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var V2 = V.cloneAndZero()
      var N = V.w.length
      for (var i = 0; i < N; i++) {
        V2.w[i] = tanh(V.w[i])
      }
      this.out_act = V2
      return this.out_act
    },
    backward: function () {
      var V = this.in_act // we need to set dw of this
      var V2 = this.out_act
      var N = V.w.length
      V.dw = global.zeros(N) // zero out gradient wrt data
      for (var i = 0; i < N; i++) {
        var v2wi = V2.w[i]
        V.dw[i] = (1.0 - v2wi * v2wi) * V2.dw[i]
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
    }
  }

  global.TanhLayer = TanhLayer
  global.MaxoutLayer = MaxoutLayer
  global.ReluLayer = ReluLayer
  global.SigmoidLayer = SigmoidLayer

})(convnetjs);

(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // An inefficient dropout layer
  // Note this is not most efficient implementation since the layer before
  // computed all these activations and now we're just going to drop them :(
  // same goes for backward pass. Also, if we wanted to be efficient at test time
  // we could equivalently be clever and upscale during train and copy pointers during test
  // todo: make more efficient.
  var DropoutLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = opt.in_depth
    this.layer_type = 'dropout'
    this.drop_prob = typeof opt.drop_prob !== 'undefined' ? opt.drop_prob : 0.5
    this.dropped = global.zeros(this.out_sx * this.out_sy * this.out_depth)
  }
  DropoutLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      if (typeof(is_training) === 'undefined') { is_training = false } // default is prediction mode
      var V2 = V.clone()
      var N = V.w.length
      if (is_training) {
        // do dropout
        for (var i = 0; i < N; i++) {
          if (Math.random() < this.drop_prob) { V2.w[i] = 0; this.dropped[i] = true } // drop!
          else { this.dropped[i] = false }
        }
      } else {
        // scale the activations during prediction
        for (var i = 0; i < N; i++) { V2.w[i] *= this.drop_prob }
      }
      this.out_act = V2
      return this.out_act // dummy identity function for now
    },
    backward: function () {
      var V = this.in_act // we need to set dw of this
      var chain_grad = this.out_act
      var N = V.w.length
      V.dw = global.zeros(N) // zero out gradient wrt data
      for (var i = 0; i < N; i++) {
        if (!(this.dropped[i])) {
          V.dw[i] = chain_grad.dw[i] // copy over the gradient
        }
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      json.drop_prob = this.drop_prob
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
      this.drop_prob = json.drop_prob
    }
  }

  global.DropoutLayer = DropoutLayer
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // a bit experimental layer for now. I think it works but I'm not 100%
  // the gradient check is a bit funky. I'll look into this a bit later.
  // Local Response Normalization in window, along depths of volumes
  var LocalResponseNormalizationLayer = function (opt) {
    var opt = opt || {}

    // required
    this.k = opt.k
    this.n = opt.n
    this.alpha = opt.alpha
    this.beta = opt.beta

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    this.out_depth = opt.in_depth
    this.layer_type = 'lrn'

    // checks
    if (this.n % 2 === 0) { console.log('WARNING n should be odd for LRN layer') }
  }
  LocalResponseNormalizationLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V

      var A = V.cloneAndZero()
      this.S_cache_ = V.cloneAndZero()
      var n2 = Math.floor(this.n / 2)
      for (var x = 0; x < V.sx; x++) {
        for (var y = 0; y < V.sy; y++) {
          for (var i = 0; i < V.depth; i++) {

            var ai = V.get(x, y, i)

            // normalize in a window of size n
            var den = 0.0
            for (var j = Math.max(0, i - n2); j <= Math.min(i + n2, V.depth - 1); j++) {
              var aa = V.get(x, y, j)
              den += aa * aa
            }
            den *= this.alpha / this.n
            den += this.k
            this.S_cache_.set(x, y, i, den) // will be useful for backprop
            den = Math.pow(den, this.beta)
            A.set(x, y, i, ai / den)
          }
        }
      }

      this.out_act = A
      return this.out_act // dummy identity function for now
    },
    backward: function () {
      // evaluate gradient wrt data
      var V = this.in_act // we need to set dw of this
      V.dw = global.zeros(V.w.length) // zero out gradient wrt data
      var A = this.out_act // computed in forward pass

      var n2 = Math.floor(this.n / 2)
      for (var x = 0; x < V.sx; x++) {
        for (var y = 0; y < V.sy; y++) {
          for (var i = 0; i < V.depth; i++) {

            var chain_grad = this.out_act.get_grad(x, y, i)
            var S = this.S_cache_.get(x, y, i)
            var SB = Math.pow(S, this.beta)
            var SB2 = SB * SB

            // normalize in a window of size n
            for (var j = Math.max(0, i - n2); j <= Math.min(i + n2, V.depth - 1); j++) {
              var aj = V.get(x, y, j)
              var g = -aj * this.beta * Math.pow(S, this.beta - 1) * this.alpha / this.n * 2 * aj
              if (j === i) { g += SB }
              g /= SB2
              g *= chain_grad
              V.add_grad(x, y, j, g)
            }

          }
        }
      }
    },
    getParamsAndGrads: function () { return [] },
    toJSON: function () {
      var json = {}
      json.k = this.k
      json.n = this.n
      json.alpha = this.alpha // normalize by size
      json.beta = this.beta
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.out_depth = this.out_depth
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.k = json.k
      this.n = json.n
      this.alpha = json.alpha // normalize by size
      this.beta = json.beta
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.out_depth = json.out_depth
      this.layer_type = json.layer_type
    }
  }

  global.LocalResponseNormalizationLayer = LocalResponseNormalizationLayer
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // transforms x-> [x, x_i*x_j forall i,j]
  // so the fully connected layer afters will essentially be doing tensor multiplies
  var QuadTransformLayer = function (opt) {
    var opt = opt || {}

    // computed
    this.out_sx = opt.in_sx
    this.out_sy = opt.in_sy
    // linear terms, and then quadratic terms, of which there are 1/2*n*(n+1),
    // (offdiagonals and the diagonal total) and arithmetic series.
    // Actually never mind, lets not be fancy here yet and just include
    // terms x_ix_j and x_jx_i twice. Half as efficient but much less
    // headache.
    this.out_depth = opt.in_depth + opt.in_depth * opt.in_depth
    this.layer_type = 'quadtransform'

  }
  QuadTransformLayer.prototype = {
    forward: function (V, is_training) {
      this.in_act = V
      var N = this.out_depth
      var Ni = V.depth
      var V2 = new Vol(this.out_sx, this.out_sy, this.out_depth, 0.0)
      for (var x = 0; x < V.sx; x++) {
        for (var y = 0; y < V.sy; y++) {
          for (var i = 0; i < N; i++) {
            if (i < Ni) {
              V2.set(x, y, i, V.get(x, y, i)) // copy these over (linear terms)
            } else {
              var i0 = Math.floor((i - Ni) / Ni)
              var i1 = (i - Ni) - i0 * Ni
              V2.set(x, y, i, V.get(x, y, i0) * V.get(x, y, i1)) // quadratic
            }
          }
        }
      }
      this.out_act = V2
      return this.out_act // dummy identity function for now
    },
    backward: function () {
      var V = this.in_act
      V.dw = global.zeros(V.w.length) // zero out gradient wrt data
      var V2 = this.out_act
      var N = this.out_depth
      var Ni = V.depth
      for (var x = 0; x < V.sx; x++) {
        for (var y = 0; y < V.sy; y++) {
          for (var i = 0; i < N; i++) {
            var chain_grad = V2.get_grad(x, y, i)
            if (i < Ni) {
              V.add_grad(x, y, i, chain_grad)
            } else {
              var i0 = Math.floor((i - Ni) / Ni)
              var i1 = (i - Ni) - i0 * Ni
              V.add_grad(x, y, i0, V.get(x, y, i1) * chain_grad)
              V.add_grad(x, y, i1, V.get(x, y, i0) * chain_grad)
            }
          }
        }
      }
    },
    getParamsAndGrads: function () {
      return []
    },
    toJSON: function () {
      var json = {}
      json.out_depth = this.out_depth
      json.out_sx = this.out_sx
      json.out_sy = this.out_sy
      json.layer_type = this.layer_type
      return json
    },
    fromJSON: function (json) {
      this.out_depth = json.out_depth
      this.out_sx = json.out_sx
      this.out_sy = json.out_sy
      this.layer_type = json.layer_type
    }
  }

  global.QuadTransformLayer = QuadTransformLayer
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  // Net manages a set of layers
  // For now constraints: Simple linear order of layers, first layer input last layer a cost layer
  var Net = function (options) {
    this.layers = []
  }

  Net.prototype = {

    // takes a list of layer definitions and creates the network layer objects
    makeLayers: function (defs) {

      // few checks for now
      if (defs.length < 2) { console.log('ERROR! For now at least have input and softmax layers.') }
      if (defs[0].type !== 'input') { console.log('ERROR! For now first layer should be input.') }

      // desugar syntactic for adding activations and dropouts
      var desugar = function () {
        var new_defs = []
        for (var i = 0; i < defs.length; i++) {
          var def = defs[i]

          if (def.type === 'softmax' || def.type === 'svm') {
            // add an fc layer here, there is no reason the user should
            // have to worry about this and we almost always want to
            new_defs.push({ type: 'fc', num_neurons: def.num_classes })
          }

          if (def.type === 'regression') {
            // add an fc layer here, there is no reason the user should
            // have to worry about this and we almost always want to
            new_defs.push({ type: 'fc', num_neurons: def.num_neurons })
          }

          if ((def.type === 'fc' || def.type === 'conv')
              && typeof(def.bias_pref) === 'undefined') {
            def.bias_pref = 0.0
            if (typeof def.activation !== 'undefined' && def.activation === 'relu') {
              def.bias_pref = 0.1 // relus like a bit of positive bias to get gradients early
              // otherwise it's technically possible that a relu unit will never turn on (by chance)
              // and will never get any gradient and never contribute any computation. Dead relu.
            }
          }

          if (typeof def.tensor !== 'undefined') {
            // apply quadratic transform so that the upcoming multiply will include
            // quadratic terms, equivalent to doing a tensor product
            if (def.tensor) {
              new_defs.push({ type: 'quadtransform' })
            }
          }

          new_defs.push(def)

          if (typeof def.activation !== 'undefined') {
            if (def.activation === 'relu') { new_defs.push({ type: 'relu' }) }
            else if (def.activation === 'sigmoid') { new_defs.push({ type: 'sigmoid' }) }
            else if (def.activation === 'tanh') { new_defs.push({ type: 'tanh' }) }
            else if (def.activation === 'maxout') {
              // create maxout activation, and pass along group size, if provided
              var gs = def.group_size !== 'undefined' ? def.group_size : 2
              new_defs.push({ type: 'maxout', group_size: gs })
            }
            else { console.log('ERROR unsupported activation ' + def.activation) }
          }
          if (typeof def.drop_prob !== 'undefined' && def.type !== 'dropout') {
            new_defs.push({ type: 'dropout', drop_prob: def.drop_prob })
          }

        }
        return new_defs
      }
      defs = desugar(defs)

      // create the layers
      this.layers = []
      for (var i = 0; i < defs.length; i++) {
        var def = defs[i]
        if (i > 0) {
          var prev = this.layers[i - 1]
          def.in_sx = prev.out_sx
          def.in_sy = prev.out_sy
          def.in_depth = prev.out_depth
        }

        switch (def.type) {
        case 'fc': this.layers.push(new global.FullyConnLayer(def)); break
        case 'lrn': this.layers.push(new global.LocalResponseNormalizationLayer(def)); break
        case 'dropout': this.layers.push(new global.DropoutLayer(def)); break
        case 'input': this.layers.push(new global.InputLayer(def)); break
        case 'softmax': this.layers.push(new global.SoftmaxLayer(def)); break
        case 'regression': this.layers.push(new global.RegressionLayer(def)); break
        case 'conv': this.layers.push(new global.ConvLayer(def)); break
        case 'pool': this.layers.push(new global.PoolLayer(def)); break
        case 'relu': this.layers.push(new global.ReluLayer(def)); break
        case 'sigmoid': this.layers.push(new global.SigmoidLayer(def)); break
        case 'tanh': this.layers.push(new global.TanhLayer(def)); break
        case 'maxout': this.layers.push(new global.MaxoutLayer(def)); break
        case 'quadtransform': this.layers.push(new global.QuadTransformLayer(def)); break
        case 'svm': this.layers.push(new global.SVMLayer(def)); break
        default: console.log('ERROR: UNRECOGNIZED LAYER TYPE!')
        }
      }
    },

    // forward prop the network. A trainer will pass in is_training = true
    forward: function (V, is_training) {
      if (typeof(is_training) === 'undefined') { is_training = false }
      var act = this.layers[0].forward(V, is_training)
      for (var i = 1; i < this.layers.length; i++) {
        act = this.layers[i].forward(act, is_training)
      }
      return act
    },

    getCostLoss: function (V, y) {
      this.forward(V, false)
      var N = this.layers.length
      var loss = this.layers[N - 1].backward(y)
      return loss
    },

    // backprop: compute gradients wrt all parameters
    backward: function (y) {
      var N = this.layers.length
      var loss = this.layers[N - 1].backward(y) // last layer assumed softmax
      for (var i = N - 2; i >= 0; i--) { // first layer assumed input
        this.layers[i].backward()
      }
      return loss
    },
    getParamsAndGrads: function () {
      // accumulate parameters and gradients for the entire network
      var response = []
      for (var i = 0; i < this.layers.length; i++) {
        var layer_reponse = this.layers[i].getParamsAndGrads()
        for (var j = 0; j < layer_reponse.length; j++) {
          response.push(layer_reponse[j])
        }
      }
      return response
    },
    getPrediction: function () {
      var S = this.layers[this.layers.length - 1] // softmax layer
      var p = S.out_act.w
      var maxv = p[0]
      var maxi = 0
      for (var i = 1; i < p.length; i++) {
        if (p[i] > maxv) { maxv = p[i]; maxi = i }
      }
      return maxi
    },
    toJSON: function () {
      var json = {}
      json.layers = []
      for (var i = 0; i < this.layers.length; i++) {
        json.layers.push(this.layers[i].toJSON())
      }
      return json
    },
    fromJSON: function (json) {
      this.layers = []
      for (var i = 0; i < json.layers.length; i++) {
        var Lj = json.layers[i]
        var t = Lj.layer_type
        var L
        if (t === 'input') { L = new global.InputLayer() }
        if (t === 'relu') { L = new global.ReluLayer() }
        if (t === 'sigmoid') { L = new global.SigmoidLayer() }
        if (t === 'tanh') { L = new global.TanhLayer() }
        if (t === 'dropout') { L = new global.DropoutLayer() }
        if (t === 'conv') { L = new global.ConvLayer() }
        if (t === 'pool') { L = new global.PoolLayer() }
        if (t === 'lrn') { L = new global.LocalResponseNormalizationLayer() }
        if (t === 'softmax') { L = new global.SoftmaxLayer() }
        if (t === 'regression') { L = new global.RegressionLayer() }
        if (t === 'fc') { L = new global.FullyConnLayer() }
        if (t === 'maxout') { L = new global.MaxoutLayer() }
        if (t === 'quadtransform') { L = new global.QuadTransformLayer() }
        if (t === 'svm') { L = new global.SVMLayer() }
        L.fromJSON(Lj)
        this.layers.push(L)
      }
    }
  }

  global.Net = Net
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = global.Vol // convenience

  var Trainer = function (net, options) {

    this.net = net

    var options = options || {}
    this.learning_rate = typeof options.learning_rate !== 'undefined' ? options.learning_rate : 0.01
    this.l1_decay = typeof options.l1_decay !== 'undefined' ? options.l1_decay : 0.0
    this.l2_decay = typeof options.l2_decay !== 'undefined' ? options.l2_decay : 0.0
    this.batch_size = typeof options.batch_size !== 'undefined' ? options.batch_size : 1
    this.method = typeof options.method !== 'undefined' ? options.method : 'sgd' // sgd/adagrad/adadelta/windowgrad

    this.momentum = typeof options.momentum !== 'undefined' ? options.momentum : 0.9
    this.ro = typeof options.ro !== 'undefined' ? options.ro : 0.95 // used in adadelta
    this.eps = typeof options.eps !== 'undefined' ? options.eps : 1e-6 // used in adadelta

    this.k = 0 // iteration counter
    this.gsum = [] // last iteration gradients (used for momentum calculations)
    this.xsum = [] // used in adadelta
  }

  Trainer.prototype = {
    train: function (x, y) {

      var start = new Date().getTime()
      this.net.forward(x, true) // also set the flag that lets the net know we're just training
      var end = new Date().getTime()
      var fwd_time = end - start

      var start = new Date().getTime()
      var cost_loss = this.net.backward(y)
      var l2_decay_loss = 0.0
      var l1_decay_loss = 0.0
      var end = new Date().getTime()
      var bwd_time = end - start

      this.k++
      if (this.k % this.batch_size === 0) {

        var pglist = this.net.getParamsAndGrads()

        // initialize lists for accumulators. Will only be done once on first iteration
        if (this.gsum.length === 0 && (this.method !== 'sgd' || this.momentum > 0.0)) {
          // only vanilla sgd doesnt need either lists
          // momentum needs gsum
          // adagrad needs gsum
          // adadelta needs gsum and xsum
          for (var i = 0; i < pglist.length; i++) {
            this.gsum.push(global.zeros(pglist[i].params.length))
            if (this.method === 'adadelta') {
              this.xsum.push(global.zeros(pglist[i].params.length))
            } else {
              this.xsum.push([]) // conserve memory
            }
          }
        }

        // perform an update for all sets of weights
        for (var i = 0; i < pglist.length; i++) {
          var pg = pglist[i] // param, gradient, other options in future (custom learning rate etc)
          var p = pg.params
          var g = pg.grads

          // learning rate for some parameters.
          var l2_decay_mul = typeof pg.l2_decay_mul !== 'undefined' ? pg.l2_decay_mul : 1.0
          var l1_decay_mul = typeof pg.l1_decay_mul !== 'undefined' ? pg.l1_decay_mul : 1.0
          var l2_decay = this.l2_decay * l2_decay_mul
          var l1_decay = this.l1_decay * l1_decay_mul

          var plen = p.length
          for (var j = 0; j < plen; j++) {
            l2_decay_loss += l2_decay * p[j] * p[j] / 2 // accumulate weight decay loss
            l1_decay_loss += l1_decay * Math.abs(p[j])
            var l1grad = l1_decay * (p[j] > 0 ? 1 : -1)
            var l2grad = l2_decay * (p[j])

            var gij = (l2grad + l1grad + g[j]) / this.batch_size // raw batch gradient

            var gsumi = this.gsum[i]
            var xsumi = this.xsum[i]
            if (this.method === 'adagrad') {
              // adagrad update
              gsumi[j] = gsumi[j] + gij * gij
              var dx = - this.learning_rate / Math.sqrt(gsumi[j] + this.eps) * gij
              p[j] += dx
            } else if (this.method === 'windowgrad') {
              // this is adagrad but with a moving window weighted average
              // so the gradient is not accumulated over the entire history of the run.
              // it's also referred to as Idea #1 in Zeiler paper on Adadelta. Seems reasonable to me!
              gsumi[j] = this.ro * gsumi[j] + (1 - this.ro) * gij * gij
              var dx = - this.learning_rate / Math.sqrt(gsumi[j] + this.eps) * gij // eps added for better conditioning
              p[j] += dx
            } else if (this.method === 'adadelta') {
              // assume adadelta if not sgd or adagrad
              gsumi[j] = this.ro * gsumi[j] + (1 - this.ro) * gij * gij
              var dx = - Math.sqrt((xsumi[j] + this.eps) / (gsumi[j] + this.eps)) * gij
              xsumi[j] = this.ro * xsumi[j] + (1 - this.ro) * dx * dx // yes, xsum lags behind gsum by 1.
              p[j] += dx
            } else {
              // assume SGD
              if (this.momentum > 0.0) {
                // momentum update
                var dx = this.momentum * gsumi[j] - this.learning_rate * gij // step
                gsumi[j] = dx // back this up for next iteration of momentum
                p[j] += dx // apply corrected gradient
              } else {
                // vanilla sgd
                p[j] += - this.learning_rate * gij
              }
            }
            g[j] = 0.0 // zero out gradient so that we can begin accumulating anew
          }
        }
      }

      // appending softmax_loss for backwards compatibility, but from now on we will always use cost_loss
      // in future, TODO: have to completely redo the way loss is done around the network as currently
      // loss is a bit of a hack. Ideally, user should specify arbitrary number of loss functions on any layer
      // and it should all be computed correctly and automatically.
      return { fwd_time: fwd_time, bwd_time: bwd_time,
        l2_decay_loss: l2_decay_loss, l1_decay_loss: l1_decay_loss,
        cost_loss: cost_loss, softmax_loss: cost_loss,
        loss: cost_loss + l1_decay_loss + l2_decay_loss }
    }
  }

  global.Trainer = Trainer
  global.SGDTrainer = Trainer // backwards compatibility
})(convnetjs);

(function (global) {
  'use strict'

  // used utilities, make explicit local references
  var randf = global.randf
  var randi = global.randi
  var Net = global.Net
  var Trainer = global.Trainer
  var maxmin = global.maxmin
  var randperm = global.randperm
  var weightedSample = global.weightedSample
  var getopt = global.getopt
  var arrUnique = global.arrUnique

  /*
  A MagicNet takes data: a list of convnetjs.Vol(), and labels
  which for now are assumed to be class indeces 0..K. MagicNet then:
  - creates data folds for cross-validation
  - samples candidate networks
  - evaluates candidate networks on all data folds
  - produces predictions by model-averaging the best networks
  */
  var MagicNet = function (data, labels, opt) {
    var opt = opt || {}
    if (typeof data === 'undefined') { data = [] }
    if (typeof labels === 'undefined') { labels = [] }

    // required inputs
    this.data = data // store these pointers to data
    this.labels = labels

    // optional inputs
    this.train_ratio = getopt(opt, 'train_ratio', 0.7)
    this.num_folds = getopt(opt, 'num_folds', 10)
    this.num_candidates = getopt(opt, 'num_candidates', 50) // we evaluate several in parallel
    // how many epochs of data to train every network? for every fold?
    // higher values mean higher accuracy in final results, but more expensive
    this.num_epochs = getopt(opt, 'num_epochs', 50)
    // number of best models to average during prediction. Usually higher = better
    this.ensemble_size = getopt(opt, 'ensemble_size', 10)

    // candidate parameters
    this.batch_size_min = getopt(opt, 'batch_size_min', 10)
    this.batch_size_max = getopt(opt, 'batch_size_max', 300)
    this.l2_decay_min = getopt(opt, 'l2_decay_min', -4)
    this.l2_decay_max = getopt(opt, 'l2_decay_max', 2)
    this.learning_rate_min = getopt(opt, 'learning_rate_min', -4)
    this.learning_rate_max = getopt(opt, 'learning_rate_max', 0)
    this.momentum_min = getopt(opt, 'momentum_min', 0.9)
    this.momentum_max = getopt(opt, 'momentum_max', 0.9)
    this.neurons_min = getopt(opt, 'neurons_min', 5)
    this.neurons_max = getopt(opt, 'neurons_max', 30)

    // computed
    this.folds = [] // data fold indices, gets filled by sampleFolds()
    this.candidates = [] // candidate networks that are being currently evaluated
    this.evaluated_candidates = [] // history of all candidates that were fully evaluated on all folds
    this.unique_labels = arrUnique(labels)
    this.iter = 0 // iteration counter, goes from 0 -> num_epochs * num_training_data
    this.foldix = 0 // index of active fold

    // callbacks
    this.finish_fold_callback = null
    this.finish_batch_callback = null

    // initializations
    if (this.data.length > 0) {
      this.sampleFolds()
      this.sampleCandidates()
    }
  }

  MagicNet.prototype = {

    // sets this.folds to a sampling of this.num_folds folds
    sampleFolds: function () {
      var N = this.data.length
      var num_train = Math.floor(this.train_ratio * N)
      this.folds = [] // flush folds, if any
      for (var i = 0; i < this.num_folds; i++) {
        var p = randperm(N)
        this.folds.push({ train_ix: p.slice(0, num_train), test_ix: p.slice(num_train, N) })
      }
    },

    // returns a random candidate network
    sampleCandidate: function () {
      var input_depth = this.data[0].w.length
      var num_classes = this.unique_labels.length

      // sample network topology and hyperparameters
      var layer_defs = []
      layer_defs.push({ type: 'input', out_sx: 1, out_sy: 1, out_depth: input_depth })
      var nl = weightedSample([0, 1, 2, 3], [0.2, 0.3, 0.3, 0.2]) // prefer nets with 1,2 hidden layers
      for (var q = 0; q < nl; q++) {
        var ni = randi(this.neurons_min, this.neurons_max)
        var act = ['tanh', 'maxout', 'relu'][randi(0, 3)]
        if (randf(0, 1) < 0.5) {
          var dp = Math.random()
          layer_defs.push({ type: 'fc', num_neurons: ni, activation: act, drop_prob: dp })
        } else {
          layer_defs.push({ type: 'fc', num_neurons: ni, activation: act })
        }
      }
      layer_defs.push({ type: 'softmax', num_classes: num_classes })
      var net = new Net()
      net.makeLayers(layer_defs)

      // sample training hyperparameters
      var bs = randi(this.batch_size_min, this.batch_size_max) // batch size
      var l2 = Math.pow(10, randf(this.l2_decay_min, this.l2_decay_max)) // l2 weight decay
      var lr = Math.pow(10, randf(this.learning_rate_min, this.learning_rate_max)) // learning rate
      var mom = randf(this.momentum_min, this.momentum_max) // momentum. Lets just use 0.9, works okay usually ;p
      var tp = randf(0, 1) // trainer type
      var trainer_def
      if (tp < 0.33) {
        trainer_def = { method: 'adadelta', batch_size: bs, l2_decay: l2 }
      } else if (tp < 0.66) {
        trainer_def = { method: 'adagrad', learning_rate: lr, batch_size: bs, l2_decay: l2 }
      } else {
        trainer_def = { method: 'sgd', learning_rate: lr, momentum: mom, batch_size: bs, l2_decay: l2 }
      }

      var trainer = new Trainer(net, trainer_def)

      var cand = {}
      cand.acc = []
      cand.accv = 0 // this will maintained as sum(acc) for convenience
      cand.layer_defs = layer_defs
      cand.trainer_def = trainer_def
      cand.net = net
      cand.trainer = trainer
      return cand
    },

    // sets this.candidates with this.num_candidates candidate nets
    sampleCandidates: function () {
      this.candidates = [] // flush, if any
      for (var i = 0; i < this.num_candidates; i++) {
        var cand = this.sampleCandidate()
        this.candidates.push(cand)
      }
    },

    step: function () {

      // run an example through current candidate
      this.iter++

      // step all candidates on a random data point
      var fold = this.folds[this.foldix] // active fold
      var dataix = fold.train_ix[randi(0, fold.train_ix.length)]
      for (var k = 0; k < this.candidates.length; k++) {
        var x = this.data[dataix]
        var l = this.labels[dataix]
        this.candidates[k].trainer.train(x, l)
      }

      // process consequences: sample new folds, or candidates
      var lastiter = this.num_epochs * fold.train_ix.length
      if (this.iter >= lastiter) {
        // finished evaluation of this fold. Get final validation
        // accuracies, record them, and go on to next fold.
        var val_acc = this.evalValErrors()
        for (var k = 0; k < this.candidates.length; k++) {
          var c = this.candidates[k]
          c.acc.push(val_acc[k])
          c.accv += val_acc[k]
        }
        this.iter = 0 // reset step number
        this.foldix++ // increment fold

        if (this.finish_fold_callback !== null) {
          this.finish_fold_callback()
        }

        if (this.foldix >= this.folds.length) {
          // we finished all folds as well! Record these candidates
          // and sample new ones to evaluate.
          for (var k = 0; k < this.candidates.length; k++) {
            this.evaluated_candidates.push(this.candidates[k])
          }
          // sort evaluated candidates according to accuracy achieved
          this.evaluated_candidates.sort(function (a, b) {
            return (a.accv / a.acc.length)
                 > (b.accv / b.acc.length)
              ? -1 : 1
          })
          // and clip only to the top few ones (lets place limit at 3*ensemble_size)
          // otherwise there are concerns with keeping these all in memory
          // if MagicNet is being evaluated for a very long time
          if (this.evaluated_candidates.length > 3 * this.ensemble_size) {
            this.evaluated_candidates = this.evaluated_candidates.slice(0, 3 * this.ensemble_size)
          }
          if (this.finish_batch_callback !== null) {
            this.finish_batch_callback()
          }
          this.sampleCandidates() // begin with new candidates
          this.foldix = 0 // reset this
        } else {
          // we will go on to another fold. reset all candidates nets
          for (var k = 0; k < this.candidates.length; k++) {
            var c = this.candidates[k]
            var net = new Net()
            net.makeLayers(c.layer_defs)
            var trainer = new Trainer(net, c.trainer_def)
            c.net = net
            c.trainer = trainer
          }
        }
      }
    },

    evalValErrors: function () {
      // evaluate candidates on validation data and return performance of current networks
      // as simple list
      var vals = []
      var fold = this.folds[this.foldix] // active fold
      for (var k = 0; k < this.candidates.length; k++) {
        var net = this.candidates[k].net
        var v = 0.0
        for (var q = 0; q < fold.test_ix.length; q++) {
          var x = this.data[fold.test_ix[q]]
          var l = this.labels[fold.test_ix[q]]
          net.forward(x)
          var yhat = net.getPrediction()
          v += (yhat === l ? 1.0 : 0.0) // 0 1 loss
        }
        v /= fold.test_ix.length // normalize
        vals.push(v)
      }
      return vals
    },

    // returns prediction scores for given test data point, as Vol
    // uses an averaged prediction from the best ensemble_size models
    // x is a Vol.
    predict_soft: function (data) {
      // forward prop the best networks
      // and accumulate probabilities at last layer into a an output Vol
      var nv = Math.min(this.ensemble_size, this.evaluated_candidates.length)
      if (nv === 0) { return new convnetjs.Vol(0, 0, 0) } // not sure what to do here? we're not ready yet
      var xout, n
      for (var j = 0; j < nv; j++) {
        var net = this.evaluated_candidates[j].net
        var x = net.forward(data)
        if (j === 0) {
          xout = x
          n = x.w.length
        } else {
          // add it on
          for (var d = 0; d < n; d++) {
            xout.w[d] += x.w[d]
          }
        }
      }
      // produce average
      for (var d = 0; d < n; d++) {
        xout.w[d] /= n
      }
      return xout
    },

    predict: function (data) {
      var xout = this.predict_soft(data)
      if (xout.w.length !== 0) {
        var stats = maxmin(xout.w)
        var predicted_label = stats.maxi
      } else {
        var predicted_label = -1 // error out
      }
      return predicted_label

    },

    toJSON: function () {
      // dump the top ensemble_size networks as a list
      var nv = Math.min(this.ensemble_size, this.evaluated_candidates.length)
      var json = {}
      json.nets = []
      for (var i = 0; i < nv; i++) {
        json.nets.push(this.evaluated_candidates[i].net.toJSON())
      }
      return json
    },

    fromJSON: function (json) {
      this.ensemble_size = json.nets.length
      this.evaluated_candidates = []
      for (var i = 0; i < this.ensemble_size; i++) {
        var net = new Net()
        net.fromJSON(json.nets[i])
        var dummy_candidate = {}
        dummy_candidate.net = net
        this.evaluated_candidates.push(dummy_candidate)
      }
    },

    // callback functions
    // called when a fold is finished, while evaluating a batch
    onFinishFold: function (f) { this.finish_fold_callback = f },
    // called when a batch of candidates has finished evaluating
    onFinishBatch: function (f) { this.finish_batch_callback = f }

  }

  global.MagicNet = MagicNet
})(convnetjs);
(function (lib) {
  'use strict'
  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.jsfeat = lib // in ordinary browser attach library to window
  } else {
    module.exports = lib // in nodejs
  }
})(convnetjs);
(function (global) {
  'use strict'
  var Vol = convnetjs.Vol // convenience

  // used utilities, make explicit local references
  var randf = convnetjs.randf
  var randn = convnetjs.randn
  var randi = convnetjs.randi
  var zeros = convnetjs.zeros
  var Net = convnetjs.Net
  var maxmin = convnetjs.maxmin
  var randperm = convnetjs.randperm
  var weightedSample = convnetjs.weightedSample
  var getopt = convnetjs.getopt
  var arrUnique = convnetjs.arrUnique

  function assert (condition, message) {
    if (!condition) {
      message = message || 'Assertion failed'
      if (typeof Error !== 'undefined') {
        throw new Error(message)
      }
      throw message // Fallback
    }
  }

  // returns a random cauchy random variable with gamma (controls magnitude sort of like stdev in randn)
  // http://en.wikipedia.org/wiki/Cauchy_distribution
  var randc = function (m, gamma) {
    return m + gamma * 0.01 * randn(0.0, 1.0) / randn(0.0, 1.0)
  }

  // chromosome implementation using an array of floats
  var Chromosome = function (floatArray) {
    this.fitness = 0 // default value
    this.nTrial = 0 // number of trials subjected to so far.
    this.gene = floatArray
  }

  Chromosome.prototype = {
    burst_mutate: function (burst_magnitude_) { // adds a normal random variable of stdev width, zero mean to each gene.
      var burst_magnitude = burst_magnitude_ || 0.1
      var i, N
      N = this.gene.length
      for (i = 0; i < N; i++) {
        this.gene[i] += randn(0.0, burst_magnitude)
      }
    },
    randomize: function (burst_magnitude_) { // resets each gene to a random value with zero mean and stdev
      var burst_magnitude = burst_magnitude_ || 0.1
      var i, N
      N = this.gene.length
      for (i = 0; i < N; i++) {
        this.gene[i] = randn(0.0, burst_magnitude)
      }
    },
    mutate: function (mutation_rate_, burst_magnitude_) { // adds random gaussian (0,stdev) to each gene with prob mutation_rate
      var mutation_rate = mutation_rate_ || 0.1
      var burst_magnitude = burst_magnitude_ || 0.1
      var i, N
      N = this.gene.length
      for (i = 0; i < N; i++) {
        if (randf(0, 1) < mutation_rate) {
          this.gene[i] += randn(0.0, burst_magnitude)
        }
      }
    },
    crossover: function (partner, kid1, kid2) { // performs one-point crossover with partner to produce 2 kids
      // assumes all chromosomes are initialised with same array size. pls make sure of this before calling
      var i, N
      N = this.gene.length
      var l = randi(0, N) // crossover point
      for (i = 0; i < N; i++) {
        if (i < l) {
          kid1.gene[i] = this.gene[i]
          kid2.gene[i] = partner.gene[i]
        } else {
          kid1.gene[i] = partner.gene[i]
          kid2.gene[i] = this.gene[i]
        }
      }
    },
    copyFrom: function (c) { // copies c's gene into itself
      var i, N
      this.copyFromGene(c.gene)
    },
    copyFromGene: function (gene) { // gene into itself
      var i, N
      N = this.gene.length
      for (i = 0; i < N; i++) {
        this.gene[i] = gene[i]
      }
    },
    clone: function () { // returns an exact copy of itself (into new memory, doesn't return reference)
      var newGene = zeros(this.gene.length)
      var i
      for (i = 0; i < this.gene.length; i++) {
        newGene[i] = Math.round(10000 * this.gene[i]) / 10000
      }
      var c = new Chromosome(newGene)
      c.fitness = this.fitness
      return c
    },
    pushToNetwork: function (net) { // pushes this chromosome to a specified network
      pushGeneToNetwork(net, this.gene)
    }
  }

  // counts the number of weights and biases in the network
  function getNetworkSize (net) {
    var layer = null
    var filter = null
    var bias = null
    var w = null
    var count = 0
    var i, j, k
    for (i = 0; i < net.layers.length; i++) {
      layer = net.layers[i]
      filter = layer.filters
      if (filter) {
        for (j = 0; j < filter.length; j++) {
          w = filter[j].w
          count += w.length
        }
      }
      bias = layer.biases
      if (bias) {
        w = bias.w
        count += w.length
      }
    }
    return count
  }

  function pushGeneToNetwork (net, gene) { // pushes the gene (floatArray) to fill up weights and biases in net
    var count = 0
    var layer = null
    var filter = null
    var bias = null
    var w = null
    var i, j, k
    for (i = 0; i < net.layers.length; i++) {
      layer = net.layers[i]
      filter = layer.filters
      if (filter) {
        for (j = 0; j < filter.length; j++) {
          w = filter[j].w
          for (k = 0; k < w.length; k++) {
            w[k] = gene[count++]
          }
        }
      }
      bias = layer.biases
      if (bias) {
        w = bias.w
        for (k = 0; k < w.length; k++) {
          w[k] = gene[count++]
        }
      }
    }
  }

  function getGeneFromNetwork (net) { // gets all the weight/biases from network in a floatArray
    var gene = []
    var layer = null
    var filter = null
    var bias = null
    var w = null
    var i, j, k
    for (i = 0; i < net.layers.length; i++) {
      layer = net.layers[i]
      filter = layer.filters
      if (filter) {
        for (j = 0; j < filter.length; j++) {
          w = filter[j].w
          for (k = 0; k < w.length; k++) {
            gene.push(w[k])
          }
        }
      }
      bias = layer.biases
      if (bias) {
        w = bias.w
        for (k = 0; k < w.length; k++) {
          gene.push(w[k])
        }
      }
    }
    return gene
  }

  function copyFloatArray (x) { // returns a FloatArray copy of real numbered array x.
    var N = x.length
    var y = zeros(N)
    for (var i = 0; i < N; i++) {
      y[i] = x[i]
    }
    return y
  }

  function copyFloatArrayIntoArray (x, y) { // copies a FloatArray copy of real numbered array x into y
    var N = x.length
    for (var i = 0; i < N; i++) {
      y[i] = x[i]
    }
  }

  // randomize neural network with random weights and biases
  var randomizeNetwork = function (net, magnitude) {
    var netSize = getNetworkSize(net)
    var chromosome = new Chromosome(zeros(netSize))
    chromosome.randomize(magnitude || 1.0)
    pushGeneToNetwork(net, chromosome.gene)
  }

  // implementation of basic conventional neuroevolution algorithm (CNE)
  //
  // options:
  // population_size : positive integer
  // hall_of_fame_size : positive integer, stores best guys in all of history and keeps them.
  // mutation_rate : [0, 1], when mutation happens, chance of each gene getting mutated
  // elite_percentage : [0, 0.3], only this group mates and produces offsprings
  // mutation_size : positive floating point.  stdev of gausian noise added for mutations
  // target_fitness : after fitness achieved is greater than this float value, learning stops
  // init_weight_magnitude : stdev of initial random weight (default = 1.0)
  // burst_generations : positive integer.  if best fitness doesn't improve after this number of generations
  //                    then mutate everything!
  // best_trial : default 1.  save best of best_trial's results for each chromosome.
  // num_match : for use in arms race mode.  how many random matches we set for each chromosome when it is its turn.
  //
  // initGene:  init float array to initialize the chromosomes.  can be result obtained from pretrained sessions.
  var GATrainer = function (net, options_, initGene) {

    this.net = net

    var options = options_ || {}
    this.population_size = typeof options.population_size !== 'undefined' ? options.population_size : 100
    this.population_size = Math.floor(this.population_size / 2) * 2 // make sure even number
    this.hall_of_fame_size = typeof options.hall_of_fame_size !== 'undefined' ? options.hall_of_fame_size : 10
    this.mutation_rate = typeof options.mutation_rate !== 'undefined' ? options.mutation_rate : 0.01
    this.init_weight_magnitude = typeof options.init_weight_magnitude !== 'undefined' ? options.init_weight_magnitude : 1.0
    this.elite_percentage = typeof options.elite_percentage !== 'undefined' ? options.elite_percentage : 0.2
    this.mutation_size = typeof options.mutation_size !== 'undefined' ? options.mutation_size : 0.05
    this.target_fitness = typeof options.target_fitness !== 'undefined' ? options.target_fitness : 10000000000000000
    this.burst_generations = typeof options.burst_generations !== 'undefined' ? options.burst_generations : 10
    this.best_trial = typeof options.best_trial !== 'undefined' ? options.best_trial : 1
    this.num_match = typeof options.num_match !== 'undefined' ? options.num_match : 1
    this.chromosome_size = getNetworkSize(this.net)

    var initChromosome = null
    var i
    var chromosome
    if (initGene) {
      initChromosome = new Chromosome(initGene)
    }

    this.chromosomes = [] // population
    this.hallOfFame = [] // stores the hall of fame here!
    for (i = 0; i < this.population_size; i++) {
      chromosome = new Chromosome(zeros(this.chromosome_size))
      if (initChromosome) { // if initial gene supplied, burst mutate param.
        chromosome.copyFrom(initChromosome)
        // pushGeneToNetwork(this.net, initChromosome.gene); // this line may be redundant. (*1)
        if (i > 0) { // don't mutate the first guy.
          chromosome.burst_mutate(this.mutation_size)
        }
      } else {
        chromosome.randomize(this.init_weight_magnitude)
      }
      this.chromosomes.push(chromosome)
    }
    // generates first few hall of fame genes (but randomises and sets the fitness to be zero)
    for (i = 0; i < this.hall_of_fame_size; i++) {
      chromosome = new Chromosome(zeros(this.chromosome_size))
      if (initChromosome) { // if initial gene supplied, burst mutate param.
        chromosome.copyFrom(initChromosome)
      } else {
        chromosome.randomize(this.init_weight_magnitude)
      }
      this.hallOfFame.push(chromosome)
    }

    pushGeneToNetwork(this.net, this.chromosomes[0].gene) // push first chromosome to neural network. (replaced *1 above)

    this.bestFitness = -10000000000000000
    this.bestFitnessCount = 0

  }

  GATrainer.prototype = {
    train: function (fitFunc) { // has to pass in fitness function.  returns best fitness
      var bestFitFunc = function (nTrial, net) {
        var bestFitness = -10000000000000000
        var fitness
        for (var i = 0; i < nTrial; i++) {
          fitness = fitFunc(net)
          if (fitness > bestFitness) {
            bestFitness = fitness
          }
        }
        return bestFitness
      }

      var i, N
      var fitness
      var c = this.chromosomes
      N = this.population_size

      var bestFitness = -10000000000000000

      // process first net (the best one)
      pushGeneToNetwork(this.net, c[0].gene)
      fitness = bestFitFunc(this.best_trial, this.net)
      c[0].fitness = fitness
      bestFitness = fitness
      if (bestFitness > this.target_fitness) {
        return bestFitness
      }

      for (i = 1; i < N; i++) {
        pushGeneToNetwork(this.net, c[i].gene)
        fitness = bestFitFunc(this.best_trial, this.net)
        c[i].fitness = fitness
        if (fitness > bestFitness) {
          bestFitness = fitness
        }
      }

      // sort the chromosomes by fitness
      c = c.sort(function (a, b) {
        if (a.fitness > b.fitness) { return -1 }
        if (a.fitness < b.fitness) { return 1 }
        return 0
      })

      var Nelite = Math.floor(Math.floor(this.elite_percentage * N) / 2) * 2 // even number
      for (i = Nelite; i < N; i += 2) {
        var p1 = randi(0, Nelite)
        var p2 = randi(0, Nelite)
        c[p1].crossover(c[p2], c[i], c[i + 1])
      }

      for (i = 1; i < N; i++) { // keep best guy the same.  don't mutate the best one, so start from 1, not 0.
        c[i].mutate(this.mutation_rate, this.mutation_size)
      }

      // push best one to network.
      pushGeneToNetwork(this.net, c[0].gene)
      if (bestFitness < this.bestFitness) { // didn't beat the record this time
        this.bestFitnessCount++
        if (this.bestFitnessCount > this.burst_generations) { // stagnation, do burst mutate!
          for (i = 1; i < N; i++) {
            c[i].copyFrom(c[0])
            c[i].burst_mutate(this.mutation_size)
          }
          // c[0].burst_mutate(this.mutation_size); // don't mutate best solution.
        }

      } else {
        this.bestFitnessCount = 0 // reset count for burst
        this.bestFitness = bestFitness // record the best fitness score
      }

      return bestFitness
    },
    matchTrain: function (matchFunc) { // uses arms race to determine best chromosome by playing them against each other
      // this algorithm loops through each chromosome, and for each chromosome, it will play num_match games
      // against other chromosomes.  at the same time.  if it wins, the fitness is incremented by 1
      // else it is subtracted by 1.  if the game is tied, the fitness doesn't change.
      // at the end of the algorithm, each fitness is divided by the number of games the chromosome has played
      // the algorithm will then sort the chromosomes by this average fitness

      var i, j, N
      var opponent
      var fitness
      var c = this.chromosomes
      var result = 0
      N = this.population_size

      // zero out all fitness and
      for (i = 0; i < N; i++) {
        c[i].fitness = 0
        c[i].nTrial = 0
      }

      // get these guys to fight against each other!
      for (i = 0; i < N; i++) {

        for (j = 0; j < this.num_match; j++) {
          opponent = randi(0, N)
          if (opponent === i) { continue }
          result = matchFunc(c[i], c[opponent])
          c[i].nTrial += 1
          c[opponent].nTrial += 1
          c[i].fitness += (result + 1)
          c[opponent].fitness += ((-result) + 1) // if result is -1, it means opponent has won.
        }
      }

      // average out all fitness scores by the number of matches each chromosome has done.

      for (i = 0; i < N; i++) {
        if (c[i].nTrial > 0) {
          c[i].fitness /= c[i].nTrial
        }
      }

      // sort the chromosomes by fitness
      c = c.sort(function (a, b) {
        if (a.fitness > b.fitness) { return -1 }
        if (a.fitness < b.fitness) { return 1 }
        return 0
      })

      var Nelite = Math.floor(Math.floor(this.elite_percentage * N) / 2) * 2 // even number
      for (i = Nelite; i < N; i += 2) {
        var p1 = randi(0, Nelite)
        var p2 = randi(0, Nelite)
        c[p1].crossover(c[p2], c[i], c[i + 1])
      }

      for (i = 2; i < N; i++) { // keep two best guys the same.  don't mutate the best one, so start from 2, not 0.
        c[i].mutate(this.mutation_rate, this.mutation_size)
      }

      // push best one to network.
      pushGeneToNetwork(this.net, c[0].gene)

      // return; // this funciton doesn't return anything.
      // debug info, print out all fitness

    },
    evolve: function () { // this function does bare minimum
      // it assumes the code prior to calling evolve would have simulated the system
      // it also assumes that the fitness in each chromosome of this trainer will have been assigned
      // it just does the task of crossovers and mutations afterwards.
      // in a sense, I should have written this function first and have other trainers call this last.
      // (food for thought!)
      var i, j, N, Nh
      var c = this.chromosomes
      var h = this.hallOfFame
      N = this.population_size
      Nh = this.hall_of_fame_size

      // sort the chromosomes by fitness
      c = c.sort(function (a, b) {
        if (a.fitness > b.fitness) { return -1 }
        if (a.fitness < b.fitness) { return 1 }
        return 0
      })

      console.log(0 + ': ' + Math.round(c[0].fitness * 100) / 100)
      console.log((N - 1) + ': ' + Math.round(c[N - 1].fitness * 100) / 100)

      // copies best from population to hall of fame:
      for (i = 0; i < Nh; i++) {
        h.push(c[i].clone())
      }
      // sorts hall of fame
      h = h.sort(function (a, b) {
        if (a.fitness > b.fitness) { return -1 }
        if (a.fitness < b.fitness) { return 1 }
        return 0
      })
      // cuts off hall of fame to keep only Nh elements
      h = h.slice(0, Nh)
      console.log('hall of fame:')
      for (i = 0; i < Math.min(Nh, 3); i++) {
        console.log(i + ': ' + Math.round(h[i].fitness * 100) / 100)
      }

      // alters population:

      var Nelite = Math.floor(Math.floor(this.elite_percentage * N) / 2) * 2 // even number
      for (i = Nelite; i < N; i += 2) {
        var p1 = randi(0, Nelite)
        var p2 = randi(0, Nelite)
        c[p1].crossover(c[p2], c[i], c[i + 1])
      }

      // leaves the last Nh slots for hall of fame guys.
      for (i = Nelite / 2; i < N - Nh; i++) { // keep Nelite/2 best guys the same.  don't mutate the best ones, so start from 5, not 0.
        c[i].mutate(this.mutation_rate, this.mutation_size)
      }

      // sneakily puts in the hall of famers back into the population at the end:
      for (i = 0; i < Nh; i++) {
        c[N - Nh + i] = h[i].clone()
      }

      // debug:
      /*
				for (i = 0; i < N; i++) {
				console.log(i+': '+Math.round(c[i].fitness*100)/100);
				}
			*/

    }
  }

  // variant of ESP network implemented
  // population of N sub neural nets, each to be co-evolved by ESPTrainer
  // fully recurrent.  outputs of each sub nn is also the input of all other sub nn's and itself.
  // inputs should be order of ~ -10 to +10, and expect output to be similar magnitude.
  // user can grab outputs of the the N sub networks and use them to accomplish some task for training
  //
  // Nsp: Number of sub populations (ie, 4)
  // Ninput: Number of real inputs to the system (ie, 2).  so actual number of input is Niput + Nsp
  // Nhidden:  Number of hidden neurons in each sub population (ie, 16)
  // genes: (optional) array of Nsp genes (floatArrays) to initialise the network (pretrained);
  var ESPNet = function (Nsp, Ninput, Nhidden, genes) {
    this.net = [] // an array of convnet.js feed forward nn's
    this.Ninput = Ninput
    this.Nsp = Nsp
    this.Nhidden = Nhidden
    this.input = new convnetjs.Vol(1, 1, Nsp + Ninput) // hold most up to date input vector
    this.output = zeros(Nsp)

    // define the architecture of each sub nn:
    var layer_defs = []
    layer_defs.push({
      type: 'input',
      out_sx: 1,
      out_sy: 1,
      out_depth: (Ninput + Nsp)
    })
    layer_defs.push({
      type: 'fc',
      num_neurons: Nhidden,
      activation: 'sigmoid'
    })
    layer_defs.push({
      type: 'regression',
      num_neurons: 1 // one output for each sub nn, gets fed back into inputs.
    })

    var network
    for (var i = 0; i < Nsp; i++) {
      network = new convnetjs.Net()
      network.makeLayers(layer_defs)
      this.net.push(network)
    }

    // if pretrained network is supplied:
    if (genes) {
      this.pushGenes(genes)
    }
  }

  ESPNet.prototype = {
    feedback: function () { // feeds output back to last bit of input vector
      var i
      var Ninput = this.Ninput
      var Nsp = this.Nsp
      for (i = 0; i < Nsp; i++) {
        this.input.w[i + Ninput] = this.output[i]
      }
    },
    setInput: function (input) { // input is a vector of length this.Ninput of real numbers
      // this function also grabs the previous most recent output and put it into the internal input vector
      var i
      var Ninput = this.Ninput
      var Nsp = this.Nsp
      for (i = 0; i < Ninput; i++) {
        this.input.w[i] = input[i]
      }
      this.feedback()
    },
    forward: function () { // returns array of output of each Nsp neurons after a forward pass.
      var i, j
      var Ninput = this.Ninput
      var Nsp = this.Nsp
      var y = zeros(Nsp)
      var a // temp variable to old output of forward pass
      for (i = Nsp - 1; i >= 0; i--) {
        if (i === 0) { // for the base network, forward with output of other support networks
          this.feedback()
        }
        a = this.net[i].forward(this.input) // forward pass sub nn # i
        y[i] = a.w[0] // each sub nn only has one output.
        this.output[i] = y[i] // set internal output to track output
      }
      return y
    },
    getNetworkSize: function () { // return total number of weights and biases in a single sub nn.
      return getNetworkSize(this.net[0]) // each network has identical architecture.
    },
    getGenes: function () { // return an array of Nsp genes (floatArrays of length getNetworkSize())
      var i
      var Nsp = this.Nsp
      var result = []
      for (i = 0; i < Nsp; i++) {
        result.push(getGeneFromNetwork(this.net[i]))
      }
      return result
    },
    pushGenes: function (genes) { // genes is an array of Nsp genes (floatArrays)
      var i
      var Nsp = this.Nsp
      for (i = 0; i < Nsp; i++) {
        pushGeneToNetwork(this.net[i], genes[i])
      }
    }
  }

  // implementation of variation of Enforced Sub Population neuroevolution algorithm
  //
  // options:
  // population_size : population size of each subnetwork inside espnet
  // mutation_rate : [0, 1], when mutation happens, chance of each gene getting mutated
  // elite_percentage : [0, 0.3], only this group mates and produces offsprings
  // mutation_size : positive floating point.  stdev of gausian noise added for mutations
  // target_fitness : after fitness achieved is greater than this float value, learning stops
  // num_passes : number of times each neuron within a sub population is tested
  //          on average, each neuron will be tested num_passes * esp.Nsp times.
  // burst_generations : positive integer.  if best fitness doesn't improve after this number of generations
  //                    then start killing neurons that don't contribute to the bottom line! (reinit them with randoms)
  // best_mode : if true, this will assign each neuron to the best fitness trial it has experienced.
  //             if false, this will use the average of all trials experienced.
  // initGenes:  init Nsp array of floatarray to initialize the chromosomes.  can be result obtained from pretrained sessions.
  var ESPTrainer = function (espnet, options_, initGenes) {

    this.espnet = espnet
    this.Nsp = espnet.Nsp
    var Nsp = this.Nsp

    var options = options_ || {}
    this.population_size = typeof options.population_size !== 'undefined' ? options.population_size : 50
    this.population_size = Math.floor(this.population_size / 2) * 2 // make sure even number
    this.mutation_rate = typeof options.mutation_rate !== 'undefined' ? options.mutation_rate : 0.2
    this.elite_percentage = typeof options.elite_percentage !== 'undefined' ? options.elite_percentage : 0.2
    this.mutation_size = typeof options.mutation_size !== 'undefined' ? options.mutation_size : 0.02
    this.target_fitness = typeof options.target_fitness !== 'undefined' ? options.target_fitness : 10000000000000000
    this.num_passes = typeof options.num_passes !== 'undefined' ? options.num_passes : 2
    this.burst_generations = typeof options.burst_generations !== 'undefined' ? options.burst_generations : 10
    this.best_mode = typeof options.best_mode !== 'undefined' ? options.best_mode : false
    this.chromosome_size = this.espnet.getNetworkSize()

    this.initialize(initGenes)
  }

  ESPTrainer.prototype = {
    initialize: function (initGenes) {
      var i, j
      var y
      var Nsp = this.Nsp
      this.sp = [] // sub populations
      this.bestGenes = [] // array of Nsp number of genes, records the best combination of genes for the bestFitness achieved so far.
      var chromosomes, chromosome
      for (i = 0; i < Nsp; i++) {
        chromosomes = [] // empty list of chromosomes
        for (j = 0; j < this.population_size; j++) {
          chromosome = new Chromosome(zeros(this.chromosome_size))
          if (initGenes) {
            chromosome.copyFromGene(initGenes[i])
            if (j > 0) { // don't mutate first guy (pretrained)
              chromosome.burst_mutate(this.mutation_size)
            }
          } else { // push random genes to this.bestGenes since it has not been initalized.
            chromosome.randomize(1.0) // create random gene array if no pretrained one is supplied.
          }
          chromosomes.push(chromosome)
        }
        y = copyFloatArray(chromosomes[0].gene) // y should either be random init gene, or pretrained.
        this.bestGenes.push(y)
        this.sp.push(chromosomes) // push array of chromosomes into each population
      }

      assert(this.bestGenes.length === Nsp)
      this.espnet.pushGenes(this.bestGenes) // initial

      this.bestFitness = -10000000000000000
      this.bestFitnessCount = 0
    },
    train: function (fitFunc) { // has to pass in fitness function.  returns best fitness

      var i, j, k, m, N, Nsp
      var fitness
      var c = this.sp // array of arrays that holds every single chromosomes (Nsp x N);
      N = this.population_size // number of chromosomes in each sub population
      Nsp = this.Nsp // number of sub populations

      var bestFitness = -10000000000000000
      var bestSet, bestGenes
      var cSet
      var genes

      // helper function to return best fitness run nTrial times
      var bestFitFunc = function (nTrial, net) {
        var bestFitness = -10000000000000000
        var fitness
        for (var i = 0; i < nTrial; i++) {
          fitness = fitFunc(net)
          if (fitness > bestFitness) {
            bestFitness = fitness
          }
        }
        return bestFitness
      }

      // helper function to create a new array filled with genes from an array of chromosomes
      // returns an array of Nsp floatArrays
      function getGenesFromChromosomes (s) {
        var g = []
        for (var i = 0; i < s.length; i++) {
          g.push(copyFloatArray(s[i].gene))
        }
        return g
      }

      // makes a copy of an array of gene, helper function
      function makeCopyOfGenes (s) {
        var g = []
        for (var i = 0; i < s.length; i++) {
          g.push(copyFloatArray(s[i]))
        }
        return g
      }

      // helper function, randomize all of nth sub population of entire chromosome set c
      function randomizeSubPopulation (n, c) {
        for (var i = 0; i < N; i++) {
          c[n][i].randomize(1.0)
        }
      }

      // helper function used to sort the list of chromosomes according to their fitness
      function compareChromosomes (a, b) {
        if ((a.fitness / a.nTrial) > (b.fitness / b.nTrial)) { return -1 }
        if ((a.fitness / a.nTrial) < (b.fitness / b.nTrial)) { return 1 }
        return 0
      }

      // iterate over each gene in each sub population to initialise the nTrial to zero (will be incremented later)
      for (i = 0; i < Nsp; i++) { // loop over every sub population
        for (j = 0; j < N; j++) {
          if (this.best_mode) { // best mode turned on, no averaging, but just recording best score.
            c[i][j].nTrial = 1
            c[i][j].fitness = -10000000000000000
          } else {
            c[i][j].nTrial = 0
            c[i][j].fitness = 0
          }
        }
      }

      // see if the global best gene has met target.  if so, can end it now.
      assert(this.bestGenes.length === Nsp)
      this.espnet.pushGenes(this.bestGenes) // put the random set of networks into the espnet
      fitness = fitFunc(this.espnet) // try out this set, and get the fitness
      if (fitness > this.target_fitness) {
        return fitness
      }
      bestGenes = makeCopyOfGenes(this.bestGenes)
      bestFitness = fitness
      // this.bestFitness = fitness;

      // for each chromosome in a sub population, choose random chromosomes from all othet sub  populations to
      // build a espnet.  perform fitFunc on that esp net to get the fitness of that combination.  add the fitness
      // to this chromosome, and all participating chromosomes.  increment the nTrial of all participating
      // chromosomes by one, so afterwards they can be sorted by average fitness
      // repeat this process this.num_passes times
      for (k = 0; k < this.num_passes; k++) {
        for (i = 0; i < Nsp; i++) {
          for (j = 0; j < N; j++) {
            // build an array of chromosomes randomly
            cSet = []
            for (m = 0; m < Nsp; m++) {
              if (m === i) { // push current iterated neuron
                cSet.push(c[m][j])
              } else { // push random neuron in sub population m
                cSet.push(c[m][randi(0, N)])
              }
            }
            genes = getGenesFromChromosomes(cSet)
            assert(genes.length === Nsp)
            this.espnet.pushGenes(genes) // put the random set of networks into the espnet

            fitness = fitFunc(this.espnet) // try out this set, and get the fitness

            for (m = 0; m < Nsp; m++) { // tally the scores into each participating neuron
              if (this.best_mode) {
                if (fitness > cSet[m].fitness) { // record best fitness this neuron participated in.
                  cSet[m].fitness = fitness
                }
              } else {
                cSet[m].nTrial += 1 // increase participation count for each participating neuron
                cSet[m].fitness += fitness
              }
            }
            if (fitness > bestFitness) {
              bestFitness = fitness
              bestSet = cSet
              bestGenes = genes
            }
          }
        }
      }

      // sort the chromosomes by average fitness
      for (i = 0; i < Nsp; i++) {
        c[i] = c[i].sort(compareChromosomes)
      }

      var Nelite = Math.floor(Math.floor(this.elite_percentage * N) / 2) * 2 // even number
      for (i = 0; i < Nsp; i++) {
        for (j = Nelite; j < N; j += 2) {
          var p1 = randi(0, Nelite)
          var p2 = randi(0, Nelite)
          c[i][p1].crossover(c[i][p2], c[i][j], c[i][j + 1])
        }
      }

      // mutate the population size after 2*Nelite (keep one set of crossovers unmutiliated!)
      for (i = 0; i < Nsp; i++) {
        for (j = 2 * Nelite; j < N; j++) {
          c[i][j].mutate(this.mutation_rate, this.mutation_size)
        }
      }

      // put global and local bestgenes in the last element of each gene
      for (i = 0; i < Nsp; i++) {
        c[i][N - 1].copyFromGene(this.bestGenes[i])
        c[i][N - 2].copyFromGene(bestGenes[i])
      }

      if (bestFitness < this.bestFitness) { // didn't beat the record this time
        this.bestFitnessCount++
        if (this.bestFitnessCount > this.burst_generations) { // stagnation, do burst mutate!
          // add code here when progress stagnates later.
          console.log('stagnating. burst mutate based on best solution.')
          var bestGenesCopy = makeCopyOfGenes(this.bestGenes)
          var bestFitnessCopy = this.bestFitness
          this.initialize(bestGenesCopy)

          this.bestGenes = bestGenesCopy
          this.bestFitness = this.bestFitnessCopy

        }

      } else {
        this.bestFitnessCount = 0 // reset count for burst
        this.bestFitness = bestFitness // record the best fitness score
        this.bestGenes = bestGenes // record the set of genes that generated the best fitness
      }

      // push best one (found so far from all of history, not just this time) to network.
      assert(this.bestGenes.length === Nsp)
      this.espnet.pushGenes(this.bestGenes)

      return bestFitness
    }
  }

  convnetjs.ESPNet = ESPNet
  convnetjs.ESPTrainer = ESPTrainer
  convnetjs.GATrainer = GATrainer
  convnetjs.Chromosome = Chromosome
  convnetjs.randomizeNetwork = randomizeNetwork
  convnetjs.getGeneFromNetwork = getGeneFromNetwork
})(convnetjs)

function convNE (opt) {
  console.log(opt)
  let createNet = opt.createNet || createNetDef

  this.trainer = new convnetjs.GATrainer(createNet(opt.input, opt.output), opt)
  this.generation = 0
  this.genes = []
  this.arrayToVector = (input) => {
    const v = (new convnetjs.Vol(1, 1, input.length))
    v.w = input
    return v
  }
  this.startEvolve = () => {
    for (let i = 0; i < opt.population_size; i++) {
      let net = createNet(opt.input, opt.output)
      this.genes[i] = net
    }
    for (let i = 0; i < this.genes.length; i++) {
      let c = this.trainer.chromosomes[i]
      let b = this.genes[i]
      let chromosome = new convnetjs.Chromosome(c.gene)
      chromosome.pushToNetwork(b)
      chromosome.fitness = 0
      this.trainer.chromosomes[i] = b.chromosome = chromosome
    }
  }

  this.stopEvolve = () => {
    for (let i = 0; i < this.trainer.chromosomes.length; i++) {
      this.trainer.chromosomes[i].fitness = this.genes[i].score
    }
    console.log('----Generation ' + this.generation + '------')
    this.trainer.evolve()
    this.generation++
  }

  this.sortAndGetBest = () => {
    this.genes.sort((a, b) => b.score - a.score)
    return this.genes[0]
  }

}

function softmax (output) {
  var maximum = output.reduce(function (p, c) {
    return p > c ? p : c
  })
  var nominators = output.map(function (e) {
    return Math.exp(e - maximum)
  })
  var denominator = nominators.reduce(function (p, c) {
    return p + c
  })
  var softmax = nominators.map(function (e) {
    return e / denominator
  })

  var maxIndex = 0
  softmax.reduce(function (p, c, i) {
    if (p < c) {
      maxIndex = i
      return c
    } else
    { return p }
  })
  var result = []
  for (var i = 0; i < output.length; i++) {
    if (i == maxIndex)
    { result.push(1) }
    else
    { result.push(0) }
  }
  return result
}

function findIndex (arr) {
  return arr.findIndex(el => el === 1)
}

function createNetDef (input, output) {
  let layer_defs = []
  layer_defs.push({
    type: 'input',
    out_sx: 1,
    out_sy: 1,
    out_depth: input
  })
  layer_defs.push({
    type: 'fc',
    num_neurons: output,
    activation: 'relu'
  })

  let net = new convnetjs.Net()
  net.makeLayers(layer_defs)
  return net
}