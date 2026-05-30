import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStore = create()(persist(() => ({ count: 0 }), { name: "test" }));

console.log(useStore.persist);
console.log(useStore.persist?.hasHydrated);
console.log(useStore.persist?.onFinishHydration);
