/**
I saw this bun on a reddit post and i thought it could chill in this code too

(\(\                   \|/
( -.-)                 -o-
o_(")(")               /|\

@typedef {{
    id: any
    set value(next: any): any
    get value: any
    get peek: any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}} Signal

@typedef {{
    id: any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}} EffectSignal

@typedef {{
    id: any
    get value: any
    get peek: any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}} DerivedSignal

@typedef {{
    subs: Set<InternalSignal>
    sources: Set<InternalSignal>
    id: any
    notify: () => void
    link: (source: InternalSignal) => void
    unlink: (sub: InternalSignal) => void
    state: State
}} InternalSignal
*/

/** @type {InternalSignal} */
let currentParent = null
let inBatch = false

const State = {
    clean: Symbol("clean"),
    changed: Symbol("changed"),
    dirty: Symbol("dirty"),
    disposed: Symbol("disposed"),
}

/** @type {Set<InternalSignal>} */
const notified = new Set()
/** @type {InternalSignal[]} */
let changed = []
/**
@ignore
@param {InternalSignal} signal
@return {void}
*/
const notify = (signal) => {
    const subs = signal.subs
    signal.dirty = true
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
/**
@ignore
@return {void}
*/
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
/**
@ignore
@param {InternalSignal} self
@return {void}
*/
const register = (self) => {
    if (currentParent === null || self.state === State.disposed) {
        return
    }
    self.subs.add(currentParent)
    currentParent.link(self)
}
/**
@ignore
@param {InternalSignal} self
@return {void}
*/
const cleanSources = (self) => {
    for (const source of self.sources) {
        source.unlink(self)
    }
    self.sources.clear()
}
const unchanged = Symbol("unchanged")
/**
@ignore
@param {Set<InternalSignal>} sources
@return {void}
*/
const sourcesChanged = (sources) => {
    for (const source of sources) {
        if (source.state === State.changed) {
            return true
        }
    }
    return false
}
/**
@ignore
@param {InternalSignal} self
@param {() => any} func
@param {boolean} initial
@return {void}
*/
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

/**
@param {any} initialValue
@return {Signal}
*/
export const signal = (initialValue) => {
    let value = initialValue
    /** @type {InternalSignal} */
    const self = {
        subs: new Set(),
        sources: new Set(),
        id: null,
        notify() { },
        link() { },
        unlink: (sub) => self.subs.delete(sub),
        state: State.clean,
    }
    return {
        get id() { return self.id },
        set id(next) { return self.id = next },
        get value() {
            register(self)
            return value
        },
        get peek() { return value },
        set value(next) {
            if (self.state === State.disposed) {
                return value
            }
            value = next
            self.state = State.changed
            notify(self)
            update()
            return next
        },
        cleanup() {
            self.state = State.disposed
        },
        get readable() { return true },
        get writable() { return true },
    }
}

/**
@param {() => any} f
@return {EffectSignal}
*/
export const effect = (f) => {
    /** @type {InternalSignal} */
    const self = {
        subs: new Set(),
        sources: new Set(),
        id: null,
        notify() {
            rerun(self, f)
        },
        link(source) {
            self.sources.add(source)
        },
        unlink() { },
        state: State.dirty,
        get readable() { return false },
        get writable() { return false },
    }
    rerun(self, f, true)
    self.state = State.clean
    return {
        get id() { return self.id },
        set id(next) { return self.id = next },
        cleanup() {
            cleanSources(self.sources)
            self.state = State.disposed
        },
    }
}
/**
@param {() => any} f
@return {DerivedSignal}
*/
export const derive = (f) => {
    let value = null
    /** @type {InternalSignal} */
    const self = {
        subs: new Set(),
        sources: new Set(),
        id: null,
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
    return {
        get id() { return self.id },
        set id(next) { return self.id = next },
        cleanup() {
            cleanSources(self.sources)
            self.state = State.disposed
        },
        get value() {
            register(self)
            return value
        },
        get peek() { return value },
        get readable() { return true },
        get writable() { return false },
    }
}

/**
@param {() => void} f
@return {void}
*/
export const batch = (f) => {
    inBatch = true
    f()
    inBatch = false
    update()
}
