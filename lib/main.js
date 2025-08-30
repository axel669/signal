/** @import * as type from "./types.ts" */
// @ts-check

/**
I saw this bun on a reddit post and i thought it could chill in this code too

(\(\                   \|/
( -.-)                 -o-
o_(")(")               /|\
*/

const internal = {
    key: Symbol("signal key"),
    peek: Symbol("signal peek"),
    value: Symbol("signal value"),
    cleanup: Symbol("signal cleanup"),
    notify: Symbol("signal notify"),
    debug: Symbol("signal debug"),
}

/** @type {type.InternalSignal | null} */
let currentParent = null
let inBatch = false

const State = {
    clean: Symbol("clean"),
    changed: Symbol("changed"),
    dirty: Symbol("dirty"),
    disposed: Symbol("disposed"),
}

/** @type {Set<type.InternalSignal>} */
const notified = new Set()
/** @type {type.InternalSignal[]} */
let changed = []

/** @type {(signal: type.InternalSignal) => void} */
const notify = (signal) => {
    const subs = signal.subs
    for (const sub of subs) {
        sub.state = State.dirty
        for (const source of sub.sources) {
            notified.add(source)
        }
        notified.add(sub)
    }
    for (const sub of subs) {
        notify(sub)
    }
}

/** @type {() => void} */
const update = () => {
    if (inBatch === true) {
        return
    }
    for (const signal of notified) {
        signal.notify()
        if (signal.state === State.changed) {
            changed.push(signal)
        }
    }
    for (const signal of changed) {
        signal.state = State.clean
    }
    notified.clear()
    changed = []
}

/** @type {(self: type.InternalSignal) => void} */
const register = (self) => {
    if (currentParent === null || self.state === State.disposed) {
        return
    }
    self.subs.add(currentParent)
    currentParent.link(self)
}

/** @type {(self: type.InternalSignal) => void} */
const cleanSources = (self) => {
    for (const source of self.sources) {
        source.unlink(self)
    }
    self.sources.clear()
}
const unchanged = Symbol("unchanged")

/** @type {(sources: Set<type.InternalSignal>) => boolean} */
const sourcesChanged = (sources) => {
    for (const source of sources) {
        if (source.state === State.changed) {
            return true
        }
    }
    return false
}

/** @type {(self: type.InternalSignal, func: Function, initial?: boolean) => any} */
const rerun = (self, func, initial = false) => {
    if ([State.clean, State.changed].includes(self.state) == true) {
        return unchanged
    }
    if (initial === false && sourcesChanged(self.sources) === false) {
        return unchanged
    }
    self.state = State.changed
    const current = currentParent
    currentParent = self

    cleanSources(self)
    const newValue = func()
    currentParent = current

    return newValue
}

const ValueProxy = (sig, base) => {
    if (base?.constructor !== Object && Array.isArray(base) === false) {
        return base
    }
    const cache = {}
    return new Proxy(
        base,
        {
            get(_, name) {
                cache[name] = cache[name] || ValueProxy(sig, base[name])
                sig[internal.value]
                return cache[name]
            },
            set(_, name, value) {
                base[name] = value
                cache[name] = ValueProxy(sig, base[name])
                sig[internal.notify]()
                return cache[name]
            },
        }
    )
}
const SigProxy = (sig, writable) => {
    const value = ValueProxy(sig, $peek(sig))
    return new Proxy(
        () => {},
        {
            apply(_, _0, args) {
                if (args.length === 0) {
                    return sig[internal.value]
                }
                if (writable === false) {
                    throw new Error("Signal is not writable")
                }
                sig[internal.value] = args[0]
                return args[0]
            },
            get(_, name) {
                if (sig.hasOwnProperty(name) === true) {
                    return sig[name]
                }
                return value[name]
            },
            set(_, name, next) {
                return value[name] = next
            }
        }
    )
}

/** @type {type.SignalPass | ((initialValue: any) => type.Signal)} */
export const $signal = (initialValue) => {
    if (isSignal(initialValue) === true) {
        return initialValue
    }
    let value = initialValue
    /** @type {type.InternalSignal} */
    const self = {
        id: Math.random().toString(16),
        subs: new Set(),
        sources: new Set(),
        notify() { },
        link() { },
        unlink: (sub) => self.subs.delete(sub),
        state: State.clean,
    }

    const sig = {
        get [internal.value]() {
            register(self)
            return value
        },
        get [internal.peek]() { return value },
        set [internal.value](next) {
            if (value === next) {
                return
            }
            if (self.state === State.disposed) {
                return
            }
            value = next
            sig[internal.notify]()
            return
        },
        [internal.notify]() {
            self.state = State.changed
            notify(self)
            update()
        },
        [internal.cleanup]() {
            self.state = State.disposed
        },
        [internal.key]: true,
        [internal.debug]() {
            console.log(self)
        },
        [Symbol.toPrimitive](hint) {
            if (hint === "string") {
                return this[internal.value]?.toString?.()
            }
            return this[internal.value]
        }
    }
    // @ts-ignore
    return SigProxy(sig, true)
}

/** @type {(f: Function) => type.EffectSignal} */
export const $effect = (f) => {
    /** @type {type.InternalSignal} */
    const self = {
        id: Math.random().toString(16),
        subs: new Set(),
        sources: new Set(),
        notify() {
            rerun(self, f)
        },
        link(source) {
            self.sources.add(source)
        },
        unlink() { },
        state: State.dirty,
    }
    rerun(self, f, true)
    self.state = State.clean
    // @ts-ignore
    return {
        [internal.key]: true,
        [internal.cleanup]() {
            cleanSources(self)
            self.state = State.disposed
        },
        [internal.debug]() {
            console.log(self)
        }
    }
}

/** @type {type.SignalPass | ((f: Function) => type.DerivedSignal)} */
export const $derive = (f) => {
    if (isSignal(f) === true) {
        return f
    }
    let value = null
    /** @type {type.InternalSignal} */
    const self = {
        id: Math.random().toString(16),
        subs: new Set(),
        sources: new Set(),
        notify() {
            const next = rerun(self, f)
            if (next === unchanged) {
                return
            }
            value = next
        },
        unlink: (sub) => self.subs.delete(sub),
        link(source) {
            self.sources.add(source)
        },
        state: State.dirty,
    }
    value = rerun(self, f, true)
    self.state = State.clean
    const sig = {
        [internal.cleanup]() {
            cleanSources(self)
            self.state = State.disposed
        },
        get [internal.value]() {
            register(self)
            return value
        },
        [internal.notify]() {
            self.notify()
        },
        get [internal.peek]() { return value },
        [internal.key]: true,
        [internal.debug]() {
            console.log(self)
        },
        [Symbol.toPrimitive](hint) {
            if (hint === "string") {
                return this[internal.value]?.toString?.()
            }
            return this[internal.value]
        }
    }
    // @ts-ignore
    return SigProxy(sig, false)
}

/** @type {(item: any) => boolean} */
export const isSignal = (item) => {
    if (item === null || item === undefined) {
        return false
    }
    return item[internal.key] === true
}
export const $peek = (signal) => signal[internal.peek]
export const $cleanup = (signal) => signal[internal.cleanup]()

export const $inspect = (...items) => {
    $effect(
        () => console.log(
            ...items.map(item => isSignal(item) ? item() : item)
        )
    )
}
export const $log = (...items) => console.log(
    ...items.map(item => isSignal(item) ? item() : item)
)
export const $$debug = (signal) => signal[internal.debug]()

/** @type {(f: Function) => void} */
export const batch = (f) => {
    inBatch = true
    f()
    inBatch = false
    update()
}
