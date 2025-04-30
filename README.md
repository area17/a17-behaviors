![Alt text](logo.png?raw=true "A17 Behaviors")

A17 Behaviors is a lightweight JavaScript framework designed to seamlessly attach behaviors - such as interactions, event listeners, and manipulations - to DOM nodes using declarative `data-behavior` attributes. This approach promotes modularity, code clarity, and maintainability in your front-end development.

Clearly showing an element's associated behaviors enhances discoverability. Instead of searching through lengthy JavaScript files or guessing which scripts are attached to which DOM nodes, with clearly delcared behaviors you can quickly identify the relevant code and streamline your development process.

[Wiki](https://github.com/area17/a17-behaviors/wiki)

## Key Features

- Declarative Binding: Attach behaviors directly in HTML using `data-behavior` attributes.
- Modular Architecture: Encourages separation of concerns by isolating behavior logic.
- Dynamic Behavior Management: Automatically initializes and destroys behaviors as DOM nodes are added or removed.
- Extensibility: Easily extend existing behaviors with additional methods.

## Installation

Install via npm:

```shell
npm install @area17/a17-behaviors
```

## Usage Example

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

And managed from a central `application.js`:

```JavaScript
import { manageBehaviors } from '@area17/a17-behaviors';
import * as Behaviors from './behaviors/index';

document.addEventListener('DOMContentLoaded', () => {
    manageBehaviors.init(Behaviors, {
        breakpoints: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
    });
});
```

In this example, clicking the button will trigger an alert saying "Hello world!".

## How it works

- `createBehavior` - Defines a new behavior
- `manageBehaviors` - Observes the DOM and initializes/destroys behaviors as needed
- `extendBehavior` - Extends an existing behavior with new methods

## Wiki

See the [Wiki](https://github.com/area17/a17-behaviors/wiki) for:

- Full API reference
- Advanced usage (dynamic content, lazy-loading behaviors)
- FAQ and troubleshooting
- Best practices

## License

MIT

## Contribution

### Code of Conduct

AREA 17 is dedicated to building a welcoming, diverse, safe community. We expect everyone participating in the AREA 17 community to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it. Please follow it.

### Bug reports and features submission

To submit an issue or request a feature, please do so on [Github](https://github.com/area17/a17-behaviors/issues).

If you file a bug report, your issue should contain a title and a clear description of the issue. You should also include as much relevant information as possible and a code sample that demonstrates the issue. The goal of a bug report is to make it easy for yourself - and others - to replicate the bug and develop a fix.

Remember, bug reports are created in the hope that others with the same problem will be able to collaborate with you on solving it. Do not expect that the bug report will automatically see any activity or that others will jump to fix it. Creating a bug report serves to help yourself and others start on the path of fixing the problem.

## Versioning scheme

Our A17 Behaviors follows [Semantic Versioning](https://semver.org/). Major releases are released only when breaking changes are necessary, while minor and patch releases may be released as often as every week. Minor and patch releases should never contain breaking changes.

When referencing A17 Behaviors from your application, you should always use a version constraint such as `^1.0`, since major releases of A17 Behaviors will include breaking changes.

