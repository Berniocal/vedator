// Samostatný Web Worker pro volitelný lokální generativní model.
// Nevstupuje do hlavní aplikace ani do vyhledávacího modelu.
const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
let generator = null;
let lib = null;
let loading = null;
let allowDownload = false;

function reply(id, type, data={}) { self.postMessage({id,type,...data}); }

async function loadGenerator(id, permitted) {
  if (generator) return;
  if (loading) return loading;
  if (!self.navigator?.gpu) throw Error("Tento prohlížeč nepodporuje WebGPU potřebné pro generativní AI.");
  allowDownload = !!permitted;
  loading = (async () => {
    if (!lib) lib = await import(LIBRARY);
    lib.env.useBrowserCache = true;
    lib.env.allowRemoteModels = true;
    lib.env.allowLocalModels = false;
    generator = await lib.pipeline("text-generation", MODEL, {
      dtype: "q4", device: "webgpu",
      progress_callback: p => {
        if (!permitted) return;
        if (p.status === "progress" && Number.isFinite(p.progress)) {
          reply(id,"progress",{file:String(p.file||"model"),progress:p.progress});
        } else if (p.status === "initiate" || p.status === "download" || p.status === "done") {
          reply(id,"stage",{stage:p.status,file:String(p.file||"model")});
        }
      }
    });
  })();
  try { await loading; } finally { loading = null; allowDownload = false; }
}

self.onmessage = async event => {
  const {id,action,messages,canDownload} = event.data || {};
  try {
    if (action === "load") {
      await loadGenerator(id,!!canDownload);
      reply(id,"ok",{ready:true});
    } else if (action === "generate") {
      if (!generator) throw Error("Generativní model nebyl načten.");
      const result = await generator(messages, {
        max_new_tokens: 200,
        do_sample: false,
        return_full_text: false,
      });
      const generated = result?.[0]?.generated_text;
      const value = Array.isArray(generated)
        ? generated.at(-1)?.content || ""
        : String(generated||"");
      reply(id,"ok",{answer:String(value).trim()});
    } else {
      throw Error("Neznámá operace generátoru.");
    }
  } catch (error) {
    reply(id,"error",{message:String(error?.message||error)});
  }
};
