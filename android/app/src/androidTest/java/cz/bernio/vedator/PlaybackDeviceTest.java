package cz.bernio.vedator;

import static org.junit.Assert.*;
import android.app.Instrumentation;
import android.content.*;
import android.os.*;
import androidx.media3.common.*;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.common.util.concurrent.ListenableFuture;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
@UnstableApi
public class PlaybackDeviceTest {
    private final Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
    private Context context;
    private Store store;
    private MediaBrowser browser;
    private ActivityScenario<MainActivity> activity;
    private android.media.browse.MediaBrowser legacy;
    @Before public void setup()throws Exception{
        context=instrumentation.getTargetContext();context.stopService(new Intent(context,PlaybackService.class));Thread.sleep(250);
        store=new Store(context);store.clearUser();store.put("testOffline","1");
        File tone=new File(context.getCacheDir(),"test-tone.mp3");try(InputStream input=instrumentation.getContext().getAssets().open("tone.mp3");FileOutputStream out=new FileOutputStream(tone)){byte[] b=new byte[16384];int n;while((n=input.read(b))!=-1)out.write(b,0,n);}store.put("testAudio",tone.getPath());
        try(InputStream input=instrumentation.getContext().getAssets().open("tone-index.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[16384];int n;while((n=input.read(b))!=-1)out.write(b,0,n);Net.write(new File(context.getCacheDir(),"test-tone-index.json"),out.toByteArray());}
        activity=ActivityScenario.launch(MainActivity.class);
        AtomicReference<ListenableFuture<MediaBrowser>> future=new AtomicReference<>();instrumentation.runOnMainSync(()->future.set(new MediaBrowser.Builder(context,new SessionToken(context,new ComponentName(context,PlaybackService.class))).buildAsync()));browser=future.get().get(20,TimeUnit.SECONDS);
        waitFor(()->js("document.documentElement.dataset.vedatorV2Ready").equals("\"1\"")&&js("document.documentElement.dataset.vedatorNativeReady").equals("\"1\""),20000);
        assertEquals("\"1\"",js("document.documentElement.dataset.vedatorNative"));
    }
    @After public void cleanup()throws Exception{if(legacy!=null)instrumentation.runOnMainSync(()->legacy.disconnect());if(browser!=null){send(MainActivity.message("stop"));instrumentation.runOnMainSync(()->browser.release());}if(activity!=null)activity.close();context.stopService(new Intent(context,PlaybackService.class));store.put("testAudio","");store.put("testOffline","");}
    private String js(String code)throws Exception{CompletableFuture<String> value=new CompletableFuture<>();activity.onActivity(a->a.web.evaluateJavascript(code,value::complete));return value.get(5,TimeUnit.SECONDS);}
    private JSONObject send(JSONObject request)throws Exception{
        AtomicReference<ListenableFuture<SessionResult>> future=new AtomicReference<>();instrumentation.runOnMainSync(()->{Bundle args=new Bundle();args.putString("json",request.toString());future.set(browser.sendCustomCommand(new SessionCommand(PlaybackService.COMMAND,Bundle.EMPTY),args));});SessionResult result=future.get().get(10,TimeUnit.SECONDS);assertEquals(result.extras.getString("error"),SessionResult.RESULT_SUCCESS,result.resultCode);return new JSONObject(result.extras.getString("json","{}"));
    }
    private JSONObject snapshot()throws Exception{return send(MainActivity.message("snapshot"));}
    private void queue(int... numbers)throws Exception{JSONObject request=MainActivity.message("queue");JSONArray items=new JSONArray();for(int n:numbers){JSONObject entry=new JSONObject();entry.put("number",n);entry.put("start",0);entry.put("id","episode:"+n);entry.put("ref","");items.put(entry);}request.put("items",items);request.put("index",0);request.put("position",0);request.put("autoplay",true);request.put("token","device-test");JSONObject group=new JSONObject();group.put("type","playlist");group.put("id","playlist:device-test");group.put("label","Device test");request.put("context",group);send(request);}
    private interface Checked {boolean get()throws Exception;}
    private static void waitFor(Checked condition,long timeout)throws Exception{long end=SystemClock.elapsedRealtime()+timeout;while(SystemClock.elapsedRealtime()<end){if(condition.get())return;Thread.sleep(100);}fail("Timed out after "+timeout+" ms");}
    @Test public void modelCacheSurvivesActivityRecreation()throws Exception{
        js("window.cacheSeedDone=false;(async()=>{for(const name of ['transformers-cache','vedator-ai-model-v1','other-model-cache','vedator-offline-audio-v1','vedator-v2-app-old','vedator-v3-app-old']){const c=await caches.open(name);await c.put('https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/config.json',new Response('model-sentinel'))}localStorage.setItem('vedator-ai-cache-regression','keep');window.cacheSeedDone=true})()");
        waitFor(()->js("window.cacheSeedDone").equals("true"),5000);
        activity.recreate();
        waitFor(()->js("document.documentElement.dataset.vedatorNativeReady").equals("\"1\""),20000);
        js("window.cacheVerifiedDone=false;window.cacheVerified=false;(async()=>{const names=await caches.keys();const cache=await caches.open('transformers-cache');const response=await cache.match('https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/config.json');const body=response?await response.text():null;window.cacheVerified=body==='model-sentinel'&&['transformers-cache','vedator-ai-model-v1','other-model-cache','vedator-offline-audio-v1'].every(n=>names.includes(n))&&!names.some(n=>/^vedator-v[0-9]+-app-/.test(n));window.cacheReport={names,body,pass:window.cacheVerified};window.cacheVerifiedDone=true})()");
        waitFor(()->js("window.cacheVerifiedDone").equals("true"),5000);
        assertEquals(js("JSON.stringify(window.cacheReport)"),"true",js("window.cacheVerified"));
        assertEquals("\"keep\"",js("localStorage.getItem('vedator-ai-cache-regression')"));
    }
    @Test public void seekingAndBackgroundQueueUseNativeAudio()throws Exception{
        queue(9,41,1703);waitFor(()->snapshot().optBoolean("ready")&&snapshot().optDouble("time")>.1,15000);
        JSONObject seek=MainActivity.message("seek");seek.put("time",3);send(seek);waitFor(()->snapshot().optDouble("time")>=3,4000);
        send(MainActivity.message("pause"));double paused=snapshot().getDouble("time");seek.put("time",1);send(seek);Thread.sleep(350);assertFalse(snapshot().getBoolean("playing"));assertTrue(snapshot().getDouble("time")<1.2);assertTrue(paused>=3);
        send(MainActivity.message("play"));activity.onActivity(a->a.moveTaskToBack(true));
        waitFor(()->snapshot().optInt("index")==2,20000);assertEquals(1703,snapshot().getJSONObject("queue").getJSONArray("items").getJSONObject(2).getInt("number"));
        waitFor(()->Store.object(store.get(Store.PROGRESS,"{}")).has("episode-1703"),6000);
        JSONObject progress=Store.object(store.get(Store.PROGRESS,"{}"));assertTrue(progress.getJSONObject("episode-9").getBoolean("completed"));assertTrue(progress.getJSONObject("episode-41").getBoolean("completed"));assertTrue(snapshot().optString("error").isEmpty());
    }
    @Test public void autoCatalogAndWebControlsShareTheService()throws Exception{
        AtomicReference<ListenableFuture<LibraryResult<MediaItem>>> rootFuture=new AtomicReference<>();instrumentation.runOnMainSync(()->rootFuture.set(browser.getLibraryRoot(null)));LibraryResult<MediaItem> root=rootFuture.get().get(5,TimeUnit.SECONDS);assertEquals("Library root result",SessionResult.RESULT_SUCCESS,root.resultCode);assertNotNull(root.value);assertEquals("root",root.value.mediaId);
        AtomicReference<ListenableFuture<LibraryResult<com.google.common.collect.ImmutableList<MediaItem>>>> children=new AtomicReference<>();instrumentation.runOnMainSync(()->children.set(browser.getChildren("root",0,100,null)));assertEquals(5,children.get().get(5,TimeUnit.SECONDS).value.size());
        // Legacy Android Auto sends only a media ID, without the original metadata.
        Catalog catalog=Catalog.get(context,store);int seriesIndex=-1;for(int i=0;i<catalog.children("series").size();i++){java.util.List<MediaItem> list=catalog.children("series:"+i);if(list.size()>2&&list.get(0).mediaMetadata.extras.getInt("number")==9&&list.get(2).mediaMetadata.extras.getInt("number")==1703){seriesIndex=i;break;}}
        assertTrue("Black hole series exists",seriesIndex>=0);MediaItem seriesItem=catalog.children("series:"+seriesIndex).get(1);
        CompletableFuture<Boolean> legacyConnected=new CompletableFuture<>();instrumentation.runOnMainSync(()->{legacy=new android.media.browse.MediaBrowser(context,new ComponentName(context,PlaybackService.class),new android.media.browse.MediaBrowser.ConnectionCallback(){@Override public void onConnected(){legacyConnected.complete(true);}@Override public void onConnectionFailed(){legacyConnected.complete(false);}},null);legacy.connect();});
        assertTrue("Android Auto compatible platform browser connects",legacyConnected.get(10,TimeUnit.SECONDS));
        instrumentation.runOnMainSync(()->new android.media.session.MediaController(context,legacy.getSessionToken()).getTransportControls().playFromMediaId(seriesItem.mediaId,null));
        waitFor(()->snapshot().optBoolean("ready")&&snapshot().getJSONObject("queue").optJSONArray("items")!=null&&snapshot().getJSONObject("queue").getJSONArray("items").length()>2,10000);
        JSONObject car=snapshot();assertEquals("series",car.getJSONObject("queue").getJSONObject("context").getString("type"));assertEquals(41,car.getJSONObject("queue").getJSONArray("items").getJSONObject(car.getInt("index")).getInt("number"));
        assertEquals("true",js("(document.querySelector('[data-view=series]').click(),true)"));
        js("document.querySelector('#series-v2 .series>summary').click();document.querySelector('.series-resume-v2').click();true");
        waitFor(()->snapshot().optBoolean("playing")&&snapshot().optBoolean("ready"),15000);
        assertEquals("null",js("document.getElementById('audio-v2').getAttribute('src')"));
        js("document.getElementById('player-seek-v2').value='3';document.getElementById('player-seek-v2').dispatchEvent(new Event('change',{bubbles:true}));true");waitFor(()->snapshot().optDouble("time")>=3,5000);
        js("document.getElementById('player-play-v2').click();true");waitFor(()->!snapshot().optBoolean("playing"),3000);
    }
}
