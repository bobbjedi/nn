export const show = () => {
  if (!win_.isShow) { return }
  document.getElementById('message').innerHTML = ''
  const bord = document.getElementById('board')
  let cells = ''
  let i = 0
  while (i < 9) {
    cells += `<div id="cell-${i}" class="cell"></div>`
    i++
  }
  bord.innerHTML = cells
}

export const setVis = (num: number, side: number) => {
  if (!win_.isShow) { return }
  document.getElementById('cell-' + num).innerHTML = side === 0 ? '0' : 'X'
}
export const showWinner = (side: number) => {
  if (!win_.isShow) { return }
  document.getElementById('message').innerHTML = 'Wnner: ' + (side === 0 ? '0' : 'X')
}

const win_: any = window