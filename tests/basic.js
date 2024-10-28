import { signal, derive, effect, batch } from "../lib/main.js"

{
    const a = signal(0)
    const b = signal(1)
    const sum = derive(() => a.value + b.value)

    console.log(a.value, b.value, sum.value) // logs 0 1 1
    a.value = 2
    console.log(a.value, b.value, sum.value) // logs 2 1 3
    a.cleanup()
    b.value = 5
    console.log(a.value, b.value, sum.value) // logs 2 5 7 because b still updates
}

{
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
}
