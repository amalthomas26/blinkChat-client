import { useState, useEffect, useRef } from "react";
import { useCallPhase } from "../store/call.selectors";

//Starts when phase = "connected", pauses on "reconnecting", stops on "ended"/"failed"

export function useCallTimer(): number {
  const phase = useCallPhase();

  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "connected") {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    if (phase === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase]);

  return seconds;
}

export function formatCallDuration(totalSeconds:number):string {
    const hours = Math.floor(totalSeconds/3600);
    const minutes = Math.floor((totalSeconds % 3600)/60);
    const secs = totalSeconds % 60;

    const mm = String(minutes).padStart(2,"0");
    const ss = String(secs).padStart(2,"0");

    if(hours>0){
       return `${String(hours).padStart(2, "0")}:${mm}:${ss}`; 
    }
    return `${mm}:${ss}`;
}

