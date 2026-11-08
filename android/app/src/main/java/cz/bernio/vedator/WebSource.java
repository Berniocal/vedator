package cz.bernio.vedator;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Cached live source with bundled offline fallback. Native adapter never affects the website. */
final class WebSource {
    private final Context context;
    private final String adapter;
    WebSource(Context context)throws IOException{this.context=context;adapter=new String(Net.asset(context,"native-adapter.js"),StandardCharsets.UTF_8);}
    static boolean trusted(Uri uri){return uri!=null&&"https".equals(uri.getScheme())&&"bernio.cz".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443)&&uri.getUserInfo()==null;}
    static String inject(String source,String adapter)throws IOException{
        String ending="\n})();";int last=source.lastIndexOf(ending);
        if(last<0||!source.contains("function openPlayback(")||!source.contains("function playbackClock(")||!source.contains("function restoreLastPlayback("))throw new IOException("Rozhraní webu není kompatibilní s touto verzí APK");
        return source.substring(0,last)+"\n"+adapter+source.substring(last);
    }
    WebResourceResponse intercept(Uri uri){
        if(!trusted(uri))return null;
        String path=uri.getPath();if(path==null||!path.startsWith("/vedator/"))return null;
        String file=path.substring("/vedator/".length());if(file.isEmpty())file="index.html";
        if(file.equals("sw.js"))return response("text/javascript","self.addEventListener('install',()=>self.skipWaiting());".getBytes(StandardCharsets.UTF_8));
        boolean handled=file.equals("index.html")||file.equals("app-v2.js")||file.equals("content-v2.json")||file.equals("audio-seek-index.json")||file.equals("icon.svg")||file.equals("manifest.webmanifest");
        if(!handled)return null;
        File cache=new File(context.getFilesDir(),"web/"+file);
        String mime=file.endsWith(".js")?"text/javascript":file.endsWith(".json")?"application/json":file.endsWith(".svg")?"image/svg+xml":file.endsWith(".webmanifest")?"application/manifest+json":"text/html";
        byte[] bytes=null;
        try{
            if(BuildConfig.DEBUG&&new Store(context).get("testOffline","").equals("1"))throw new IOException("Offline test");
            bytes=Net.get("https://bernio.cz/vedator/"+file,25_000_000);
            if(file.equals("app-v2.js"))inject(new String(bytes,StandardCharsets.UTF_8),adapter);
            if(file.equals("content-v2.json")&&new org.json.JSONObject(new String(bytes,StandardCharsets.UTF_8)).getJSONArray("episodes").length()==0)throw new IOException("Prázdný katalog");
            Net.write(cache,bytes);
        }catch(Exception e){try{bytes=cache.isFile()?java.nio.file.Files.readAllBytes(cache.toPath()):Net.asset(context,"web/"+file);}catch(Exception ignored){}}
        if(bytes==null)return new WebResourceResponse(mime,"UTF-8",503,"Offline",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
        if(file.equals("app-v2.js")){
            try{bytes=inject(new String(bytes,StandardCharsets.UTF_8),adapter).getBytes(StandardCharsets.UTF_8);}
            catch(Exception e){try{bytes=inject(new String(Net.asset(context,"web/app-v2.js"),StandardCharsets.UTF_8),adapter).getBytes(StandardCharsets.UTF_8);}catch(Exception impossible){return response(mime,"throw new Error('Aktualizujte APK Vedátor');".getBytes(StandardCharsets.UTF_8));}}
        }
        return response(mime,bytes);
    }
    private static WebResourceResponse response(String mime,byte[] bytes){WebResourceResponse result=new WebResourceResponse(mime,"UTF-8",new ByteArrayInputStream(bytes));result.setResponseHeaders(java.util.Collections.singletonMap("Cache-Control","no-store"));return result;}
}
