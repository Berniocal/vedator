// Oddělený pracovní proces pro volitelný jazykový model AI Vedátor.
// WebGPU jen se skutečně dostupným adaptérem; jinak procesor (WASM).
const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
let generator = null, lib = null, loading = null, backend = "";
function reply(id,type,data={}) { self.postMessage({id,type,...data}); }
async function gpuAvailable() {
  if(!self.navigator?.gpu?.requestAdapter)return false;
  try {
    const adapter=await self.navigator.gpu.requestAdapter({powerPreference:"low-power"});
    return !!adapter;
  } catch {return false;}
}
async function loadGenerator(id,permitted,preferredDevice) {
  if(generator)return backend;
  if(loading)return loading;
  loading=(async()=>{
    if(!lib)lib=await import(LIBRARY);
    lib.env.useBrowserCache=true;
    lib.env.allowLocalModels=false;
    lib.env.allowRemoteModels=true;
    if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
    // Při následném dotazu nesmí chybějící váhy iniciovat nové stažení.
    lib.env.fetch=(url,options)=>{
      const address=String(url?.url||url||"");
      if(!permitted && /qwen2\.5-0\.5b-instruct/i.test(address) &&
          /\/onnx\/model_q4\.onnx/i.test(address)) {
        throw Error("Model není plně uložen. Použij ruční stažení.");
      }
      return fetch(url,options);
    };
    const preferred=preferredDevice==="wasm"?"wasm":await gpuAvailable()?"webgpu":"wasm";
    const options=device=>({
      dtype:"q4",device,
      progress_callback:p=>{
        if(!permitted)return;
        if(p.status==="progress" && Number.isFinite(p.progress)){
          reply(id,"progress",{file:String(p.file||"model"),progress:p.progress});
        }else if(["initiate","download","done"].includes(p.status)){
          reply(id,"stage",{stage:p.status,file:String(p.file||"model")});
        }
      }
    });
    reply(id,"backend",{device:preferred});
    try {
      generator=await lib.pipeline("text-generation",MODEL,options(preferred));
      backend=preferred;
    }catch(firstError) {
      // WebGPU může selhat i při existenci adaptéru. Zkusit stejný q4 model na CPU.
      if(preferred!=="webgpu")throw firstError;
      reply(id,"backend",{device:"wasm",reason:"GPU se nepodařilo inicializovat."});
      try {
        generator=await lib.pipeline("text-generation",MODEL,options("wasm"));
        backend="wasm";
      }catch(secondError){
        throw Error("WebGPU: "+String(firstError?.message||firstError)+"; CPU/WASM: "+String(secondError?.message||secondError));
      }
    }
    return backend;
  })();
  try{return await loading;}finally{loading=null;}
}
self.onmessage=async event=>{
  const {id,action,messages,canDownload,device}=event.data||{};
  try {
    if(action==="load"){
      const chosen=await loadGenerator(id,!!canDownload,device);
      reply(id,"ok",{ready:true,backend:chosen});
    }else if(action==="generate"){
      if(!generator)throw Error("Jazykový model ještě není připraven.");
      const result=await generator(messages,{
        max_new_tokens:150,do_sample:false,return_full_text:false
      });
      const generated=result?.[0]?.generated_text;
      const value=Array.isArray(generated)?generated.at(-1)?.content||"":String(generated||"");
      reply(id,"ok",{answer:String(value).trim(),backend});
    }else throw Error("Neznámý požadavek generátoru.");
  }catch(error){reply(id,"error",{message:String(error?.message||error)});}
};