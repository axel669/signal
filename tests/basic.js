import { $signal, $derive, $effect, batch, isSignal, $inspect, $log } from "../lib/main.js"

{
    const a = $signal(0)
    const b = $signal(1)
    const sum = $derive(() => a + b)

    $inspect("first", a, b, sum)
    // console.log(a.value, b.value, sum.value) // logs 0 1 1
    a.value = 2
    // a(2)
    // console.log(a.value, b.value, sum.value) // logs 2 1 3
    a.cleanup()
    b.value = 5
    // console.log(a.value, b.value, sum.value) // logs 2 5 7 because b still updates
}

{
    const a = $signal(0)
    const b = $signal(1)
    $inspect("second", a, b)
    // const logger = effect(() => console.log(a.value, b.value)) // logs 0 1

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

{
    const a = $signal(0)
    const b = $derive(a)
    const c = $derive(() => a * 2)

    console.log(a === b)
    console.log(a === $signal(a))

    // effect(() => console.log("wacky stuff", c|0))
    $inspect("wacky stuff", c)

    console.log(isSignal(a))
    console.log(isSignal(c))
    a.value = 4
    $log("snapshot", a, b, c)
    a.value = 4
}

{
    const a = $signal(0)
    // $meta(a).id = "test"
    console.log(a)
}
