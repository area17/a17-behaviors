# a17-behaviors
JavaScript framework to attach JavaScript events and interactions to DOM Nodes

```terminal
$ npm install @area17/a17-behaviors
$ npm install webpack
$ npm install webpack-cli
$ npm install webpack-merge
```

## File/folder structure

```
/src
  application.js
  behaviors.js
  behaviors/
    myBehavior.js
    anotherBehavior.js
```

These paths you'll alter in your Webpack set up.

## Webpack config

The key parts are passing the `process.env` variables through, your exact set up will vary based on your project needs.

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

## Critical behaviors - `src/behaviors.js`

```JavaScript
export { default as myBehavior } from './behaviors/myBehavior';
```

Of course, in your project, you're likely to have many "critical" behaviors.

These are behaviors you 100% always want to load, likely for components at the top of your page, eg. menus, alerts and for mission critical items.

## Non-critical behaviors:

Webpack will pick up and process, but they will not be a part of your main compiled JavaScript. Instead, a dynamic `import` will attempt to load them as needed.

## CSS

Set up `:root` variables changing a `--breakpoint` value at each of your breakpoints, with the name of your breakpoint. If using A17's Tailwind plugins or A17's SCSS set up, this is likely done for you.

We *could* use `window.matchMedia` for this instead, but, it would mean sharing and comparing breakpoint information and its easier just to read it from a CSS variable.

```CSS
<style>
    :root {
      --breakpoint: xs;
    }
    @media screen and (min-width: 544px) {
      :root {
        --breakpoint: sm;
      }
    }
    @media screen and (min-width: 650px) {
      :root {
        --breakpoint: md;
      }
    }
    @media screen and (min-width: 990px) {
      :root {
        --breakpoint: lg;
      }
    }
    @media screen and (min-width: 1300px) {
      :root {
        --breakpoint: xl;
      }
    }
    @media screen and (min-width: 1520px) {
      :root {
        --breakpoint: xxl;
      }
    }
</style>
```

## `src/application.js`

```JavaScript
import manageBehaviors from '@area17/a17-behaviors';
import resized from '@area17/a17-helpers';
import * as Behaviors from './behaviors';

window.A17 = window.A17 || {};
window.A17.breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']; // tell this app what your breakpoint names are, in size order, manageBehaviors will read a CSS variable and compare for media scoped behaviors

document.addEventListener('DOMContentLoaded', () => {
    // expose manageBehaviors
    window.A17.behaviors = manageBehaviors;
    // init behaviors!
    window.A17.behaviors.init(Behaviors);
});
```

`manageBehaviors` has some options:

```JavaScript
  window.A17.behaviors.init(Behaviors, {
    dataAttr: 'behavior',
    lazyAttr: 'behavior-lazy',
    intersectionOptions: {
      rootMargin: '20%',
    }
  });
```

You can change which data attributes to track, the defaults being `data-behavior` and `data-behavior-lazy`. If you used:

```JavaScript
  window.A17.behaviors.init(Behaviors, {
    dataAttr: 'function',
    lazyAttr: 'function-lazy'
  });
```
Then you'd want to use `data-function` and `data-function-lazy` instead.

You can also change the `rootMargin` of the `IntersectionObserver`, which powers the lazy behavior loading.

`manageBehaviors` also fires some events that may come in useful to you (they're used inside of `manageBehaviors` and `createBehaviors`):

* a debounced resize event: `window.addEventListener('resized', () => {});`
* a media query changed event: `window.addEventListener('mediaQueryUpdated', () => {});`

Also, `window.A17.currentMediaQuery` will always be kept up-to-date with the current media query.

## Anatomy of a behavior

The basic structure of your behaviors are as follows:

```HTML
<div data-behavior="MyBehavior">
  ...
</div>
```

If the behavior module is not already loaded, then then an attempt to `import` the module will be made and then the behavior will have its `init` run.

```JavaScript
import createBehavior from '@area17/a17-behaviors';

const MyBehavior = createBehavior(
  'MyBehavior',
  {
    // behavior methods
  },
  {
    // lifecycle methods
    init() {
    },
    enabled() {
    },
    resized() {
    },
    mediaQueryUpdated() {
    },
    intersectionIn() {
    },
    intersectionOut() {
    },
    disabled() {
    },
    destroy() {
    },
  }
);

export default MyBehavior;
```

### Parameters

The first parameter passed is the name of the behavior.

The second parameter is an object that contains `behavior methods`.

The third parameter is an object that contains the behavior `lifecycle` methods:

* `init`
* `enabled` (optional)
* `resized` (optional)
* `mediaQueryUpdated` (optional)
* `disabled` (optional)
* `intersectionIn` (optional)
* `intersectionOut` (optional)
* `destroy`

### Lifecycle methods

[manageBehaviors](js-functions-manageBehaviors) in A17 Boilerplate will run the lifecycle method `init` when the node is in the DOM.

If there is a media query for running specified and the current media query qualifies the function to run, or if there is no media query for running set - then after `init` the `enabled` function runs. `enabled` is optional, if you don't need media query switching then you don't need to include this method.

There are optional helper methods, `resized` and `mediaQueryUpdated` which give you quick hooks to these global events. If you don't need them, don't include them.

`disabled` is the antithesis of `enabled`. If you set the media option then `enabled` runs if the current media query passes and `disabled` runs when it doesn't.

And `destroy` is the antithesis of `init` - this runs when the node is removed from the DOM. Any behavior will be automatically wiped on `destroy`.

`intersectionIn` and `intersectionOut` run when the element comes in and out of the viewport, with a background `IntersectionObserver`. Access to the `IntersectionObserver` options is via a named option:

```JavaScript
import createBehavior from '@area17/a17-behaviors';

const MyBehavior = createBehavior(
  'MyBehavior',
  {
    // behavior methods
  },
  {
    // lifecycle methods
    init() {
      this.options.intersectionOptions = {
        rootMargin: '20%',
      }
    }
  }
);
```

### Methods, variables and `this`

```HTML
<div class="mybehavior" data-mybehavior-limit="1312">
  <button data-mybehavior-btn>Click me</button>
  <ul>
    <li data-mybehavior-item>&nbsp;</li>
    <li data-mybehavior-item>&nbsp;</li>
    <li data-mybehavior-item>&nbsp;</li>
  </ul>
</div>
```

```JavaScript
import createBehavior from '@area17/a17-behaviors';

const MyBehavior = createBehavior(
  'MyBehavior',
  {
    handleBtnClick(e) {
      e.preventDefault();
      this.clicked = true;
      alert(this.options.limit);
      // `this.options` is automatically parsed as an object, based on what is declared in the HTML
      // { myoption: "true" } ... no type coercion FYI, so 'true' will be a string not a boolean!
    },
  },
  {
    init() {
      // this.$node - the DOM node this behavior is attached to
      this.clicked = false;
      this.$btn = this.getChild('btn'); // looks for `[data-mybehavior-btn]` element
      this.$btn.addEventListener('click', this.handleBtnClick);
    },
    destroy() {
      // remove any listeners, intervals etc.
      this.$btn.removeEventListener('click', this.handleBtnClick);
      // this.btn is destroyed automatically
    },
  }
);

export default MyBehavior;
```

Methods and variables you can use with `lifecycle` functions and `behavior methods` are:

`this` - is auto-binded to the behavior instance, so for this example `this` would be `MyBehavior`

`this.$node` - the node that the data-behavior is attached to, the container node

`this.options` - an object of behavior options read from the container node. With the example above it would be `{ limit: "1312" }`. Note there is no type coercion, everything is passed as a string and so you may need to convert numbers, boolean and JSON to your desired format. Options are scoped to the behavior name, so in this example `data-mybehavior-limit="1312"`

`this.getChild()` - looks inside the container to find a child node. Child nodes have a data attribute, scoped to the behavior name and so `this.getChild('btn')` will look for a node with a data attribute of `data-mybehavior-btn` (essentially it performs `this.node.querySelector(['data-mybehavior-btn'])`)

`this.getChildren()` - looks inside the container to find a collection of child nodes. Child nodes have a data attribute, scoped to the behavior name and so `this.getChildren('item')` will look for a nodes with a data attribute of `data-mybehavior-item` (essentially it performs `this.node.querySelectorAll(['data-mybehavior-item'])`)

### Sub Behaviors


```HTML
<div class="MyBehavior" data-mybehavior-limit="1312" data-sub1-foo="bar">
  <button data-mybehavior-btn>Click me</button>
  <ul data-sub1-list>
    <li data-mybehavior-item>&nbsp;</li>
    <li data-mybehavior-item>&nbsp;</li>
    <li data-mybehavior-item>&nbsp;</li>
  </ul>
</div>
```

```JavaScript
import createBehavior from '@area17/a17-behaviors';
import sub1 from './sub1.js';
import sub3 from './sub3.js';

const MyBehavior = createBehavior(
  'MyBehavior',
  {
    // Behavior methods
  },
  {
    init() {
      this.$btn = this.getChild('btn'); // looks for `[data-mybehavior-btn]` element

      // sub behaviors
      this.addSubBehavior(sub1);
      this.addSubBehavior('sub2');
      this.addSubBehavior(sub3, this.$btn, { options: {
          parentNode: this.$node
      }});
    },
    destroy() {
      // remove any listeners, intervals etc.
      this.$btn.removeEventListener('click', this.handleBtnClick);
      // this.btn is destroyed automatically
      // sub behaviors are destroyed automatically
    },
  }
);

export default MyBehavior;
```

A behavior can also launch a sub behavior if required. Adding a sub behavior tells the main `manageBehaviors` instance to initialise the behavior and it is then tracked as any other, which means any behavior named options and behavior named children in and on the parent node, will be accessible to the sub behaviors.

`this.addSubBehavior(sub1);` - runs the imported `sub1` behavior `init` method. It will be able to see the `foo` option set on the parent node, and find the `<ul data-sub1-list>` with `this.getChild('list')`.

`this.addSubBehavior('sub2');` - if a behavior with name `sub2` is already imported into the application, either by another behavior, another JS file or in the application.js then it will have its `init` method run. If not, then a dynamic `import` will attempt to load and `init` the behavior.

`this.addSubBehavior(sub3);` - runs the imported `sub3` behavior `init` method, this time passes in which node to attach the behavior to (default is same as parent) and also passes through some options.

### Lazy Behaviors

Lazy behavior, `init` is only run if element comes close to being in view (intersection observer). If the behavior module is not already loaded, then then an attempt to `import` the module will be made and then the behavior will have its `init` run.

```HTML
<div data-behavior-lazy="MyBehavior">
  ...
</div>
```

With `options`:

```HTML
<div data-behavior-lazy="MyBehavior" data-mybehavior-foo="bar">
  ...
</div>
```

### Media Query scoping

To alter a behavior at a breakpoint, in this example large and larger breakpoints, `lg+` you can scope a behavior to a media query:

```HTML
<div class="MyBehavior" data-mybehavior-media="lg+">
  ...
</div>
```

```JavaScript
import createBehavior from '@area17/a17-behaviors';

const MyBehavior = createBehavior(
  'MyBehavior',
  {
    // behavior methods
  },
  {
    init() {
      this.foo = '-';
    },
    enabled() {
      this.foo = 'large';
    },
    disabled() {
      this.foo = 'small';
    },
    destroy() {
      // this.foo is destroyed automatically
    },
  }
);

export default MyBehavior;
```

In this example, initially `this.foo` will be `-`. If the media query is smaller than `lg` then `this.foo` will be `small` and when the media query is large and above, then `this.foo` will be `large`. If the window is resized, these values will automatically update.


### Lazy Behavior Media Query scoping

```HTML
<div data-behavior-lazy="myBehavior" data-mybehavior-lazymedia="lg+" data-mybehavior-media="lg+">
  ...
</div>
```

The `myBehavior` behavior will now only run `init` (or `import` and `init`) *if* the current media query is `lg+` and the element gets close to being in the viewport. If there is a resize event to a smaller media query, the behavior **is not** destroyed, it will remain running and so you will likely want to handle this situation with a media query scope (see above).
