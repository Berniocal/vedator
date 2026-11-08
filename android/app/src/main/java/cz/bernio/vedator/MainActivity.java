package cz.bernio.vedator;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.*;
import androidx.media3.session.MediaController;
import androidx.webkit.*;
import com.google.common.util.concurrent.ListenableFuture;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

@UnstableApi
public class MainActivity extends Activity {
    WebView web;
    private Store store;
    private Catalog catalog;
    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;
    private final ExecutorService io=Executors.newFixedThreadPool(3);
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ArrayDeque<JSONObject> waiting=new ArrayDeque<>();
    private ValueCallback<Uri[]> chooser;
    private boolean pageReady=false,bootSent=false,resumed=false;
    private int dataTicks=0;
    private TextView status;
    private final Runnable poll=new Runnable(){public void run(){if(controller!=null&&pageReady&&resumed){control(message("snapshot"),false);if(++dataTicks%10==0)sendData("data",null);}handler.postDelayed(this,500);}};

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state){
        super.onCreate(state);store=new Store(this);store.put("lastUiCreated",Long.toString(System.currentTimeMillis()));catalog=Catalog.get(this,store);
        getWindow().setStatusBarColor(Color.rgb(33,26,62));getWindow().setNavigationBarColor(Color.rgb(18,18,27));
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setBackgroundColor(Color.rgb(18,18,27));
        layout.setOnApplyWindowInsetsListener((view,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);bar.setPadding(dp(12),0,dp(4),0);bar.setBackgroundColor(Color.rgb(33,26,62));
        status=new TextView(this);status.setText("Vedátor · 0.1");status.setTextSize(14);status.setTextColor(Color.rgb(236,231,255));bar.addView(status,new LinearLayout.LayoutParams(0,dp(40),1));status.setGravity(Gravity.CENTER_VERTICAL);
        Button menu=new Button(this);menu.setText("⋮");menu.setContentDescription("Nabídka aplikace");bar.addView(menu,new LinearLayout.LayoutParams(dp(48),dp(40)));menu.setOnClickListener(v->showMenu(menu));
        layout.addView(bar);web=new WebView(this);web.setBackgroundColor(Color.rgb(18,18,27));layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);
        web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){status.setText("Aktualizuj Android System WebView");return;}
        WebViewCompat.addWebMessageListener(web,"VedatorNative",Collections.singleton("https://bernio.cz"),(view,message,origin,main,reply)->{
            if(!main||!WebSource.trusted(origin))return;
            try{String body=message.getData();if(body==null||body.length()>3_000_000)return;receive(new JSONObject(body));}catch(Exception e){notice("Příkaz se nepodařil: "+e.getMessage());}
        });
        if(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))WebViewCompat.addDocumentStartJavaScript(web,"if(navigator.serviceWorker){navigator.serviceWorker.register=()=>Promise.reject(new Error('Android uses its native offline storage'));}",Collections.singleton("https://bernio.cz"));
        final WebSource source;try{source=new WebSource(getApplicationContext());}catch(IOException e){status.setText("Chybí soubory aplikace");return;}
        if(WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE))ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(new ServiceWorkerClientCompat(){@Override public WebResourceResponse shouldInterceptRequest(@NonNull WebResourceRequest request){return source.intercept(request.getUrl());}});
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return request.getMethod().equals("GET")?source.intercept(request.getUrl()):null;}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(request.isForMainFrame()&&(!WebSource.trusted(uri)||!uri.getPath().startsWith("/vedator/"))){openExternal(uri);return true;}return false;}
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){pageReady=false;bootSent=false;status.setText("Vedátor · načítám…");}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())status.setText("Načtení se nezdařilo · nabídka → Obnovit");}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Ano",(d,w)->result.confirm()).setNegativeButton("Zrušit",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.confirm()).show();return true;}
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");try{startActivityForResult(intent,11);}catch(Exception e){chooser=null;callback.onReceiveValue(null);}return true;}
        });
        web.setDownloadListener((url,agent,disposition,mime,length)->{if(url.startsWith("https://"))openExternal(Uri.parse(url));else notice("Pro export použij Moje data → Stáhnout zálohu.");});
        SessionToken token=new SessionToken(this,new ComponentName(this,PlaybackService.class));
        controllerFuture=new MediaController.Builder(this,token).buildAsync();controllerFuture.addListener(()->{
            try{controller=controllerFuture.get();while(!waiting.isEmpty())control(waiting.removeFirst(),true);if(pageReady&&!bootSent)sendData("bootstrap",null);}
            catch(Exception e){notice("Přehrávač není dostupný: "+e.getMessage());}
        },ContextCompat.getMainExecutor(this));
        handler.post(poll);
        // A browser SW can serve an unadapted app-v2.js from its own cache on the next
        // Activity creation. Unregister it before opening the actual document; keep
        // localStorage and offline MP3s. Native files provide offline app startup.
        String bootstrap="<!doctype html><meta name='viewport' content='width=device-width'><body style='background:#12121b;color:#eee;font:16px sans-serif;padding:24px'>Načítám Vedátora…<script>Promise.resolve().then(async()=>{if(navigator.serviceWorker)for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();if(window.caches)for(const k of await caches.keys())if(k!=='vedator-offline-audio-v1')await caches.delete(k)}).catch(()=>{}).finally(()=>location.replace('https://bernio.cz/vedator/'));</script>";
        web.loadDataWithBaseURL("https://bernio.cz/vedator/__android_bootstrap__",bootstrap,"text/html","UTF-8",null);
        handleVoice(getIntent());
        long checked;try{checked=Long.parseLong(store.get("apkLastChecked","0"));}catch(NumberFormatException e){checked=0;}
        if(System.currentTimeMillis()-checked>86400000){store.put("apkLastChecked",Long.toString(System.currentTimeMillis()));new Updater(this,io).check(false);}
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private void handleVoice(Intent intent){if(intent!=null&&"android.media.action.MEDIA_PLAY_FROM_SEARCH".equals(intent.getAction())){JSONObject request=message("search");Store.set(request,"query",intent.getStringExtra(android.app.SearchManager.QUERY)==null?"":intent.getStringExtra(android.app.SearchManager.QUERY));control(request,true);}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleVoice(intent);}
    static JSONObject message(String action){JSONObject out=new JSONObject();Store.set(out,"action",action);return out;}
    private void receive(JSONObject request)throws Exception{
        switch(request.optString("action")){
            case "ready":store.mergeWeb(request.optJSONObject("values")==null?new JSONObject():request.optJSONObject("values"));pageReady=true;status.setText("Vedátor · 0.1");if(controller!=null)sendData("bootstrap",null);break;
            case "storage":if(request.optJSONObject("values")!=null)store.mergeWeb(request.getJSONObject("values"));break;
            case "replaceStorage":case "clear":control(request,true);break;
            case "offline":notice(Downloads.toggle(this,store,catalog,request.optInt("number")));sendData("data",null);break;
            case "download":downloadMp3(request.optInt("number"));break;
            case "export":export(request.optString("data"));break;
            default:control(request,true);
        }
    }
    private void control(JSONObject request,boolean report){
        if(controller==null){if(waiting.size()<15)waiting.addLast(request);return;}
        Bundle args=new Bundle();args.putString("json",request.toString());ListenableFuture<SessionResult> future=controller.sendCustomCommand(new SessionCommand(PlaybackService.COMMAND,Bundle.EMPTY),args);
        future.addListener(()->{try{SessionResult result=future.get();if(result.resultCode==SessionResult.RESULT_SUCCESS){JSONObject snapshot=Store.object(result.extras.getString("json","{}"));if(pageReady){JSONObject out=new JSONObject();Store.set(out,"kind","snapshot");Store.set(out,"snapshot",snapshot);emit(out);}}else if(report)notice(result.extras.getString("error","Příkaz přehrávače se nezdařil."));}catch(Exception e){if(report)notice("Přehrávač není dostupný.");}},ContextCompat.getMainExecutor(this));
    }
    private void sendData(String kind,JSONObject ignored){
        if(controller==null||!pageReady)return;
        if(kind.equals("bootstrap"))bootSent=true;
        Bundle args=new Bundle();args.putString("json",message("snapshot").toString());ListenableFuture<SessionResult> future=controller.sendCustomCommand(new SessionCommand(PlaybackService.COMMAND,Bundle.EMPTY),args);
        future.addListener(()->{try{JSONObject out=new JSONObject();Store.set(out,"kind",kind);Store.set(out,"values",store.webData());Store.set(out,"downloads",Downloads.state(this,store));Store.set(out,"snapshot",Store.object(future.get().extras.getString("json","{}")));emit(out);}catch(Exception e){notice("Synchronizace přehrávače se nezdařila.");}},ContextCompat.getMainExecutor(this));
    }
    private void emit(JSONObject message){if(!pageReady||web==null||!WebSource.trusted(Uri.parse(web.getUrl()==null?"":web.getUrl())))return;String encoded=JSONObject.quote(message.toString());web.evaluateJavascript("window.__vedatorNativeReceive&&window.__vedatorNativeReceive(JSON.parse("+encoded+"));",null);}
    private void notice(String text){runOnUiThread(()->{Toast.makeText(this,text,Toast.LENGTH_LONG).show();JSONObject out=new JSONObject();Store.set(out,"kind","message");Store.set(out,"text",text);emit(out);});}
    private void openExternal(Uri uri){if(!Arrays.asList("https","http","mailto").contains(uri.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){notice("Odkaz nelze otevřít.");}}
    private void downloadMp3(int number){JSONObject episode=catalog.episode(number);if(episode==null||!Catalog.validAudio(episode.optString("enclosure")))return;try{DownloadManager manager=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);manager.enqueue(new DownloadManager.Request(Uri.parse(episode.optString("enclosure"))).setTitle(catalog.title(episode)).setMimeType("audio/mpeg").setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED).setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,"Vedator-"+number+".mp3"));notice("MP3 se stahuje do složky Stažené soubory.");}catch(Exception e){notice("Stažení se nezdařilo: "+e.getMessage());}}
    private void export(String json)throws Exception{
        if(json.length()>3_000_000||!new JSONObject(json).optString("app").equals("vedator"))throw new IllegalArgumentException("Neplatná záloha");
        File file=new File(getCacheDir(),"exports/vedator-zaloha.json");Net.write(file,json.getBytes(StandardCharsets.UTF_8));Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",file);
        startActivity(Intent.createChooser(new Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION),"Uložit nebo sdílet zálohu"));
    }
    private void showMenu(View anchor){PopupMenu menu=new PopupMenu(this,anchor);menu.getMenu().add("Obnovit rozhraní");menu.getMenu().add("Zkontrolovat aktualizaci APK");menu.getMenu().add("Android Auto – jak spustit");menu.getMenu().add("O aplikaci");menu.setOnMenuItemClickListener(item->{switch(item.getTitle().toString()){
        case "Obnovit rozhraní":web.reload();break;
        case "Zkontrolovat aktualizaci APK":new Updater(this,io).check();break;
        case "Android Auto – jak spustit":new AlertDialog.Builder(this).setTitle("Android Auto").setMessage("Otevři Vedátora alespoň jednou v telefonu.\n\nU této APK mimo Google Play může být potřeba v Android Auto zapnout režim pro vývojáře a v něm Neznámé zdroje. Potom telefon znovu připoj k autu.\n\nV autě najdeš nové díly, rozposlouchané epizody, série, playlisty a stažené díly. Ověření přímo v autě je ještě potřeba.").setPositiveButton("OK",null).show();break;
        default:new AlertDialog.Builder(this).setTitle("Vedátor 0.1.0").setMessage("První testovací APK.\n\nObsah a webové rozhraní se načítají z bernio.cz. Zvuk přehrává Android Media3, i na pozadí.\n\nData této aplikace jsou oddělená od prohlížeče. Přeneseš je přes Moje data → záloha.\n\nNová verze APK zachová zde uložená data.").setPositiveButton("OK",null).show();
        }return true;});menu.show();}
    @Override protected void onResume(){super.onResume();resumed=true;if(web!=null)web.onResume();if(pageReady&&controller!=null)sendData("data",null);}
    @Override protected void onPause(){resumed=false;if(web!=null)web.onPause();super.onPause();}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else moveTaskToBack(true);}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==11&&chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);chooser=null;}}
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(chooser!=null)chooser.onReceiveValue(null);if(controllerFuture!=null)MediaController.releaseFuture(controllerFuture);if(web!=null){web.stopLoading();web.destroy();}io.shutdownNow();super.onDestroy();}
}
