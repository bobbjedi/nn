import * as tf from '@tensorflow/tfjs'

const createNet = (hiddenLayers: number[], activations: string[] = []) => {
  const model = tf.sequential()
  return {
    async trainNet (opt: {data: {input:number[], output: number[]}[], callback: (d: any)=> void, epochs: number}) {

      const neurons = [opt.data[0].input.length].concat(hiddenLayers, [opt.data[0].output.length])
      const layers = neurons.map((count, i) => {
        return { inputShape: [count], units: neurons[i + 1], activation: activations[i] || 'relu' as any }
      }).filter(l => l.units)
      console.log({ neurons, layers })
      layers.forEach(l => model.add(tf.layers.dense(l)))
      model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })

      const x = tf.tensor2d(opt.data.map(s => s.input))
      const y = tf.tensor2d(opt.data.map(s => s.output))
      await model.fit(x, y, {
        epochs: opt.epochs,
        callbacks: {
          onEpochEnd (epoch, log) {
            epoch > 3 && opt.callback({ error: log.loss, iterations: epoch })
          }
        }
      })
    },
    run (input: number[]): number[] {
      return (model.predict(tf.tensor2d([input])) as any).arraySync()
    }
  }
}

export const createTFNet = (inputSize: number, hiddenLayers: number[], outputSize: number, activations: string[] = []) => {
  const neurons = [inputSize].concat(hiddenLayers, [outputSize])
  const layers = neurons.map((count, i) => {
    return {
      inputShape: [count], units: neurons[i + 1],
      activation: activations[i] || 'relu' as any,
      kernelInitializer: 'glorotUniform'
    }
  }).filter(l => l.units)
  console.log({ neurons, layers })
  const model = tf.sequential()
  layers.forEach(l => model.add(tf.layers.dense(l)))
  model.compile({ optimizer: tf.train.adadelta(0.01), loss: 'meanSquaredError' })
  return model
}

setTimeout(async () => {
  // XOR TEST
  const data = [
    { input: [0, 0], output: [0] },
    { input: [1, 0], output: [1] },
    { input: [0, 1], output: [1] },
    { input: [1, 1], output: [0] },
  ]
  const model = createNet([16], ['relu', 'relu'])
  await model.trainNet({
    data,
    epochs: 200,
    callback: console.log
  })
  data.forEach(s => console.log('>>>>', s.output[0], model.run(s.input)[0]))
}, 1000)