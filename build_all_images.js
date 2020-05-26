let fs = require('fs')
let { createCanvas: _createCanvas, loadImage } = require('canvas')
let _ = require('lodash')

let px = val => val + 'px'

let createCanvas = (width, height) => {
  let dpr = 2
  let c = _createCanvas(width * dpr, height * dpr)
  let cx = c.getContext('2d')
  cx.scale(dpr, dpr)
  return c
}

function drawImage(cx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  cx.drawImage(img, sx * 2, sy * 2, sw * 2, sh * 2, dx, dy, dw, dh)
}

// --data
let output = JSON.parse(
  fs.readFileSync('data/output_wo_explanations.json', 'utf-8')
)
let output_with_indexes = output.map((o, i) => {
  o.index = i
  return o
})

let train_43 = output_with_indexes
  .filter(o => o.image_path.includes('train_43'))
  .map((o, i) => {
    o.local_index = i
    return o
  })
let train_46 = output_with_indexes
  .filter(o => o.image_path.includes('train_46'))
  .map((o, i) => {
    o.local_index = i
    return o
  })
let test = output_with_indexes
  .filter(o => o.image_path.includes('test'))
  .map((o, i) => {
    o.local_index = i
    return o
  })

let json = JSON.parse(fs.readFileSync('data/lime_no_segments.json', 'utf-8'))
let diffed_json = json.map((o, i) => {
  let item = json[i]
  let irm_diff = Math.abs(item.irm_prob - item.irm_lime_prob)
  let erm_diff = Math.abs(item.erm_prob - item.erm_lime_prob)
  o.index = i
  o.irm_diff = irm_diff
  o.erm_diff = erm_diff
  o.sum_diff = irm_diff + erm_diff
  return o
})
let all_indexes = diffed_json.map((n, i) => i)

let color = {
  bg: '#282828',
  fg: '#ebdbb2',
  red: '#fb4836',
  green: '#98971a',
  yellow: '#d79921',
  blue: '#458588',
  purple: '#b16286',
  aqua: '#689d68',
  gray: '#a89984',
  lessgray: '#555',
  black: '#1d2021',
}

color.gray = '#dfdfdf'
color.fg = '#cfcfcf'
color.black = '#efefef'
color.gray_text = '#2f2f2f'

let highlights = {
  red: '#EF8585',
  blue: '#b3cde3',
  green: '#A2DF94',
  purple: '#decbe4',
  orange: '#FFAF66',
  yellow: '#FFF280',
  brown: '#B5A272',
}

let connect_color = '#bfbfbf'

let alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

let panel = { cols: 8, rows: 2 }
let size = { x: 224 + 16, y: 224 + 16 + 16, p: 224 }
let panel_image_num = panel.cols * panel.rows
let panel_image_slots = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
  [7, 1],
]
let panel_left_slots = [
  [3, 0],
  [2, 0],
  [1, 0],
  [0, 0],
  [2, 1],
  [1, 1],
  [0, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [3, 3],
  [2, 3],
  [1, 3],
  [0, 3],
]

panel_left_slots = panel_image_slots.filter(v => v[1] < 1)
let panel_right_slots = panel_image_slots.filter(v => v[1] > 0)

function getEnv(path) {
  if (path.includes('train_43')) {
    return '1'
  } else if (path.includes('train_46')) {
    return '2'
  } else {
    return '3'
  }
}

function getLabel(path) {
  if (path.includes('coyote')) {
    return 'coy'
  } else {
    return 'rac'
  }
}

function getLongLabel(path) {
  if (path.includes('coyote')) {
    return 'coyote'
  } else {
    return 'raccoon'
  }
}

let env_colors = {
  1: highlights.yellow,
  2: highlights.orange,
  3: highlights.brown,
}

// --placement
function placeSingleImage(cx, path, x, y) {
  let temp = createCanvas(256, 256)
  let tx = temp.getContext('2d')
  return loadImage(path).then(img => {
    tx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 256, 256)
    console.log(size.p)
    drawImage(cx, temp, 16, 16, size.p, size.p, x, y, size.p, size.p)
  })
}
let og_image_size = 224
function placeSingleImageAndOutline(cx, path, x, y, segments) {
  let size = 1
  let temp = createCanvas(256, 256)
  let tx = temp.getContext('2d')
  return loadImage(path).then(img => {
    tx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 256, 256)
    drawImage(cx, temp, 16, 16, 224, 224, x, y, 224, 224)
    let dirs = [
      [-1, 0],
      [0, -1],
      [1, 0],
      [0, 1],
    ]
    cx.strokeStyle = '#dfdfdf'
    cx.lineWidth = 1
    for (let r = 0; r < og_image_size; r++) {
      for (let c = 0; c < og_image_size; c++) {
        let segment = segments[r][c]
        let di = dirs.map(dir => {
          let next = [c + dir[0], r + dir[1]]
          if (
            next[0] >= 0 &&
            next[0] < og_image_size &&
            next[1] >= 0 &&
            next[1] < og_image_size
          ) {
            let next_segment = segments[next[1]][next[0]]
            return next_segment !== segment
          } else {
            return true
          }
        })
        for (let i = 0; i < dirs.length; i++) {
          let check = di[i]
          if (check) {
            if (i === 0) {
              cx.beginPath()
              cx.moveTo(x + c * size, y + r * size)
              cx.lineTo(x + c * size, y + (r + 1) * size)
              cx.stroke()
            } else if (i === 1) {
              cx.beginPath()
              cx.moveTo(x + c * size, y + r * size)
              cx.lineTo(x + (c + 1) * size, y + (r + 1) * size)
              cx.stroke()
            } else if (i === 2) {
              cx.beginPath()
              cx.moveTo(x + (c + 1) * size, y + r * size)
              cx.lineTo(x + (c + 1) * size, y + (r + 1) * size)
              cx.stroke()
            } else if (i === 2) {
              cx.beginPath()
              cx.moveTo(x + c * size, y + (r + 1) * size)
              cx.lineTo(x + (c + 1) * size, y + (r + 1) * size)
              cx.stroke()
            }
          }
        }
      }
    }
    cx.strokeRect(x + 1, y + 1, 223.5, 223.5)
  })
}
function placeSingleImageHighlight(
  cx,
  path,
  x,
  y,
  segments,
  coefficients,
  highlight_num
) {
  let size = 1
  let temp = createCanvas(256, 256)
  let tx = temp.getContext('2d')

  let etemp = createCanvas(og_image_size, og_image_size)
  let etx = etemp.getContext('2d')

  return loadImage(path).then(img => {
    cx.fillStyle = color.black
    cx.fillRect(x + 0, y + 0, 224, 224)

    tx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 256, 256)
    cx.globalAlpha = 0.4
    drawImage(cx, temp, 16, 16, 224, 224, x + 0, y + 0, 224, 224)
    cx.globalAlpha = 1

    drawImage(etx, temp, 16, 16, 224, 224, 0, 0, og_image_size, og_image_size)

    let pos_coef = coefficients.filter(v => v[1] > 0).slice(0, 12)
    if (highlight_num) {
      pos_coef = coefficients.filter(v => v[1] > 0).slice(0, highlight_num)
    }
    let seg_to_draw = pos_coef.map(o => o[0])
    for (let r = 0; r < og_image_size; r++) {
      for (let c = 0; c < og_image_size; c++) {
        let segment = segments[r][c]
        if (seg_to_draw.includes(segment)) {
          drawImage(
            cx,
            etemp,
            c * size,
            r * size,
            1,
            1,
            0 + x + c * size,
            0 + y + r * size,
            1,
            1
          )
        }
      }
    }
  })
}
function placeSingleImagePermutation(
  cx,
  path,
  x,
  y,
  segments,
  coefficients,
  mask_num
) {
  let size = 1
  let temp = createCanvas(256, 256)
  let tx = temp.getContext('2d')

  let etemp = createCanvas(og_image_size, og_image_size)
  let etx = etemp.getContext('2d')

  return loadImage(path).then(img => {
    tx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 256, 256)

    drawImage(etx, temp, 16, 16, 224, 224, 0, 0, og_image_size, og_image_size)

    let pixel_holder = {}
    let image_data_holder = etx.getImageData(0, 0, og_image_size, og_image_size)
    let image_data = image_data_holder.data

    let all_segments = coefficients.map((n, i) => i)
    let seg_to_draw = _.sampleSize(all_segments, coefficients.length - mask_num)
    for (let r = 0; r < og_image_size; r++) {
      for (let c = 0; c < og_image_size; c++) {
        let segment = segments[r][c]
        if (seg_to_draw.includes(segment)) {
          drawImage(
            cx,
            etemp,
            c * size,
            r * size,
            1,
            1,
            0 + x + c * size,
            0 + y + r * size,
            1,
            1
          )
        } else {
          if (pixel_holder[segment] === undefined) {
            pixel_holder[segment] = []
          }
          let coord = r * og_image_size * 4 + c * 4
          let pixel = image_data.slice(coord, coord + 4)
          pixel_holder[segment].push([c, r, pixel])
        }
      }
    }
    let pixel_keys = Object.keys(pixel_holder)
    for (let k = 0; k < pixel_keys.length; k++) {
      let pixels = pixel_holder[pixel_keys[k]]
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < pixels.length; i++) {
        r += pixels[i][2][0]
        g += pixels[i][2][1]
        b += pixels[i][2][2]
      }
      r = Math.round(r / pixels.length)
      g = Math.round(g / pixels.length)
      b = Math.round(b / pixels.length)
      cx.fillStyle = 'rgb(' + [r, g, b].join(',') + ')'
      for (let i = 0; i < pixels.length; i++) {
        cx.fillRect(0 + x + pixels[i][0], 0 + y + pixels[i][1], 1, 1)
      }
    }
  })
}

let offset_x = 16
let offset_y = 16
let sel_pad = 4
let y_adjust = 24

let filenames = []

async function process() {
  for (let i = 0; i < output_with_indexes.length; i++) {
    // for (let i = 0; i < 10; i++) {
    let filename = `all_${i}.jpg`
    filenames.push(filename)

    await new Promise(next => {
      let cx = createCanvas(
        4 * size.x + offset_x,
        1 * size.y + offset_y
      ).getContext('2d')
      cx.fillStyle = 'white'
      cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

      cx.textBaseline = 'middle'
      cx.font = '13.333px JetBrains Mono'
      cx.fillStyle = color.gray_text

      let promises = []

      let index = i
      let image = output_with_indexes[index]
      let x = offset_x
      let y = offset_y
      let path = 'data' + image.image_path

      let file_index = [Math.floor(index / 100), index % 100]
      let og_filename = 'outa' + alphabet[file_index[0]] + '.json'
      let file_json = JSON.parse(
        fs.readFileSync('data/' + og_filename, 'utf-8')
      )
      let og_item = file_json[file_index[1]]

      let env = getEnv(path)
      let label = getLabel(path)
      let long_label = getLongLabel(path)
      let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
      let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
      let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
      let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

      // --original
      promises.push(placeSingleImage(cx, path, x, y))

      cx.fillStyle = env_colors[env]
      cx.fillRect(x, y + size.y - y_adjust - 8, 1 * 8, 16)

      cx.fillStyle = color.gray_text
      cx.fillText(env, x, y + size.y - y_adjust)

      x += 1 * 8
      cx.fillText(
        '-' + image.local_index.toString().padStart(3, '0'),
        x,
        y + size.y - y_adjust
      )
      x += 5 * 8
      cx.fillText(long_label, x, y + size.y - y_adjust)

      // --superpixels
      x = size.x + offset_x
      y = offset_y
      promises.push(
        placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
      )
      let superpixel_num = og_item.irm.coefficients.length
      let text = superpixel_num + ' superpixels'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)

      x = size.x * 2 + offset_x
      y = offset_y
      // --ERM
      promises.push(
        placeSingleImageHighlight(
          cx,
          path,
          x,
          y,
          og_item.erm.segments,
          og_item.erm.coefficients,
          12
        )
      )
      x += 19 * 8
      cx.fillStyle = color.gray_text
      cx.fillText('ERM', x, y + size.y - y_adjust)

      x += 4 * 8
      if (erm_prediction === label) {
        cx.fillStyle = highlights.green
      } else {
        cx.fillStyle = highlights.red
      }
      cx.fillRect(x, y + size.y - y_adjust - 8, 5 * 8, 16)

      cx.fillStyle = color.gray_text
      cx.fillText(erm_prediction, x, y + size.y - y_adjust)
      x += 4 * 8
      cx.fillStyle = 'rgba(0,0,0,0.2)'
      cx.fillRect(
        x,
        y + size.y - y_adjust - 8 + 16 * (1 - image.erm.prob),
        8,
        image.erm.prob * 16
      )

      x = size.x * 3 + offset_x
      y = offset_y
      // --IRM
      promises.push(
        placeSingleImageHighlight(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          12
        )
      )
      x += 19 * 8
      cx.fillStyle = color.gray_text
      cx.fillText('IRM', x, y + size.y - y_adjust)

      x += 4 * 8
      if (irm_prediction === label) {
        cx.fillStyle = highlights.green
      } else {
        cx.fillStyle = highlights.red
      }
      cx.fillRect(x, y + size.y - y_adjust - 8, 5 * 8, 16)

      cx.fillStyle = color.gray_text
      cx.fillText(irm_prediction, x, y + size.y - y_adjust)
      x += 4 * 8
      cx.fillStyle = 'rgba(0,0,0,0.2)'
      cx.fillRect(
        x,
        y + size.y - y_adjust - 8 + 16 * (1 - image.irm.prob),
        8,
        image.irm.prob * 16
      )

      Promise.all(promises).then(() => {
        let buffer = cx.canvas.toBuffer('image/jpeg')
        console.log(filename)
        fs.writeFileSync(`all_images/` + filename, buffer)
      })

      next()
    })
  }
}

process()
