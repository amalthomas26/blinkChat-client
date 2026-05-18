import {useEffect,useState} from "react";

export function useDebounce<T>(value:T,delay=300):T{

const [debounceValue,setDebounceValue] = useState(value);

useEffect(()=>{
    const timeoutId = window.setTimeout(()=>{
        setDebounceValue(value);
    },delay);

    return ()=>{
        window.clearTimeout(timeoutId);
    };
},[delay,value]);

return debounceValue

}