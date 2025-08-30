export type Signal = {
    id: any
    set value(next: any)
    get value(): any
    get peek(): any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}

export type EffectSignal = {
    id: any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}

export type InternalSignal = {
    subs: Set<InternalSignal>
    sources: Set<InternalSignal>
    id: any
    notify: () => void
    link: (source: InternalSignal) => void
    unlink: (sub: InternalSignal) => void
    state: symbol
}

export type DerivedSignal = {
    id: any
    get value(): any
    get peek(): any
    readonly readable: boolean
    readonly writable: boolean
    cleanup: () => void
}

export type SignalPass =
    ((arg: Signal) => Signal)
    | ((arg: EffectSignal) => EffectSignal)
    | ((arg: DerivedSignal) => DerivedSignal)
