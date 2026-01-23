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
    new Register('var1', 'uint8', null, false, 'Описание'),
    new Register('var2', 'uint8', null, false, 'Описание'),
    new Register('var3', 'uint8', null, false, 'Описание'),
    new Register('var4', 'uint8', null, false, 'Описание'),
    new Register('var5', 'uint8', null, false, 'Описание'),
    new Register('var6', 'uint8', null, false, 'Описание'),
    new Register('var7', 'uint8', null, false, 'Описание'),
    new Register('var8', 'uint8', null, false, 'Описание'),
    new Register('var9', 'uint8', null, false, 'Описание'),
    new Register('var10', 'uint8', null, false, 'Описание'),
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

/*
todo
реализовать мобильные обработчики
setDragImage сделать НЕ прозрачным РЕШЕНИЕ: использовать setDragImage c пустышкой внутри
вместо бордера сделать indicator (если будет большое желание)

- нет переносимости решения в самостоятельный компонент
- с момента setDragImage нельзя делать ререндеринг страницы
- enter и leave не синхронизированы. + leave срабатывает когда не следует
- логика переусложнена, причем нейронкой
- если на мобилке в момент начала драга держать палец слишком долго (после события touch start, но не вызывая touch move), то сработает событие drag_start. И все стили драг-дропа сломаются
*/
