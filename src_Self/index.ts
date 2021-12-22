import Player from './Player'
import Game from './Game'
import DQL from './DQL'
console.log('DQL', DQL)
const player0 = new Player(new DQL({
  inputSize: 9,
  outputSize: 9,
  hiddensLayers: [100],
  // learningRate: 0.01,

}), false)
const player1 = new Player({}, true)

// function startEvaluation() {
const delay = (t: number) => new Promise(r => setTimeout(r, t * 1000));
(async () => {
  await delay(1)
  console.log('Start')
  let i = 0
  while (i++ < 3000) {
    await delay(0.5)
    const testGame = new Game(player0, player1)
    while (testGame.isActive) {
      await testGame.step()
    }
  }
})()