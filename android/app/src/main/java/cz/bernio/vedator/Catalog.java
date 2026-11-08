package cz.bernio.vedator;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import androidx.media3.common.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

final class Catalog {
    final Context context;
    final Store store;
    private volatile JSONObject data;
    Catalog(Context context,Store store){
        this.context=context;this.store=store;
        try {File f=new File(context.getFilesDir(),"catalog.json");data=new JSONObject(new String(f.isFile()?java.nio.file.Files.readAllBytes(f.toPath()):Net.asset(context,"web/content-v2.json"),StandardCharsets.UTF_8));}
        catch(Exception e){data=new JSONObject();}
    }
    void refresh()throws Exception{
        byte[] bytes=Net.get("https://bernio.cz/vedator/content-v2.json",25_000_000);
        JSONObject next=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
        JSONArray episodes=next.getJSONArray("episodes");if(episodes.length()<1)throw new IOException("Prázdný katalog");
        HashSet<Integer> ids=new HashSet<>();for(int i=0;i<episodes.length();i++){JSONObject e=episodes.getJSONObject(i);if(e.optInt("number")<=0||!ids.add(e.getInt("number"))||!validAudio(e.optString("enclosure")))throw new IOException("Neplatná epizoda");}
        Net.write(new File(context.getFilesDir(),"catalog.json"),bytes);data=next;
    }
    static boolean validAudio(String value){try{Uri uri=Uri.parse(value);String host=uri.getHost();return "https".equals(uri.getScheme())&&host!=null&&(host.equals("podbean.com")||host.endsWith(".podbean.com"));}catch(Exception e){return false;}}
    JSONObject episode(int number){JSONArray list=data.optJSONArray("episodes");if(list!=null)for(int i=0;i<list.length();i++){JSONObject e=list.optJSONObject(i);if(e!=null&&e.optInt("number")==number)return e;}return null;}
    String title(JSONObject episode){JSONObject langs=episode.optJSONObject("i18n"),lang=langs==null?null:langs.optJSONObject(store.get("vedator-ui-language-v1","cz").equals("sk")?"sk":"cs");return lang==null?episode.optString("title"):lang.optString("title",episode.optString("title"));}
    MediaItem folder(String id,String title){return new MediaItem.Builder().setMediaId(id).setMediaMetadata(new MediaMetadata.Builder().setTitle(title).setIsBrowsable(true).setIsPlayable(false).setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED).build()).build();}
    JSONObject entry(int number,double start,String ref,String id){JSONObject out=new JSONObject();Store.set(out,"number",number);Store.set(out,"start",Math.max(0,start));Store.set(out,"ref",ref);Store.set(out,"id",id);return out;}
    MediaItem playable(JSONObject entry){
        JSONObject e=episode(entry.optInt("number"));if(e==null)throw new IllegalArgumentException("Epizoda nebyla nalezena");
        String uri=e.optString("enclosure");if(!validAudio(uri))throw new IllegalArgumentException("Neplatná adresa audia");
        String offline=Downloads.completedPath(context,store,e.optInt("number"));if(offline!=null)uri=Uri.fromFile(new File(offline)).toString();
        Bundle extras=new Bundle();extras.putInt("number",e.optInt("number"));extras.putDouble("start",entry.optDouble("start"));extras.putString("entry",entry.toString());
        return new MediaItem.Builder().setMediaId("episode:"+e.optInt("number")+":"+entry.optDouble("start"))
            .setUri(uri).setMimeType(MimeTypes.AUDIO_MPEG)
            .setMediaMetadata(new MediaMetadata.Builder().setTitle(title(e)).setArtist("Vedátorský podcast").setAlbumTitle("Vedátor")
            .setIsPlayable(true).setIsBrowsable(false).setMediaType(MediaMetadata.MEDIA_TYPE_PODCAST_EPISODE).setExtras(extras).build()).build();
    }
    List<MediaItem> children(String id){
        List<MediaItem> out=new ArrayList<>();
        if(id.equals("root")){out.add(folder("recent","Nové epizody"));out.add(folder("continue","Rozposlouchané"));out.add(folder("series","Série a témata"));out.add(folder("playlists","Moje playlisty"));out.add(folder("offline","Stažené epizody"));return out;}
        JSONArray episodes=data.optJSONArray("episodes");
        if(id.equals("recent")||id.equals("continue")||id.equals("offline")){
            JSONObject progress=Store.object(store.get(Store.PROGRESS,"{}"));
            if(episodes!=null)for(int i=0;i<episodes.length();i++){
                JSONObject e=episodes.optJSONObject(i);if(e==null)continue;int number=e.optInt("number");JSONObject saved=progress.optJSONObject("episode-"+number);
                if(id.equals("continue")&&(saved==null||saved.optBoolean("completed")||saved.optDouble("currentTime")<=10))continue;
                if(id.equals("offline")&&Downloads.completedPath(context,store,number)==null)continue;
                out.add(playable(entry(number,0,"","episode:"+number)));if(id.equals("recent")&&out.size()>=100)break;
            }return out;
        }
        if(id.equals("series")||id.startsWith("series:")){
            JSONArray list=data.optJSONArray("series");if(list==null)return out;
            if(id.equals("series")){for(int i=0;i<list.length();i++)out.add(folder("series:"+i,list.optJSONObject(i).optString("name")));}
            else{int index=Integer.parseInt(id.substring(7));JSONObject series=list.optJSONObject(index);JSONArray numbers=series==null?null:series.optJSONArray("episodes");if(numbers!=null)for(int i=0;i<numbers.length();i++)if(episode(numbers.optInt(i))!=null){JSONObject item=entry(numbers.optInt(i),0,"","episode:"+numbers.optInt(i));Store.set(item,"parent",id);out.add(playable(item));}}
            return out;
        }
        JSONArray playlists=Store.array(store.get(Store.PLAYLISTS,"[]"));
        if(id.equals("playlists")){for(int i=0;i<playlists.length();i++){JSONObject p=playlists.optJSONObject(i);if(p!=null)out.add(folder("playlist:"+p.optString("id"),p.optString("name","Playlist")));}return out;}
        if(id.startsWith("playlist:"))for(int i=0;i<playlists.length();i++){
            JSONObject p=playlists.optJSONObject(i);if(p==null||!id.substring(9).equals(p.optString("id")))continue;
            JSONArray refs=p.optJSONArray("items");if(refs!=null)for(int j=0;j<refs.length();j++){JSONObject entry=fromRef(refs.optString(j));if(entry!=null){Store.set(entry,"parent",id);out.add(playable(entry));}}break;
        }
        return out;
    }
    JSONObject fromRef(String ref){
        int code=decodeRef(ref);if(code<0)return null;if(code<2048)return episode(code)==null?null:entry(code,0,ref,"ref:"+ref);
        // Same legacy question ordering as the web catalog; append new episodes afterwards.
        int[] legacy={340,337,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,133,128,119,112,100,89,82,17,26,35,51,60,69,75,138,346};
        JSONArray questions=data.optJSONArray("questions");if(questions==null)return null;
        List<JSONObject> ordered=new ArrayList<>();for(int number:legacy){List<JSONObject> group=new ArrayList<>();for(int i=0;i<questions.length();i++){JSONObject q=questions.optJSONObject(i);if(q!=null&&q.optInt("episode")==number)group.add(q);}group.sort(Comparator.comparingInt(q->q.optInt("order")));ordered.addAll(group);}
        int index=code-2048;if(index>=ordered.size())return null;JSONObject q=ordered.get(index);return episode(q.optInt("episode"))==null?null:entry(q.optInt("episode"),q.optDouble("seconds"),ref,"ref:"+ref);
    }
    static int decodeRef(String ref){String alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";if(ref==null||ref.length()!=2)return-1;int a=alphabet.indexOf(ref.charAt(0)),b=alphabet.indexOf(ref.charAt(1));return a<0||b<0?-1:(a<<6)|b;}
}
