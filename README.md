# a17-behaviors
JavaScript framework to attach JavaScript events and interactions to DOM Nodes

```terminal
$ npm install @area17/a17-behaviors
$ npm install webpack
$ npm install webpack-cli
$ npm install webpack-merge
```

## Webpack config

### webpack.common.js

```JavaScript
const webpack = require('webpack');
const path = require('path');

const ASSET_PATH = process.env.ASSET_PATH || '/';
const BEHAVIORS_PATH = '/src/behaviors/';
const BEHAVIORS_EXTENSION = 'js';

module.exports = {
  entry: {
    application: './src/application.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public'),
    clean: true,
    publicPath: ASSET_PATH
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.ASSET_PATH': JSON.stringify(ASSET_PATH),
      'process.env.BEHAVIORS_PATH': JSON.stringify(BEHAVIORS_PATH),
      'process.env.BEHAVIORS_EXTENSION': JSON.stringify(BEHAVIORS_EXTENSION)
    }),
  ]
};
```

### webpack.dev.js

```JavaScript
const webpack = require('webpack');
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.MODE': JSON.stringify('development'),
    }),
  ]
});
```

### webpack.prod.js

```JavaScript
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.MODE': JSON.stringify('production'),
    }),
  ],
});
```

## application.js

```JavaScript
import manageBehaviors from '@area17/a17-behaviors';
import resized from '@area17/a17-helpers';
import * as Behaviors from './behaviors';

window.A17 = window.A17 || {};
window.A17.breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

document.addEventListener('DOMContentLoaded', () => {
    // on resize, check
    resized();

    // expose manageBehaviors
    window.A17.behaviors = manageBehaviors;
    // init behaviors!
    window.A17.behaviors.init(Behaviors);
});
```

## A behavior JS:

```JavaScript
import createBehavior from '@area17/a17-behaviors';

const yourBehavior = createBehavior('yourBehavior',
    {
        setBar(val) {
            this.bar = val;
        },
        alert(val) {
            console.log('output from yourBehavior alert method:', val || this.foo);
        }
    },
    {
        init() {
            console.log('#### yourBehavior added', this.$node);
            this.foo = 'bar';
            this.setBar('baz');
        },
        destroy() {
            console.log('#### destroy yourBehavior #');
        }
    }
);

export default yourBehavior;
```


## Critical Behaviors:

```JavaScript
export { default as yourBehavior } from './behaviors/yourBehavior';
```

## Non-critical/lazyloaded Behaviors:

Make Behaviors, place them in the folder as defined by `BEHAVIORS_PATH`, Webpack will pick up and process.

## HTML:

Standard behavior, `manageBehaviors` will attempt to `init` on DOM ready, including importing behaviors that aren't included in the main `Behaviors` module.

```HTML
<div data-behavior="yourBehavior">...</div>
```

With optional `options` and optional media query from to `enable`/`disable` behavior:

```HTML
<div data-behavior="yourBehavior" data-yourbehavior-foo="bar" data-yourbehavior-media="md+">...</div>
```

Lazy behavior, `init` is only run if element comes close to being in view (intersection observer)

```HTML
<div data-behavior-lazy="lazyBehavior">...</div>
```

With optional `options` and optional media query from to `enable`/`disable` behavior:

```HTML
<div data-behavior-lazy="lazyBehavior" data-lazybehavior-foo="bar" data-lazybehavior-lazymedia="lg+">...</div>
```

You can mix, match, have multiples, with their own options and medias:

```HTML
<div data-behavior="yourBehavior anotherBehavior" data-yourbehavior-foo="bar" data-yourbehavior-media="md+" data-behavior-lazy="lazyBehavior anotherLazyBehavior" data-lazybehavior-foo="bar" data-lazybehavior-lazymedia="lg+">...</div>
```
