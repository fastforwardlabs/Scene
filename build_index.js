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

let args = process.argv.slice(2)

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

    console.log(coefficients)
    let pos_coef = coefficients.filter(v => v[1] > 0).slice(0, 12)
    console.log('filter')
    console.log(coefficients.filter(v => v[1] > 0))
    console.log('end filter')
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

// --panels
let content_0 = `<div class="padded">
  <h1>Scene</h1>
  <div>
  <p>Built to accompany our report on <a href="">Causality in Machine Learning</a>, Scene shows how we applied a technique called invariant risk minimization (IRM) to a portion of the iWildcam dataset.
  <p>WIth IRM, you group training data into environments. Declaring environments helps minimize spurious correlations during model training. Here, we explain the technique using real sample images and model results.</p>
    <div class="spacer"></div>
    <h2>Contents</h2>
    <ol style="">
      <li>Training environments</li>
      <li>Model training</li>
      <li>Results - training dataset</li>
      <li>Results - test dataset</li>
      <li>Interpretability with LIME</li>
      <li>Ranking superpixels</li>
      <li>Model comparison</li>
    </ol>
    </div>
  </div>
</div>`

if (args.includes('0')) {
  let filename = `panel_0.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let images = [
    ..._.sampleSize(train_43, 6),
    ..._.sampleSize(train_46, 5),
    ..._.sampleSize(test, 5),
  ]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let [bx, by] = panel_image_slots[i]
    let x = offset_x + bx * size.x
    let y = offset_y + by * size.y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLongLabel(path)

    promises.push(placeSingleImage(cx, path, x, y))

    // cx.fillStyle = env_colors[env]
    // cx.fillRect(x, y + size.y - y_adjust - 8, 1 * 8, 16)
    cx.fillStyle = color.gray_text
    cx.fillText(env, x, y + size.y - y_adjust)
    x += 1 * 8
    cx.fillText(
      '-' + image.local_index.toString().padStart(3, '0'),
      x,
      y + size.y - y_adjust
    )
    x += 5 * 8
    cx.fillText(label, x, y + size.y - y_adjust)
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let top_row = `<div style="display: inline; background: #dfdfdf; position: relative;" title="top row">&nbsp;&nbsp;&nbsp;
<div style="position: absolute; left:20%; top:25%; width: 60%; background: #2f2f2f; height: 4px;"></div>
<div style="position: absolute; left:20%; top:60%; width: 60%; background: #9f9f9f; height: 4px;"></div>
</div>`
let bot_row = `<div style="display: inline; background: #dfdfdf; position: relative;" title="bottom row">&nbsp;&nbsp;&nbsp;
<div style="position: absolute; left:20%; top:25%; width: 60%; background: #9f9f9f; height: 4px;"></div>
<div style="position: absolute; left:20%; top:60%; width: 60%; background: #2f2f2f; height: 4px;"></div>
</div>`

let content_1 = `<div class="padded">
  <h1>Training environments</h1>
  <div>
    <div class="p">The full iWIldcam dataset contains 0000 images from 000 cameras. For our training we limited it to two cameras: train_43, which we grouped as environment <span style="background: ${highlights.yellow};">1</span> ${top_row}, and train_46, which we grouped as environment <span style="background: ${highlights.orange};">2</span> ${bot_row}.</div>
    <p>We wanted to train a binary classifier, so we further limted the dataset to images of coyotes and raccoons.</p><p>The final stats for our training dataset are:</p>
    <div class="spacer"></div>
    <div class="spacer"></div>
  <h2>Training dataset</h2>
    <ul>
      <li>environment <span style="background: ${highlights.yellow};">1</span>
      <ul>
      <li>658 images
        <ul>
      <li>582 racoons</li>
      <li>276 coyotes</li>
        </ul>
      </li>
      </ul>
      <li>environment <span style="background: ${highlights.orange};">2</span>
      <ul>
      <li>753 images
        <ul>
      <li>512 coyotes</li>
      <li>241 raccoons</li>
        </ul>
      </li>
      </ul>
      </li>
      </li>
    </ul>
  </div>
</div>`

if (args.includes('1')) {
  let filename = `panel_1.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let images = [..._.sampleSize(train_43, 8), ..._.sampleSize(train_46, 8)]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let [bx, by] = panel_image_slots[i]
    let x = offset_x + bx * size.x
    let y = offset_y + by * size.y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLongLabel(path)

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
    cx.fillText(label, x, y + size.y - y_adjust)
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let content_2 = `<div class="padded">
  <h1>Model training</h1>
  <div>
    <div class="p">We trained two models, one using IRM, and one using the more conventional empirical risk minimization (ERM).</div>
    <div class="p">For ERM training ${top_row}, all the images are fed in together, with no distinction made between environemnts. In IRM training ${bot_row}, the images are grouped by environment and [EXPLAIN HOW IRM WORKS].</div>
  </div>
 
</div>`

if (args.includes('2')) {
  let filename = `panel_2.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let eight = [..._.sampleSize(train_43, 4), ..._.sampleSize(train_46, 4)]

  // doing it the dumb way
  let images = [
    eight[0],
    eight[4],
    eight[1],
    eight[5],
    eight[2],
    eight[6],
    eight[3],
    eight[7],
    ...eight,
  ]
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLongLabel(path)

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
    cx.fillText(label, x, y + size.y - y_adjust)
  }

  Promise.all(promises).then(() => {
    // cx.fillStyle = '#cfcfcf'
    // cx.fillRect(size.x * 4 - 1, size.y, 2, size.y - 16)

    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let chart = createCanvas(size.x * 2 - 48, 8 * 9)
{
  let chx = chart.getContext('2d')

  // chx.fillStyle = '#dfdfdf'
  // chx.fillRect(0, 0, chx.canvas.width, chx.canvas.height)

  chx.textBaseline = 'middle'
  chx.font = '13.333px JetBrains Mono'
  chx.fillStyle = color.gray_text

  chx.fillText('ERM:', 0, 16)
  chx.fillText('IRM:', 0, 16 + 8 * 5)
  let bar_possible = chx.canvas.width - 16 - 5 * 4

  // chx.fillStyle = '#efefef'
  // chx.fillRect(16 + 5 * 4, 0, bar_possible, 16 * 7)

  chx.fillStyle = highlights.red
  chx.fillRect(16 + 5 * 4, 0, bar_possible, 16 * 2)

  let bar1w = bar_possible * 0.86
  chx.fillStyle = highlights.green
  chx.fillRect(16 + 5 * 4, 0, bar1w, 16 * 2)

  chx.fillStyle = highlights.red
  chx.fillRect(16 + 5 * 4, 0 + 8 * 5, bar_possible, 16 * 2)

  let bar2w = bar_possible * 0.85
  chx.fillStyle = highlights.green
  chx.fillRect(16 + 5 * 4, 0 + 8 * 5, bar2w, 16 * 2)

  chx.fillStyle = color.gray_text
  chx.fillText('86% accurate', 8 * 6, 16)
  chx.fillText('85% accurate', 8 * 6, 16 + 8 * 5)
}

let content_3 = `<div class="padded">
    <h1>Results: training dataset</h1>
    <div style="padding-top: 8px; padding-bottom: 8px;">
      <img class="chart" src="${chart.toDataURL()}" />
    </div>
    <div>
      <div class="p">Accuracy of the two models on the combined training datasets is about the same.</div>
      <div class="p">On the right you can see sample images from the dataset and their predictions (ERM under 'E' and IRM under 'I'). The shaded bar in the label shows the model's certainty.</div>
    </div>
</div>`

if (args.includes('3')) {
  let filename = `panel_3.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let train_43_right = train_43.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction === label
  })
  let train_43_wrong = train_43.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction !== label && irm_prediction !== label
  })
  let train_43_irm_only_right = train_43.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction !== label && irm_prediction === label
  })

  let train_46_right = train_46.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction === label
  })
  let train_46_wrong = train_46.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction !== label && irm_prediction !== label
  })
  let train_46_erm_only_right = train_46.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction !== label
  })

  let images = [
    ..._.sampleSize(train_43_right, 6),
    ..._.sampleSize(train_43_irm_only_right, 1),
    ..._.sampleSize(train_43_wrong, 1),
    ..._.sampleSize(train_46_right, 6),
    ..._.sampleSize(train_46_wrong, 1),
    ..._.sampleSize(train_46_erm_only_right, 1),
  ]
  images = _.shuffle(images)
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

    // cx.fillStyle = connect_color
    // cx.fillRect(x, y, size.p, size.p + 16)

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
    cx.fillText(label, x, y + size.y - y_adjust)

    x += 7 * 8
    cx.fillStyle = color.gray_text
    cx.fillText('E', x, y + size.y - y_adjust)

    x += 2 * 8
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
    // cx.fillText(erm_certainty, x, y + size.y - 32 + 8)

    x += 2 * 8
    cx.fillStyle = color.gray_text
    cx.fillText('I', x, y + size.y - y_adjust)

    x += 2 * 8
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
    // cx.fillText(irm_certainty, x, y + size.y - 32 + 8)
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let chart_4 = createCanvas(size.x * 2 - 48, 8 * 9)
{
  let chx = chart_4.getContext('2d')

  // chx.fillStyle = '#dfdfdf'
  // chx.fillRect(0, 0, chx.canvas.width, chx.canvas.height)

  chx.textBaseline = 'middle'
  chx.font = '13.333px JetBrains Mono'
  chx.fillStyle = color.gray_text

  chx.fillText('ERM:', 0, 16)
  chx.fillText('IRM:', 0, 16 + 8 * 5)
  let bar_possible = chx.canvas.width - 16 - 5 * 4

  // chx.fillStyle = '#efefef'
  // chx.fillRect(16 + 5 * 4, 0, bar_possible, 16 * 7)

  chx.fillStyle = highlights.red
  chx.fillRect(16 + 5 * 4, 0, bar_possible, 16 * 2)

  let bar1w = bar_possible * 0.36
  chx.fillStyle = highlights.green
  chx.fillRect(16 + 5 * 4, 0, bar1w, 16 * 2)

  chx.fillStyle = highlights.red
  chx.fillRect(16 + 5 * 4, 0 + 8 * 5, bar_possible, 16 * 2)

  let bar2w = bar_possible * 0.79
  chx.fillStyle = highlights.green
  chx.fillRect(16 + 5 * 4, 0 + 8 * 5, bar2w, 16 * 2)

  chx.fillStyle = color.gray_text
  chx.fillText('36% accurate', 8 * 6, 16)
  chx.fillText('79% accurate', 8 * 6, 16 + 8 * 5)
}

let content_4 = `<div class="padded">
    <h1>Results: test dataset</h1>
    <div style="padding-top: 8px; padding-bottom: 8px;">
      <img class="chart" src="${chart_4.toDataURL()}" />
    </div>
    <div class="p">But what happens when we introduce a third environemnt. A different camera. IRM outperforms.</div>
</div>`

if (args.includes('4')) {
  let filename = `panel_4.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let test_right = test.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction === label
  })
  let test_wrong = test.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction !== label && irm_prediction !== label
  })
  let test_irm_only_right = test.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction !== label && irm_prediction === label
  })
  let test_erm_only_right = test.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction !== label
  })

  let images = [
    ..._.sampleSize(test_wrong, 3),
    ..._.sampleSize(test_irm_only_right, 7),
    ..._.sampleSize(test_right, 6),
  ]
  images = _.shuffle(images)
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = 3
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

    // cx.fillStyle = connect_color
    // cx.fillRect(x, y, size.p, size.p + 16)

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
    cx.fillText(label, x, y + size.y - y_adjust)

    x += 7 * 8
    cx.fillStyle = color.gray_text
    cx.fillText('E', x, y + size.y - y_adjust)

    x += 2 * 8
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
    // cx.fillText(erm_certainty, x, y + size.y - 32 + 8)

    x += 2 * 8
    cx.fillStyle = color.gray_text
    cx.fillText('I', x, y + size.y - y_adjust)

    x += 2 * 8
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
    // cx.fillText(irm_certainty, x, y + size.y - 32 + 8)
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let content_5 = `<div class="padded">
    <h1>Interpretability</h1>
   <div class="p">So we can see IRM outperforms ERM on a new environment. It would be nice to have a better sense of what is going on. For that we turn to an interpretability technique called LIME. LIME works by taking an image and splitting it into superpixels. It makes permutations of the images by masking different combinations of the ysuperpixels.</div>
</div>`

if (args.includes('5')) {
  let filename = `panel_5.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray_text

  let promises = []

  let samp43 = _.sample(train_43)
  for (let i = 0; i < 4; i++) {
    let image = samp43
    let index = image.index
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    if (i === 0) {
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
    } else if (i === 1) {
      let superpixel_num = og_item.irm.coefficients.length
      promises.push(
        placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
      )
      let text = superpixel_num + ' superpixels'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    } else {
      let mask_num =
        4 + Math.floor(Math.random() * (og_item.irm.coefficients.length / 2))
      promises.push(
        placeSingleImagePermutation(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          mask_num
        )
      )
      let text = mask_num + ' masked'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  let samp46 = _.sample(train_46)
  for (let i = 0; i < 4; i++) {
    let image = samp46
    let index = image.index
    let [bx, by] = panel_image_slots[i + 4]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    if (i === 0) {
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
    } else if (i === 1) {
      let superpixel_num = og_item.irm.coefficients.length
      promises.push(
        placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
      )
      let text = superpixel_num + ' superpixels'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    } else {
      let mask_num =
        4 + Math.floor(Math.random() * (og_item.irm.coefficients.length / 2))
      promises.push(
        placeSingleImagePermutation(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          mask_num
        )
      )
      let text = mask_num + ' masked'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  let test1 = _.sample(test)
  for (let i = 0; i < 4; i++) {
    let image = test1
    let index = image.index
    let [bx, by] = panel_image_slots[i + 8]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    if (i === 0) {
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
    } else if (i === 1) {
      let superpixel_num = og_item.irm.coefficients.length
      promises.push(
        placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
      )
      let text = superpixel_num + ' superpixels'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    } else {
      let mask_num =
        4 + Math.floor(Math.random() * (og_item.irm.coefficients.length / 2))
      promises.push(
        placeSingleImagePermutation(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          mask_num
        )
      )
      let text = mask_num + ' masked'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  let train432 = _.sample(train_43)
  for (let i = 0; i < 4; i++) {
    let image = train432
    let index = image.index
    let [bx, by] = panel_image_slots[i + 12]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    if (i === 0) {
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
    } else if (i === 1) {
      let superpixel_num = og_item.irm.coefficients.length
      promises.push(
        placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
      )
      let text = superpixel_num + ' superpixels'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    } else {
      let mask_num =
        4 + Math.floor(Math.random() * (og_item.irm.coefficients.length / 2))
      promises.push(
        placeSingleImagePermutation(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          mask_num
        )
      )
      let text = mask_num + ' masked'
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let content_6 = `<div class="padded">
  <h1>Ranking superpixels</h1>
  <div>
    <div class="p">Using the LIME values we can rank superpixels which are important to the prediction.</div>
  </div>
</div>`

if (args.includes('6')) {
  let filename = `panel_6.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray

  let promises = []

  let test_right = test.filter(image => {
    let path = 'data' + image.image_path
    let label = path.includes('coyote') ? 'coy' : 'rac'
    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    return erm_prediction === label && irm_prediction === label
  })

  let test1 = _.sample(test_right)
  for (let i = 0; i < 8; i++) {
    let image = test1
    let index = image.index
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

    if (i === 0) {
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

      x += 13 * 8
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
    } else {
      let highlight_num = i
      let superpixel_num = og_item.erm.coefficients.length
      promises.push(
        placeSingleImageHighlight(
          cx,
          path,
          x,
          y,
          og_item.erm.segments,
          og_item.erm.coefficients,
          highlight_num
        )
      )
      cx.fillStyle = color.gray_text
      let text = 'ERM top ' + i
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  for (let i = 0; i < 8; i++) {
    let image = test1
    let index = image.index
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

    if (i === 0) {
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

      x += 13 * 8
      cx.fillStyle = color.gray_text
      cx.fillText('IRM', x, y + size.y - y_adjust)

      x += 4 * 8
      if (erm_prediction === label) {
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
    } else {
      let highlight_num = i
      let superpixel_num = og_item.erm.coefficients.length
      promises.push(
        placeSingleImageHighlight(
          cx,
          path,
          x,
          y,
          og_item.irm.segments,
          og_item.irm.coefficients,
          highlight_num
        )
      )
      cx.fillStyle = color.gray_text
      let text = 'IRM top ' + i
      let w = cx.measureText(text).width
      let rx = size.x - w - 16
      cx.fillText(text, x + rx, y + size.y - y_adjust)
    }
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let content_7 = `<div class="padded">
  <h1>Model comparison</h1>
  <div>
    <div class="p">By looking at the ranked superpixels for the different models we can get a better idea of what they're focused on. Here are some sample images suggesting that IRM may be more focused on images containing the animal (the result we would hope for). Neither the model nor the interpretability technique are perfect.</div>
  </div>
</div>`

if (args.includes('7')) {
  let filename = `panel_7.jpg`

  let cx = createCanvas(
    panel.cols * size.x + offset_x,
    panel.rows * size.y + offset_y
  ).getContext('2d')
  cx.fillStyle = color.black
  cx.fillRect(0, 0, cx.canvas.width, cx.canvas.height)

  cx.textBaseline = 'middle'
  cx.font = '13.333px JetBrains Mono'
  cx.fillStyle = color.gray

  let promises = []

  let images = _.sampleSize(output_with_indexes, panel_image_num / 2)
  let shortlist_test = [1838, 1750, 1851, 1446, 2044, 2078, 1662, 1347]
  images = shortlist_test.map(i => output_with_indexes[i])
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let index = image.index
    let [bx, by] = panel_image_slots[i]
    let x = bx * size.x + offset_x
    let y = by * size.y + offset_y
    let path = 'data' + image.image_path

    let env = getEnv(path)
    let label = getLabel(path)
    let long_label = getLongLabel(path)

    let file_index = [Math.floor(index / 100), index % 100]
    let filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + filename, 'utf-8'))
    let og_item = file_json[file_index[1]]

    let erm_prediction = image.erm.prediction === 'coyote' ? 'coy' : 'rac'
    let erm_certainty = Math.floor(image.erm.prob * 100) + '%'
    let irm_prediction = image.irm.prediction === 'coyote' ? 'coy' : 'rac'
    let irm_certainty = Math.floor(image.irm.prob * 100) + '%'

    // ERM
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
    cx.fillText(label, x, y + size.y - y_adjust)

    x += 13 * 8
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

    // IRM
    y = by * size.y + size.y + offset_y
    x = bx * size.x + offset_x
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
    cx.fillText(label, x, y + size.y - y_adjust)

    x += 13 * 8
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
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let filenames = [
  `panel_0.jpg`,
  'panel_1.jpg',
  'panel_2.jpg',
  'panel_3.jpg',
  'panel_4.jpg',
  'panel_5.jpg',
  'panel_6.jpg',
  'panel_7.jpg',
]
let contents = [
  content_0,
  content_1,
  content_2,
  content_3,
  content_4,
  content_5,
  content_6,
  content_7,
]
// contents = [content_1]

let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,shrink-to-fit=no"
    />
    <title>Wilcat</title>
    <style type="text/css">
@font-face {
  font-family: JetBrains Mono;
  src: url('data:application/font-woff;base64,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')
    format('woff');
  font-weight: 400;
  font-style: normal;
}

      * {
        box-sizing: border-box;
      }
      html {
        background: ${color.black};
        font-family: sans-serif, monospace;
        font-size: 16;
        line-height: 24px;
      }
      body {
        padding: 0;
        margin: 0;
      }
      img {
        display: block;
      }
     .scroller {
     width: 2048px;
     }
     .panel {
     // width: 2048px;
      // width: 100%;
      // overflow: auto;
      // margin: 0 auto;
     }
     .padded {
      padding: 16px;
     }
     .bar {
     padding-top: 2px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13.333px;
      line-height: 16px;
      color: #2f2f2f;
      background: #bfbfbf;
      padding-left: 8px;
      padding-right: 8px;
      height: 24px;
      border-top: solid 1px #9f9f9f;
     }
     p, .p {
      margin: 0;
      padding: 0;
      text-indent: 2ch;
     }
     a {
      color: inherit;
     }
     h1 {
      margin: 0;
       font-size: 24px;
       line-height: 32px; 
       margin-bottom: 6px;
     }
     h2 {
      margin: 0;
      font-size: 20px;
      margin-bottom: 6px;
     }
     .spacer {
      height: 12px;
      width: 100%;
     }
     ol, ul {
font-family: JetBrains Mono; font-size: 15px; line-height: 1.2; padding-left: 3ch; margin: 0;

     }
     ul {
      list-style-type: none;
      padding: 0;
      margin: 0;
     }
     ul ul {
      padding-left: 2ch;
     }
     ul li:before {
       content: '- ';
     }
     .panel_image {
       width: 1936px;
     }
     .chart {

      width: 432px;
     }
    </style>
  </head>
  <body>
    <div id="scroller">
    ${filenames
      .map((n, i) => {
        let content = contents[i]
        return `<div style="position: relative">
          <div class="bar" style="">
            <div style="width: 100%; margin: 0 auto; display: flex; justify-content: space-between;"><div>${i +
              0}</div><div>prev next more</div></div>
          </div>
        <div class="panel" style="position: relative;">
          <div style="width: 100%; padding-left: ${size.x * 2 -
            16}px; overflow: auto; padding-top: 0px; padding-bottom: 0px;">
              <img class="panel_image" src="panels/${n}" />
          </div>
          <div style="position: absolute; left: ${01}px; top: ${0}px; width: ${size.x *
          2 -
          16}px; height: ${size.y * 2 +
          16}px; background: rgba(255,255,255,0.98);">${content}</div>
        </div>
        </div>`
      })
      .join('\n')}
      </div>
 </body>

  <script>
document.addEventListener("DOMContentLoaded", function(){
    // window.scrollTo((2048-window.innerWidth)/2, window.scrollY, 'auto')
    })
  </script>

</html>`
fs.writeFileSync('index.html', html)
