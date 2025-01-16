# Signal
A simple, small (< 1kb minified + gzip) library for creating and using signals.

## Installation
```bash
npm install @axel669/signal
```

```js
import * as signals from "https://esm.sh/@axel669/signal@0.1.0"
import { $signal, $derive, $effect, ... } as signals from "https://esm.sh/@axel669/signal@0.1.0"
```

## Todo
- ~~maybe don't trigger updates if strict equality is true~~
- is async signal processing useful?

## Usage

### Value Signal
The simplest form of signal. It holds a value that can be read or changed and
does not depend on other signals directly.

```js
const counter = signal(0)

console.log(counter.value) // logs 0
counter.value += 1
console.log(counter.value) // logs 1
```

### Derived Signal
A signal that takes a function as its argument and calculates a value based on
the value of other signals. The function reruns every time one of the signals
it relies on changes value. Async functions do not work as the signal
recalculation is done synchronously for all signals after updates happen.

```js
const counter = signal(0)
const mod3 = derive(() => counter.value % 3)

console.log(counter.value, mod3.value) // logs 0 0
counter.value = 5
console.log(counter.value, mod3.value) // logs 5 2
```

### Effect Signal
A signal that takes a function and runs some code based on the value of the
signals it relies on. Does not have a value output of its own, so it can never
be a dependency of another signal, which means it can also handle async
functions, since there is no output to wait for within the signal
recalculations.

```js
const counter = signal(0)
const logger = effect(() => console.log(counter.value)) // logs 0 at creation

counter.value += 1 // makes the effect signal log 1
```

### Batching
Sometimes it is useful to change more then one value signal before letting
their subscribers update, this cam be done by wrapping the changes in a function
that is passed to batch.

```js
const a = signal(0)
const b = signal(1)
const logger = effect(() => console.log(a.value, b.value)) // logs 0 1

a.value = 2 // makes the effect signal log 2 1
b.value = 5 // makes the effect signal log 2 5
// only triggers one log of 3 6
batch(
    () => {
        a.value = 3
        b.value = 6
    }
)
```

### Disposing
All signals have a `.cleanup` function that will disable the effect from
sending or receiving updates, and will remove it from all dependency trees. Any
signal that has been disposed can still have its value read (if it had one),
but the value can no longer be updated, and reading the value will no longer
add it to dependency trees.

```js
const a = signal(0)
const b = signal(1)
const sum = derive(() => a.value + b.value)

console.log(a.value, b.value, sum.value) // logs 0 1 1
a.value = 2
console.log(a.value, b.value, sum.value) // logs 2 1 3
a.cleanup()
b.value = 5
console.log(a.value, b.value, sum.value) // logs 2 5 7 because b still updates
```

### Signal IDs
All signals have a `.id` that can be assigned to, all default to null. This is
just a helpful debug tool, it has no functional purpose for the way signals
communicate with each other.
