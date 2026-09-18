const KEY="tamLuBunkerManager_v02";
let bunkers=JSON.parse(localStorage.getItem(KEY)||"[]");
let selectedId=null, editingId=null;
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
const save=()=>localStorage.setItem(KEY,JSON.stringify(bunkers));
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[c]));
const cropIcon=c=>["GS1","GS2","GS3"].includes(c)?"🌿":c==="CS"?"🌽":"🌾";
const storageFactor=c=>["GS1","GS2","GS3"].includes(c)?0.7:c==="CS"||c==="ソルガム"?0.8:0;
const siloVolume=b=>(+b.width||0)*(+b.depth||0)*(+b.height||0);
const theoreticalTon=b=>siloVolume(b)*storageFactor(b.crop);
const formatNum=n=>Number(n||0).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
const calcCapacity=()=>{const w=+$("#width").value||0,d=+$("#depth").value||0,h=+$("#height").value||0,crop=$("#crop").value;$("#volumePreview").textContent=formatNum(w*d*h);$("#capacityPreview").textContent=formatNum(w*d*h*storageFactor(crop));$("#factorPreview").textContent=(storageFactor(crop)*100)+"%"};
["#width","#depth","#height","#crop"].forEach(s=>$(s)?.addEventListener("input",calcCapacity));
function show(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(id).classList.add("active");scrollTo(0,0)}
function renderHome(){
 const list=$("#bunkerList");
 if(!bunkers.length){list.innerHTML=`<div class="empty"><div style="font-size:38px">🐄🚜</div><h3>まだバンカーが登録されていません</h3><p>「＋ バンカー追加」から最初のバンカーを登録しよう！</p></div>`;return}
 const sort=$("#sortSelect")?.value||"name";
 const cropOrder={"GS1":1,"GS2":2,"GS3":3,"CS":4,"ソルガム":5};
 const sorted=[...bunkers].sort((a,b)=>{
   if(sort==="crop") return (cropOrder[a.crop]||99)-(cropOrder[b.crop]||99) || String(a.name||"").localeCompare(String(b.name||""),"ja");
   if(sort==="updated") return String(b.history?.at(-1)?.date||"").localeCompare(String(a.history?.at(-1)?.date||""));
   if(sort==="number") return String(a.number||"").localeCompare(String(b.number||""),"ja", {numeric:true});
   return String(a.name||"").localeCompare(String(b.name||""),"ja") || String(a.number||"").localeCompare(String(b.number||""),"ja",{numeric:true});
 });
 list.innerHTML=sorted.map(b=>`<article class="card" onclick="openDetail('${b.id}')">
 <div class="card-top"><div class="crop-main">${cropIcon(b.crop)} ${esc(b.crop)}</div><div class="card-title"><strong>${esc(b.name||"名称未設定")}</strong><span>番号：${esc(b.number)}</span></div></div>
 <div class="crop-line"><strong>${esc(b.variety||"品種未設定")}</strong></div>
 <div class="remaining">${b.remaining}%</div><div class="bar"><div style="width:${Math.max(0,Math.min(100,b.remaining))}%"></div></div>
 <div class="meta">理論値収容：${formatNum(theoreticalTon(b))} t<br>開封：${esc(b.openingDate||"未開封")}<br>発酵：${esc(b.fermentation)}<br>水分：${b.moistureRecords?.length?b.moistureRecords.at(-1).value+"%":"未記録"}<br>最終更新：${esc(b.history?.at(-1)?.date||"—")}</div>
 </article>`).join("")
}
function renderSummary(){
 const types=["GS1","GS2","GS3","CS","ソルガム"];
 const rows=types.map(c=>{const bs=bunkers.filter(b=>b.crop===c);const capacity=bs.reduce((s,b)=>s+theoreticalTon(b),0);const actual=bs.reduce((s,b)=>s+(Number.isFinite(Number(b.amount))&&String(b.amount).trim()!==""?Number(b.amount):theoreticalTon(b)),0);const actualRemaining=bs.reduce((s,b)=>{const packed=Number.isFinite(Number(b.amount))&&String(b.amount).trim()!==""?Number(b.amount):theoreticalTon(b);const pct=Math.max(0,Math.min(100,Number(b.remaining)||0))/100;return s+packed*pct;},0);const theoreticalRemaining=bs.reduce((s,b)=>s+theoreticalTon(b)*(Math.max(0,Math.min(100,Number(b.remaining)||0))/100),0);return {c,count:bs.length,capacity,actual,actualRemaining,theoreticalRemaining};});
 const total=rows.reduce((s,r)=>s+r.capacity,0),remainTotal=rows.reduce((s,r)=>s+r.actualRemaining,0),actualTotal=rows.reduce((s,r)=>s+r.actual,0);
 $("#summaryContent").innerHTML=`<div class="summary-hero"><div><div class="eyebrow">FARM SILAGE STOCK</div><h2>サイレージ在庫状況</h2><p>理論値収容トン数 × 現在の残量から算出</p></div><div class="summary-total"><small>全サイレージ残量</small><strong>${formatNum(remainTotal)} <span>t</span></strong><span>理論値合計 ${formatNum(total)} t</span><span>実際の詰め込み量合計 ${formatNum(actualTotal)} t</span></div></div>
 <div class="summary-grid">${rows.map(r=>{const pct=r.actual?Math.round(r.actualRemaining/r.actual*100):0;return `<article class="summary-card"><div class="summary-card-head"><span class="crop-main">${cropIcon(r.c)} ${r.c}</span><span>${r.count}基</span></div><div class="summary-ton"><strong>${formatNum(r.actualRemaining)}</strong><span>t</span></div><div class="bar"><div style="width:${pct}%"></div></div><div class="summary-meta"><span>理論値収容 ${formatNum(r.capacity)} t</span><span>実際の詰め込み ${formatNum(r.actual)} t</span><strong>残量 ${pct}%</strong></div></article>`}).join("")}</div>
 <div class="summary-note">※ GS1・GS2・GS3：サイロ容積の70% ／ CS・ソルガム：サイロ容積の80% として計算しています。</div>`;
}
function openDetail(id){
 selectedId=id;const b=bunkers.find(x=>x.id===id);if(!b)return;
 const moisture=(b.moistureRecords||[]).slice().reverse();const history=(b.history||[]).slice().reverse();
 $("#detailContent").innerHTML=`<div class="detail-card">
 <div class="detail-header"><div><span class="badge">${esc(b.crop||"未設定")}</span><h2>${esc(b.number)} ${esc(b.name||"")}</h2><p class="muted"><span class="crop-icon">${cropIcon(b.crop)}</span> ${esc(b.variety||"品種未設定")}</p></div><div class="action-row"><button class="icon-btn" onclick="editBunker()" title="修正" aria-label="修正">✏️</button><button class="icon-btn reset-btn" onclick="resetBunkerContents()" title="中身をリセット" aria-label="中身をリセット">🔄</button><button class="icon-btn danger" onclick="deleteBunker()" title="削除" aria-label="削除">🗑️</button></div></div>
 <div class="detail-remaining"><small>現在の残量</small><div><strong>${b.remaining}%</strong></div><div class="bar"><div style="width:${Math.max(0,Math.min(100,b.remaining))}%"></div></div><div class="detail-ton">現在の推定残量：<strong>${formatNum(theoreticalTon(b)*(Number(b.remaining)||0)/100)} t</strong></div><button class="primary" style="margin-top:14px" onclick="addRemaining()">残量を更新</button></div>
 <h3>バンカーサイズ</h3><div class="info-grid"><div class="info"><small>幅</small>${b.width} m</div><div class="info"><small>奥行き</small>${b.depth} m</div><div class="info"><small>高さ</small>${b.height} m</div><div class="info"><small>サイロ容積</small>${formatNum(siloVolume(b))} m³</div><div class="info"><small>理論値収容トン数</small>${formatNum(theoreticalTon(b))} t</div><div class="info"><small>換算係数</small>${storageFactor(b.crop)*100}%</div></div>
 <h3>詰め込み情報</h3><div class="info-grid"><div class="info"><small>収穫日</small>${esc(b.harvestDate||"—")}</div><div class="info"><small>天気</small>${esc(b.weather)}</div><div class="info"><small>収穫時の状態</small>${esc(b.condition)}</div><div class="info"><small>詰め込み面積</small>${b.area||"—"} ha</div><div class="info"><small>実際の詰め込み量</small>${b.amount||"—"} t</div></div>
 <h3>開封・発酵</h3><div class="info-grid"><div class="info"><small>開封日</small>${esc(b.openingDate||"未開封")}</div><div class="info"><small>発酵状態</small>${esc(b.fermentation)}</div></div>
 <h3>💧 水分量記録</h3><button class="small-btn" onclick="addMoisture()">＋ 水分量を記録</button>
 ${moisture.length?moisture.map((r,i)=>`<div class="record-box"><div class="record-head"><strong>${r.value}%</strong><span>${r.date}</span></div><div class="record-note">${esc(r.note||"メモなし")}</div><div class="history-actions"><button class="small-btn danger" onclick="deleteMoisture(${(b.moistureRecords.length-1-i)})">この記録を削除</button></div></div>`).join(""):"<p class='muted'>まだ水分量の記録はありません。</p>"}
 <h3>📊 残量履歴</h3>${history.length?history.map((r,i)=>`<div class="history-row"><span>${r.date}</span><strong>${r.value}%</strong><button class="small-btn danger" onclick="deleteHistory(${b.history.length-1-i})">削除</button></div>`).join(""):"<p class='muted'>履歴なし</p>"}
 <h3>📝 フリーコメント</h3><textarea id="detailComment" class="detail-comment" placeholder="このバンカーについて自由にメモできます。">${esc(b.comment||"")}</textarea><button class="primary" style="margin-top:10px" onclick="saveComment()">💾 コメントを保存</button>
 </div>`;show("#detail")
}
function saveComment(){const b=bunkers.find(x=>x.id===selectedId);if(!b)return;b.comment=$("#detailComment").value;save();alert("コメントを保存しました。");openDetail(selectedId)}
function resetForm(){editingId=null;$("#bunkerForm").reset();$("#formTitle").textContent="バンカー登録";$("#saveLabel").textContent="バンカーを保存";calcCapacity()}
$("#sortSelect").onchange=()=>renderHome();
$("#addBtn").onclick=()=>{resetForm();show("#formView")};
$("#summaryBtn").onclick=()=>{renderSummary();show("#summaryView")};
$("#summaryBackBtn").onclick=()=>{renderHome();show("#dashboard")};
$("#backBtn").onclick=()=>{renderHome();show("#dashboard")};
$("#formBackBtn").onclick=()=>{renderHome();show("#dashboard")};
$("#bunkerForm").onsubmit=e=>{
 e.preventDefault();const f=new FormData(e.target),w=+f.get("width")||0,d=+f.get("depth")||0,h=+f.get("height")||0,remaining=Math.round(+f.get("remaining")||0),moisture=f.get("moisture"),crop=f.get("crop");
 if(editingId){const b=bunkers.find(x=>x.id===editingId);const oldRemaining=b.remaining;Object.assign(b,{name:f.get("name"),number:f.get("number"),width:w,depth:d,height:h,crop,variety:f.get("variety"),harvestDate:f.get("harvestDate"),weather:f.get("weather"),condition:f.get("condition"),area:f.get("area"),amount:f.get("amount"),openingDate:f.get("openingDate"),fermentation:f.get("fermentation")});
  if(oldRemaining!==remaining){b.remaining=remaining;b.history=b.history||[];b.history.push({date:today(),value:remaining})} else b.remaining=remaining;
  if(moisture!==""){b.moistureRecords=b.moistureRecords||[];b.moistureRecords.push({date:today(),value:+moisture,note:f.get("memo")})}
 }else{bunkers.push({id:crypto.randomUUID(),name:f.get("name"),number:f.get("number"),width:w,depth:d,height:h,crop,variety:f.get("variety"),harvestDate:f.get("harvestDate"),weather:f.get("weather"),condition:f.get("condition"),area:f.get("area"),amount:f.get("amount"),openingDate:f.get("openingDate"),fermentation:f.get("fermentation"),remaining,history:[{date:today(),value:remaining}],moistureRecords:moisture!==""?[{date:today(),value:+moisture,note:f.get("memo")}]:[]})}
 save();renderHome();show("#dashboard")
};
function editBunker(){const b=bunkers.find(x=>x.id===selectedId);editingId=b.id;$("#formTitle").textContent="バンカー情報を修正";$("#saveLabel").textContent="変更を保存";const form=$("#bunkerForm");Object.entries(b).forEach(([k,v])=>{const el=form.elements[k];if(el&&typeof v!=="object")el.value=v});calcCapacity();show("#formView")}

function resetBunkerContents(){
 const b=bunkers.find(x=>x.id===selectedId);
 if(!b)return;
 const ok=confirm(`「${b.number} ${b.name||""}」の中身をリセットしますか？\n\n種類・品種・収穫情報・詰め込み量・開封/発酵情報・残量・残量履歴・水分記録・コメントをすべて消去します。\n\n※バンカー名・番号・サイズはそのまま残ります。`);
 if(!ok)return;
 b.crop="";
 b.variety="";
 b.harvestDate="";
 b.weather="";
 b.condition="";
 b.area="";
 b.amount="";
 b.openingDate="";
 b.fermentation="";
 b.remaining=0;
 b.history=[];
 b.moistureRecords=[];
 b.comment="";
 save();
 openDetail(selectedId);
 alert("バンカーの中身・記録をリセットしました。\nバンカー名・番号・サイズは残っています。");
}
function deleteBunker(){const b=bunkers.find(x=>x.id===selectedId);if(confirm(`「${b.number}」を削除しますか？\nこのバンカーの記録もすべて削除されます。`)){bunkers=bunkers.filter(x=>x.id!==selectedId);save();renderHome();show("#dashboard")}}
function addRemaining(){const b=bunkers.find(x=>x.id===selectedId),v=prompt("現在の残量を入力してください（0〜100%）",b.remaining);if(v===null)return;const n=Number(v);if(!Number.isFinite(n)||n<0||n>100)return alert("0〜100の数字を入力してください。");b.remaining=Math.round(n);b.history=b.history||[];b.history.push({date:today(),value:b.remaining});save();openDetail(selectedId)}
function addMoisture(){const b=bunkers.find(x=>x.id===selectedId),v=prompt("水分量を入力してください（%）");if(v===null)return;const n=Number(v);if(!Number.isFinite(n)||n<0||n>100)return alert("0〜100の数字を入力してください。");const note=prompt("メモ（任意）","");b.moistureRecords=b.moistureRecords||[];b.moistureRecords.push({date:today(),value:n,note:note||""});save();openDetail(selectedId)}
function deleteHistory(index){const b=bunkers.find(x=>x.id===selectedId);if(!b.history?.[index])return;if(confirm("この残量履歴を削除しますか？")){b.history.splice(index,1);if(b.history.length)b.remaining=b.history.at(-1).value;save();openDetail(selectedId)}}
function deleteMoisture(index){const b=bunkers.find(x=>x.id===selectedId);if(!b.moistureRecords?.[index])return;if(confirm("この水分量記録を削除しますか？")){b.moistureRecords.splice(index,1);save();openDetail(selectedId)}}
renderHome();calcCapacity();
