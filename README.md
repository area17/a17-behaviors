# a17-behaviors

A framework for attaching JavaScript behaviors (interactions, events, manipulations) to DOM nodes.

```HTML
<button data-behavior="showAlert">Click me</button>
```

With a corresponding behavior:

```JavaScript
import { createBehavior } from '@area17/a17-behaviors';

const showAlert = createBehavior('showAlert',
    {
        alert(val) {
            window.alert('Hello world!');
        }
    },
    {
        init() {
            this.$node.addEventListener('click', this.alert);
        },
        destroy() {
            this.$node.removeEventListener('click', this.alert);
        }
    }
);

export default showAlert;
```

This would show an alert on click of the button. Note that `this.$node` is the DOM node with the `data-behavior` attribute.

For more detailed setup and explanation, [see the project wiki](https://github.com/area17/a17-behaviors/wiki).
