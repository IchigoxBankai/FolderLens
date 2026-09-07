let l=!1,g=null,a=null,r=null,i=null,f=!1,m=0,h=0;chrome.runtime.onMessage.addListener((e,t,n)=>(e.type==="START_SELECTION_MODE"?(T(),n({status:"active"})):e.type==="CANCEL_SELECTION_MODE"&&(x(),n({status:"idle"})),!0));function T(){l||(l=!0,N(),A(),X(),document.addEventListener("mousemove",L,!0),document.addEventListener("click",k,!0),document.addEventListener("mousedown",M,!0),document.addEventListener("mouseup",S,!0),document.addEventListener("keydown",F,!0))}function x(){l&&(l=!1,d(a),d(r),d(i),a=null,r=null,i=null,g=null,document.removeEventListener("mousemove",L,!0),document.removeEventListener("click",k,!0),document.removeEventListener("mousedown",M,!0),document.removeEventListener("mouseup",S,!0),document.removeEventListener("keydown",F,!0))}function d(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function N(){var e;d(a),a=document.createElement("div"),a.id="pf-selection-banner",a.style.cssText=`
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #141512;
    color: #F5F1E7;
    padding: 8px 18px;
    border-radius: 9999px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    border: 1px solid #34372D;
  `,a.innerHTML=`
    <span style="display: flex; align-items: center; gap: 8px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #969F60; display: inline-block; box-shadow: 0 0 8px #969F60;"></span>
      <span><b>FOLDERLENS ACTIVE:</b> Left-click image or drag box to search</span>
    </span>
    <span style="font-size: 11px; opacity: 0.6; margin-left: 6px;">ESC to exit</span>
    <button id="pf-cancel-btn" style="
      background: #22251E;
      border: 1px solid #34372D;
      color: #F5F1E7;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    ">Done</button>
  `,document.body.appendChild(a),(e=document.getElementById("pf-cancel-btn"))==null||e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),x(),chrome.runtime.sendMessage({type:"SELECTION_CANCELLED"})})}function A(){d(r),r=document.createElement("div"),r.id="pf-highlight-box",r.style.cssText=`
    position: absolute;
    z-index: 2147483645;
    pointer-events: none;
    border: 2px solid #969F60;
    background: rgba(150, 159, 96, 0.12);
    border-radius: 8px;
    box-shadow: 0 0 0 4px rgba(150, 159, 96, 0.15);
    transition: all 0.1s ease-out;
    display: none;
  `,document.body.appendChild(r)}function X(){d(i),i=document.createElement("div"),i.id="pf-drag-box",i.style.cssText=`
    position: absolute;
    z-index: 2147483646;
    pointer-events: none;
    border: 2px dashed #969F60;
    background: rgba(150, 159, 96, 0.15);
    border-radius: 6px;
    display: none;
  `,document.body.appendChild(i)}function L(e){if(!l||f)return;const t=document.elementFromPoint(e.clientX,e.clientY);if(!t||t.closest("#pf-selection-banner"))return;const n=C(t);if(n){g=n;const o=n.getBoundingClientRect();r&&(r.style.display="block",r.style.top=`${o.top+window.scrollY}px`,r.style.left=`${o.left+window.scrollX}px`,r.style.width=`${o.width}px`,r.style.height=`${o.height}px`)}else g=null,r&&(r.style.display="none")}function C(e){if(!e)return null;if(e.tagName==="IMG")return e;const t=e.querySelector("img");if(t)return t;const n=window.getComputedStyle(e).backgroundImage;if(n&&n!=="none"&&n.includes("url("))return e;const o=e.closest("img");return o||null}function M(e){if(!l)return;const t=e.target;t&&t.closest("#pf-selection-banner")||(f=!0,m=e.pageX,h=e.pageY,i&&(i.style.display="block",i.style.left=`${m}px`,i.style.top=`${h}px`,i.style.width="0px",i.style.height="0px"))}function S(e){if(!l||!f)return;f=!1;const t=e.pageX,n=e.pageY,o=Math.abs(t-m),s=Math.abs(n-h);if(i&&(i.style.display="none"),o<10&&s<10)return;e.preventDefault(),e.stopPropagation();const c=Math.min(m,t),u=Math.min(h,n),I=Array.from(document.querySelectorAll("img"));let y=null;for(const E of I){const p=E.getBoundingClientRect(),v=p.left+window.scrollX,w=p.top+window.scrollY;if(v>=c-20&&w>=u-20&&v+p.width<=c+o+20&&w+p.height<=u+s+20){y=D(E);break}}y?b(y):O(c,u,o,s)}function k(e){if(!l)return;const t=e.target;if(t&&t.closest("#pf-selection-banner"))return;e.preventDefault(),e.stopPropagation();const n=g||C(t);if(n){const o=D(n);o&&b(o)}}function D(e){if(e instanceof HTMLImageElement)return e.currentSrc||e.src||e.getAttribute("srcset")||null;const t=window.getComputedStyle(e).backgroundImage;if(t&&t!=="none"){const o=t.match(/url\(["']?(.*?)["']?\)/);if(o&&o[1])return o[1]}const n=e.querySelector("img");return n&&(n.currentSrc||n.src)||null}function O(e,t,n,o){try{const s=document.createElement("canvas");s.width=Math.max(n,50),s.height=Math.max(o,50);const c=s.getContext("2d");if(c){c.fillStyle="#FFFFFF",c.fillRect(0,0,s.width,s.height);const u=s.toDataURL("image/png");b(u)}}catch(s){console.error("Canvas region capture error:",s)}}function b(e){x(),chrome.runtime.sendMessage({type:"IMAGE_SELECTED",payload:{imageSource:e}})}function F(e){e.key==="Escape"&&(x(),chrome.runtime.sendMessage({type:"SELECTION_CANCELLED"}))}
