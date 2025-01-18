import { $signal, $derive, $effect, batch, isSignal, $inspect, $log, $cleanup, $$debug } from "../lib/main.js"

{
    const a = $signal(0)
    const b = $signal(1)
    const sum = $derive(() => a + b)

    console.log(a)
    console.log(b)
    console.log(sum)

    $inspect("first", a, b, sum)
    // logs 0 1 1
    a(2)
    // logs 2 1 3
    $cleanup(a)
    a(5)
    b(5)
    // logs 2 5 7 because b still updates
}

{
    const a = $signal(0)
    const b = $signal(1)
    $inspect("second", a, b)
    // const logger = effect(() => console.log(a.value, b.value)) // logs 0 1

    a(2) // makes the effect signal log 2 1
    b(5) // makes the effect signal log 2 5
    // only triggers one log of 3 6
    batch(
        () => {
            a(3)
            b(6)
        }
    )
}

{
    const a = $signal(0)
    const b = $derive(a)
    const c = $derive(() => a * 2)

    console.log(a === b)
    console.log(a === $signal(a))

    $inspect("wacky stuff", c)

    console.log(isSignal(a))
    console.log(isSignal(c))
    a(4)
    $log("snapshot", a, b, c)
    a(4)
}

{
    const a = $signal({ nest: { ed: "hi" } })
    // $meta(a).id = "test"
    $$debug(a)

    const e = $effect(() => console.log("eff", a.nest.ed))
    a.nest = { ed: "wat" }
}
