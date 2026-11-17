import json,os
from pathlib import Path
import torch
from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
root=Path(__file__).resolve().parent.parent
p=root/"captions/source/episode-6-draft.sk.json"
data=json.loads(p.read_text())
torch.set_num_threads(4)
model_name="facebook/nllb-200-distilled-600M"
tokenizer=AutoTokenizer.from_pretrained(model_name,src_lang="slk_Latn")
model=AutoModelForSeq2SeqLM.from_pretrained(model_name).eval()
model=torch.ao.quantization.quantize_dynamic(model,{torch.nn.Linear},dtype=torch.qint8)
target=tokenizer.convert_tokens_to_ids("ces_Latn")
texts=[]
with torch.inference_mode():
    for i in range(0,len(data["cues"]),8):
        source=[c["text"] for c in data["cues"][i:i+8]]
        inputs=tokenizer(source,return_tensors="pt",padding=True,truncation=True,max_length=200)
        result=model.generate(**inputs,forced_bos_token_id=target,num_beams=3,max_new_tokens=140)
        batch=tokenizer.batch_decode(result,skip_special_tokens=True)
        texts.extend(" ".join(t.split()).strip() for t in batch)
        print(f"TRANSLATE {min(i+8,len(data['cues']))}/{len(data['cues'])}",flush=True)
assert len(texts)==len(data["cues"]) and all(texts)
out={"episode":6,"model":model_name,"quality":"unreviewed-machine-translation","audioSha256":data["source"]["audioSha256"],"cues":[{"sourceCue":i+1,"sk":c["text"],"cs":t} for i,(c,t) in enumerate(zip(data["cues"],texts))]}
(root/"captions/source/episode-6-translation.cs.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
