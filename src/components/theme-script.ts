import { themeStorageKey } from "@/domain/theme";

export const themeBootScript = `(function(){try{var c=localStorage.getItem(${JSON.stringify(themeStorageKey)});var d=c==="dark"||(c!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
