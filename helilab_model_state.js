/* Preserve model controls and capture actual states rather than clicks. */
'use strict';
const HLModelState=(()=>{
  const label=(e,i)=>e.getAttribute('aria-label')||e.closest('label')?.textContent.trim()||`control-${i}`;
  function controls(host){
    return {
      get(){return {inputs:[...host.querySelectorAll('input,select')].map((e,i)=>({label:label(e,i),type:e.type,value:e.value,checked:e.checked})),selected:[...host.querySelectorAll('.hl-seg-btn.on')].map(e=>e.textContent.trim())};},
      set(state){
        for(const text of state?.selected||[]){const b=[...host.querySelectorAll('.hl-seg-btn')].find(e=>e.textContent.trim()===text);if(b&&!b.disabled)b.click();}
        for(const item of state?.inputs||[]){const e=[...host.querySelectorAll('input,select')].find((e,i)=>label(e,i)===item.label);if(!e)continue;if(e.type==='checkbox')e.checked=!!item.checked;else e.value=item.value;e.dispatchEvent(new Event(e.type==='checkbox'||e.tagName==='SELECT'?'change':'input',{bubbles:true}));}
      },
      evidence(){return {};}
    };
  }
  function snapshot(host){
    const state=JSON.parse(JSON.stringify(host._hlModel?.get()||{}));
    const values={};
    for(const e of host.querySelectorAll('.hl-kv')){const k=e.querySelector('span')?.textContent.trim(),v=e.querySelector('b')?.textContent.trim();if(k&&v)values[k]=v;}
    const inputs={};for(const e of state.inputs||[])inputs[e.label]=e.type==='checkbox'?e.checked:e.value;
    return {at:new Date().toISOString(),model:state.model||host.dataset.model,inputs,selected:state.selected||[],values,state,evidence:JSON.parse(JSON.stringify(host._hlModel?.evidence?.()||{}))};
  }
  return {controls,snapshot};
})();
