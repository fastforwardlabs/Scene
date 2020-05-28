let fs = require('fs')
let _ = require('lodash')

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

let size = { x: 224 + 16, y: 224 + 16 + 16, p: 224 }

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

let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,shrink-to-fit=no"
    />
    <title>Scene - all</title>
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
content="https://scene.fastforwardlabs.com/scene-all.png"
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
        background: white;
        font-family: "custom", monospace;
        font-size: 13.333px;
        line-height: 16px;
        scroll-behavior: smooth;
      }
      body {
        padding: 0;
        margin: 0;
      }
      img {
        display: block;
        width: 976px;
      }
      .container {
        width: 976px;
        margin: 0 auto;
      }
      a {
        color: inherit;
      }
      button {
        font-family: "JetBrains Mono", monospace;
        font-size: 13.333px;
        line-height: 16px;
        display: block;
        width: 100%;
        padding-top: 8px;
        padding-bottom: 8px;
      }
      hr {
        margin-top: 15px;
        margin-bottom: 15px;
      }
   </style>
  </head>
  <body>
    <div class="container">
  <div style="padding: 16px; padding-bottom: 0;">This page shows all the images from our ERM and IRM image classification models.<br />For more info and a guided tour, see the <a href="/">main page</a>.</div>
  <div style="padding-left: 16px; padding-right: 16px;"><hr /></div>
      <div id="train_43">
      <div style="padding: 16px; padding-bottom: 0;">
        Jump to: <a href="#train_43">training environment 1</a>
<a href="#train_46">training environment 2</a>
<a href="#test">test environment 3</a>
      </div>
      <div>
        <div id="train_43" style="display: flex; justify-content: space-between; padding: 16px;">
          <div>Training environment <span style="background: ${
            highlights.yellow
          }">1</span></div>
          <div>${train_43.length} images</div>
        </div>
        </div>
        <div>
          ${train_43
            .slice(0, 10)
            .map((o, i) => {
              return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
                highlights.yellow
              }">1</span>-${o.local_index
                .toString()
                .padStart(3, '0')}</div><img src="all_images/all_${
                o.index
              }.jpg" /></div>`
            })
            .join('')}
        </div>
        <div>
          <div style="padding-left: 16px; padding-right: 16px;">
            <button>Load all ${train_43.length} images</button>
          </div>
          <div></div>
          <div style="padding-left: 16px; padding-right: 16px;"><hr /></div>
        </div>
 
      </div>
      <div>
      <div id="train_46">
      <div style="padding: 16px; padding-bottom: 0;">
        Jump to: <a href="#train_43">training environment 1</a>
<a href="#train_46">training environment 2</a>
<a href="#test">test environment 3</a>
      </div>
        <div style="display: flex; justify-content: space-between; padding: 16px;">
          <div>Training environment <span style="background: ${
            highlights.orange
          }">2</span></div>
          <div>${train_46.length} images</div>
        </div>
        </div>
        <div>
          ${train_46
            .slice(0, 10)
            .map((o, i) => {
              return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
                highlights.orange
              }">2</span>-${o.local_index
                .toString()
                .padStart(3, '0')}</div><img src="all_images/all_${
                o.index
              }.jpg" /></div>`
            })
            .join('')}
        </div>
        <div>
          <div style="padding-left: 16px; padding-right: 16px;">
            <button>Load all ${train_46.length} images</button>
          </div>
          <div></div>
          <div style="padding-left: 16px; padding-right: 16px;"><hr /></div>
        </div>
      </div>
      <div>
      <div  id="test">
        <div style="padding: 16px; padding-bottom: 0;">
          Jump to: <a href="#train_43">training environment 1</a>
<a href="#train_46">training environment 2</a>
<a href="#test">test environment 3</a>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 16px;">
          <div>Testing environment <span style="background: ${
            highlights.brown
          }">3</span></div>
          <div>${test.length} images</div>
        </div>
        </div>
        <div>
          ${test
            .slice(0, 10)
            .map((o, i) => {
              return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
                highlights.brown
              }">3</span>-${o.local_index
                .toString()
                .padStart(3, '0')}</div><img src="all_images/all_${
                o.index
              }.jpg" /></div>`
            })
            .join('')}
        </div>
        <div>
          <div style="padding-left: 16px; padding-right: 16px;">
            <button>Load all ${test.length} images</button>
          </div>
          <div></div>
          <div style="padding-left: 16px; padding-right: 16px;"><hr /></div>
        </div>
 
      </div>
    </div>
    <script>
      let next_image_html =[]

     next_image_html.push('${train_43
       .slice(10)
       .map((o, i) => {
         return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
           highlights.yellow
         }">1</span>-${o.local_index
           .toString()
           .padStart(3, '0')}</div><img src="all_images/all_${
           o.index
         }.jpg" /></div>`
       })
       .join('')}')
 
     next_image_html.push('${train_46
       .slice(10)
       .map((o, i) => {
         return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
           highlights.orange
         }">2</span>-${o.local_index
           .toString()
           .padStart(3, '0')}</div><img src="all_images/all_${
           o.index
         }.jpg" /></div>`
       })
       .join('')}')
      
     next_image_html.push('${test
       .slice(10)
       .map((o, i) => {
         return `<div style="position: relative;"><div style="position: absolute; background: white; left: 16px; bottom: 16px;"><span style="background: ${
           highlights.brown
         }">3</span>-${o.local_index
           .toString()
           .padStart(3, '0')}</div><img src="all_images/all_${
           o.index
         }.jpg" /></div>`
       })
       .join('')}')

      let buttons = document.querySelectorAll("button")
      for (let i =0; i < buttons.length; i++) {
        let button = buttons[i]
        button.addEventListener("click", function() {
          button.parentNode.style.display = "none"
          let parent = button.parentNode.parentNode
          let holder = parent.querySelectorAll('div')[1]
          holder.innerHTML = next_image_html[i]
        })
      }
    </script>
  </body>
</html>`

fs.writeFileSync('all.html', html)
