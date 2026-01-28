import React from 'react';

export class Register {
    constructor(name, type, bit, writable, description) {
        this.name = name;
        this.type = type;
        this.bit = bit;
        this.writable = writable;
        this.description = description;
    }
}

export const model = [
    new Register('var1', 'uint8', 1, false, 'Описание'),
    new Register('var2', 'uint8', 2, false, 'Описание'),
    new Register('var3', 'uint8', 3, false, 'Описание'),
    new Register('var4', 'uint8', 2, false, 'Описание'),
    new Register('var5', 'uint8', 3, false, 'Описание'),
    new Register('var6', 'uint8', 5, false, 'Описание'),
    new Register('var7', 'uint8', 1, false, 'Описание'),
    new Register('var8', 'uint8', 4, false, 'Описание'),
    new Register('var9', 'uint8', 2, false, 'Описание'),
    new Register('var10', 'uint8', 2, false, 'Описание'),
];

// useStateProperty и Register БЕЗ ИЗМЕНЕНИЙ
export function useStateProperty(initialValue, debugText = '') {
    const [state, setState] = React.useState(initialValue);
    const setter = (value) => {
        if (debugText != '') {
            console.info(debugText, value);
        }
        setState(value);
    };
    return {
        get: state,
        set: setter,
        setPartial: (partial) => {
            setter({ ...state, ...partial });
        },
        setInitial: () => setter(initialValue),
    };
}

export function isMobile() {
    const isTouch = navigator.maxTouchPoints > 0;
    return /android|iphone|ipad|ipod|iemobile|opera mini/i.test(navigator.userAgent) || isTouch;
}
