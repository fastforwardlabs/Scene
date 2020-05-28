let fs = require('fs')
let { createCanvas: _createCanvas, loadImage } = require('canvas')
let _ = require('lodash')

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

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
  <h1 style="font-size: 28px;">Scene</h1>
  <div style="margin-top: -4px;">by <a target="_blank" href="https://www.cloudera.com/products/fast-forward-labs-research.html">Cloudera Fast Forward</a></div>
  <div class="spacer"></div>
  <div>
  <p>Built to accompany our report on <a href="https://ff13.fastforwardlabs.com" target="_blank">Causality in Machine Learning</a>, Scene shows how we applied the invariant risk minimization (IRM) technique to a portion of the iWildcam dataset.
  <p>WIth IRM, you group training data into environments. Being explicit about environments helps minimize spurious correlations during model training. Below, we guide you through the process and model results using images from the dataset.</p>
    <div class="spacer"></div>
    <h2>Contents</h2>
    <ol style="">
    ${[
      'Training environments',
      'Model training',
      'Results: training datasets',
      'Results: test dataset',
      'Interpretability',
      'Ranking superpixels',
      'Model comparison',
      'View all',
    ]
      .map((n, i) => {
        return `<li><a href="#panel_${i}">${n}</a></li>`
      })
      .join('')}
   </ol>
    </div>
  </div>
`

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
    <div class="p">The <a target="_blank" href="https://arxiv.org/abs/1907.07617">full iWildcam dataset</a> contains over 300,000 images from 143 cameras in different locations. For our training we limited it to two cameras, which we grouped as environments <span style="background: ${highlights.yellow};">1</span> (top row) and <span style="background: ${highlights.orange};">2</span> (bottom row). The camera locations map naturally to the concept of environments used in IRM. Looking at the sample images you can see the background remains constant across an environment (though time of day does change).</div>
    <p>We trained a binary classifier, so we further limited the dataset to images of coyotes and raccoons. The final numbers for our training datasets are:</p>
    <div class="spacer"></div>
    <ul>
      <li>environment <span style="background: ${highlights.yellow};">1</span>
      <ul>
      <li>858 images
        <ul>
      <li>582 coyotes</li>
      <li>276 raccoons</li>
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
    <div class="p">The environments are fed into both models in batches. For the IRM model, the loss function is adjusted to try and balance classification performance across each environment. The adjusted loss function is what distinguishes IRM from the ERM approach.</div>
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
  let bar_possible = chx.canvas.width / 2 - 16 - 5 * 4

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
   <div>
    <p>Now let's take a look at how our trained models performed. On the combined training datasets (<span style="background: ${
      highlights.yellow
    }">1</span> & <span style="background: ${
  highlights.orange
}">2</span>) their accuracy is nearly equal. As a baseline, a model that always predicted coyote would achieve 68% accuracy (because the majority of the datasets are coyotes).
    </div>
      <div style="padding-top: 8px; padding-bottom: 8px;">
        <img class="chart" src="${chart.toDataURL()}" />
    </div>
    <div class="spacer"></div>
    <div class="spacer"></div>
    <h2>Reading the classifications</h2>
    <div>
    <div class="p">On the right, you can see sample classifications from the dataset. The ERM prediction is labeled 'E' and the IRM prediction 'I'. An accurate prediction is highlighted <span style="background: ${
      highlights.green
    }">green</span> and an inaccurate one <span style="background: ${
  highlights.red
};">red</span>. The shaded bar at the end of the prediction indicates the model's certainty.</div>
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
    ..._.shuffle([
      ..._.sampleSize(train_43_right, 6),
      ..._.sampleSize(train_43_irm_only_right, 1),
      ..._.sampleSize(train_43_wrong, 1),
    ]),
    ..._.shuffle([
      ..._.sampleSize(train_46_right, 6),
      ..._.sampleSize(train_46_wrong, 1),
      ..._.sampleSize(train_46_erm_only_right, 1),
    ]),
  ]
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
  let bar_possible = chx.canvas.width / 2 - 16 - 5 * 4

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
    <div>
    <p>But now look at what happens when we introduce a third environment:</p>
    <div style="padding-top: 8px; padding-bottom: 12px;">
      <img class="chart" src="${chart_4.toDataURL()}" />
    </div>
    <p>For our test dataset, environment <span style="background: ${
      highlights.brown
    }">3</span>, we used a different camera from the iWildcam dataset, which neither model saw during training. On the new dataset IRM vastly outperforms ERM, with IRM achieving 79% accuracy versus the ERM model's 36%. This performance suggests IRM has made the model more accurate across different environments.</p>
    <div class="spacer"></div>
    <ul>
      <li>environment <span style="background: ${highlights.brown};">3</span>
      <ul>
      <li>522 images
        <ul>
      <li>144 coyotes</li>
      <li>378 raccoons</li>
        </ul>
      </li>
      </ul>
      </ul>
      </div>
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
    ..._.sampleSize(test_irm_only_right, 6),
    ..._.sampleSize(test_right, 6),
  ]
  images = [output_with_indexes[2044], ..._.shuffle(images)]
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
   <div class="p">IRM's results on the test dataset look promising. But it would be nice to have a better sense of what is driving the classifications for each model.</div>
   <p>To try and better understand the models we used an interpretability technique called <a target="_blank" href="https://www.oreilly.com/content/introduction-to-local-interpretable-model-agnostic-explanations-lime/">LIME</a> to to visualize which parts of the image were driving the classification. To do this, LIME first splits an image into superpixels. It then creates permutations of the original image by randomly masking different combinations of those superpixels. It builds a regression model on those permutations and uses that to determine which superpixels contribute most to the classification.</p>
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

  let test1 = output_with_indexes[2044]
  for (let i = 0; i < 4; i++) {
    let image = test1
    let index = image.index
    let [bx, by] = panel_image_slots[i + 0]
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

  let samp43 = _.sample(train_43)
  for (let i = 0; i < 4; i++) {
    let image = samp43
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

  let samp46 = _.sample(train_46)
  for (let i = 0; i < 4; i++) {
    let image = samp46
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
    <div class="p">Here we show an example image with the top contributing superpixels, as determined by LIME, highlighted for each model. If you look at the image showing the "top 9" features, you can see that for the IRM model (top row) the coyote body is highlighted, while in the ERM model (bottom row) it is not.</div>
    <p>This kind of result would seem to indicate that the IRM model is better able to focus on the invariant features (the animal) versus the variant (the background environment). That could be the explanation for why it performs better on the environment <span style="background: ${highlights.brown};">3</span> dataset, which neither model has seen before.
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

  let test1 = output_with_indexes[2044]
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
      let highlight_num = i + 5
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
      let text = 'ERM top ' + (i + 5)
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
    } else {
      let highlight_num = i + 5
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
      let text = 'IRM top ' + (i + 5)
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
  <p> If all the of the model comparison looked like example <span style="background: ${highlights.brown};">3</span>-433, we could confidently say the IRM model is better at recognizing the animal across environments. <span style="background: ${highlights.brown};">3</span>-433 is only one example, however, and while it is definitely possible to find other images where the IRM highlighted features include the animal and the ERM do not (as in the examples shown here, where the top 12 features for each model are highlighted) it is definitely not the case for all of the images.</p> 
  <p>Looking through the entire dataset shows a lot of variation in which superpixels are highlighted for each model. The lack of a consistent, obvious pattern in the top features could mean neither model is successfully isolating the animal features, or it could mean this interpretability approach is not capable of visually capturing their focus (or it could be both).</div>
  </div>
`

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
  let shortlist_test = [2044, 1838, 1446, 1667, 1750, 1347, 1851, 2078]
  images = shortlist_test.map(i => output_with_indexes[i])
  for (let i = 0; i < images.length; i++) {
    let image = images[i]
    let index = image.index
    let [bx, by] = panel_image_slots[i * 2]
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

    x += 24
    // IRM
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
    // cx.fillStyle = env_colors[env]
    // cx.fillRect(x, y + size.y - y_adjust - 8, 1 * 8, 16)
    // cx.fillStyle = color.gray_text
    // cx.fillText(env, x, y + size.y - y_adjust)
    // x += 1 * 8
    // cx.fillText(
    //   '-' + image.local_index.toString().padStart(3, '0'),
    //   x,
    //   y + size.y - y_adjust
    // )
    // x += 5 * 8
    // cx.fillText(label, x, y + size.y - y_adjust)

    // x += 13 * 8
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
  }

  Promise.all(promises).then(() => {
    let buffer = cx.canvas.toBuffer('image/jpeg')
    fs.writeFileSync(`panels/` + filename, buffer)
  })
}

let content_8 = `<div class="padded">
  <h1>See more</h1>
  <div>
    <div class="p">If you would like to see for yourself in you can spot any patterns across highlighted features, you can <a href="/all">view all ${numberWithCommas(
      output.length
    )} images in the dataset</a>, along with each model's classifications and ranked superpixels.</div>
    <p>For more discussion of how we approached building these models, <a href="https://ff13.fastforwardlabs.com/#prototype">read the prototype section of our report</a>. The larger report puts IRM in the context of the larger efforts to bring causality into machine learning.
    <div class="spacer"></div>
    <div class="spacer"></div>
    <div>Thanks for reading! Let us know if you have any questions <a target="_blank" href="https://twitter.com/fastforwardlabs">@fastforwardlabs</a>.
    </div>
  </div>
</div>`

if (args.includes('8')) {
  let filename = `panel_8.jpg`

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

  {
    let index = 0
    let image = output_with_indexes[index]
    let x = offset_x
    let y = offset_y
    let path = 'data' + image.image_path

    let file_index = [Math.floor(index / 100), index % 100]
    let og_filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + og_filename, 'utf-8'))
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
  }

  {
    let index = train_46[0].index
    let image = output_with_indexes[index]
    let x = offset_x + size.x * 4
    let y = offset_y
    let path = 'data' + image.image_path

    let file_index = [Math.floor(index / 100), index % 100]
    let og_filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + og_filename, 'utf-8'))
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
    x = size.x * 4 + size.x + offset_x
    y = offset_y
    promises.push(
      placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
    )
    let superpixel_num = og_item.irm.coefficients.length
    let text = superpixel_num + ' superpixels'
    let w = cx.measureText(text).width
    let rx = size.x - w - 16
    cx.fillText(text, x + rx, y + size.y - y_adjust)

    x = size.x * 4 + size.x * 2 + offset_x
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

    x = size.x * 4 + size.x * 3 + offset_x
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
  }

  {
    let index = test[0].index
    let image = output_with_indexes[index]
    let x = offset_x
    let y = offset_y + size.y
    let path = 'data' + image.image_path

    let file_index = [Math.floor(index / 100), index % 100]
    let og_filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + og_filename, 'utf-8'))
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
    promises.push(
      placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
    )
    let superpixel_num = og_item.irm.coefficients.length
    let text = superpixel_num + ' superpixels'
    let w = cx.measureText(text).width
    let rx = size.x - w - 16
    cx.fillText(text, x + rx, y + size.y - y_adjust)

    x = size.x * 2 + offset_x
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
  }

  {
    let index = output_with_indexes.length - 1
    let image = output_with_indexes[index]
    let x = offset_x + size.x * 4
    let y = offset_y + size.y
    let path = 'data' + image.image_path

    let file_index = [Math.floor(index / 100), index % 100]
    let og_filename = 'outa' + alphabet[file_index[0]] + '.json'
    let file_json = JSON.parse(fs.readFileSync('data/' + og_filename, 'utf-8'))
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
    x = size.x * 4 + size.x + offset_x
    promises.push(
      placeSingleImageAndOutline(cx, path, x, y, og_item.irm.segments)
    )
    let superpixel_num = og_item.irm.coefficients.length
    let text = superpixel_num + ' superpixels'
    let w = cx.measureText(text).width
    let rx = size.x - w - 16
    cx.fillText(text, x + rx, y + size.y - y_adjust)

    x = size.x * 4 + size.x * 2 + offset_x
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

    x = size.x * 4 + size.x * 3 + offset_x
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
  'panel_8.jpg',
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
  content_8,
]
// contents = [content_1]

let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      id="vp"
      name="viewport"
      content="width=device-width,initial-scale=1,shrink-to-fit=no"
    />
    <title>Scene</title>
    <meta
      name="description"
      content="Scene shows how we applied the invariant risk minimization technique to an image classification model. Take a guided tour through the results, including an interpretability visualization."
    />
  <meta property="og:title" content="Scene" />
  <meta
property="og:description"
content="Scene shows how we applied the invariant risk minimization technique to an image classification model. Take a guided tour through the results, including an interpretability visualization."
  />
  <meta
property="og:image"
content="https://scene.fastforwardlabs.com/scene.png"
  />
  <meta property="og:url" content="https://scene.fastforwardlabs.com" />
  <meta name="twitter:card" content="summary_large_image" />


    <style type="text/css">
        @font-face {
          font-family: 'custom';
          src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2'),
            url('/fonts/JetBrainsMono-Regular.woff') format('woff');
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
        scroll-behavior: smooth;
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
      font-family: 'custom', monospace;
      font-size: 13.333px;
      line-height: 16px;
      color: #2f2f2f;
      background: #cfcfcf;
      padding-left: 8px;
      padding-right: 8px;
      height: 24px;
      border-top: solid 1px #afafaf;
     }
     p, .p {
      margin: 0;
      padding: 0;
      text-indent: 2ch;
     }
     p:first-child, .p:first-child {
     text-indent: 0;
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
    .explainer {
      font-family: custom; font-size: 15px; line-height: 1.2;  margin: 0;
      }
     ol, ul {
font-family: custom; font-size: 15px; line-height: 1.2; padding-left: 3ch; margin: 0;

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
    span {
      padding-left: 0.25ch;
      padding-right: 0.25ch;
    }
   </style>

  <!-- Global site tag (gtag.js) - Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=UA-157475426-5"></script>
  <script>
  window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'UA-157475426-5');
</script>
  </head>
  <body>
   <div id="holder">
    ${filenames
      .map((n, i) => {
        let content = contents[i]
        return `
          <div style="position: relative">
            <div id="panel_${i}" class="bar">
              <div style="width: 100%; margin: 0 auto; display: flex; justify-content: space-between;">
                <div>${i + 0}</div>
          <div style="display: none;">${
            i > 0 ? `<a href="#panel_${i - 1}">prev</a>` : ''
          } ${
          i < filenames.length - 1 ? `<a href="#panel_${i + 1}">next</a>` : ''
        }
                </div>
              </div>
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
  window.onload = function() {
    if (screen.width < 450) {
      console.log(screen.width)
      var mvp = document.getElementById('vp');
      mvp.setAttribute('content','width=${size.x * 4}');
      let holder = document.getElementById('holder');
      holder.style.width = ${size.x * 10} + 'px';
    }
  }
  </script>

</html>`
fs.writeFileSync('index.html', html)
