package cz.bernio.vedator;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.util.Iterator;

/** Shared between the car service and the phone UI. Never depends on a running WebView. */
final class Store {
    static final String PROGRESS="vedatorPlaybackProgressV1", COLLECTION="vedatorCollectionProgressV1";
    static final String PLAYLISTS="vedator-user-playlists-v1", LAST="vedatorLastPlaybackV1";
    private final SharedPreferences prefs;
    Store(Context context) { prefs=context.getSharedPreferences("vedator",Context.MODE_PRIVATE); }
    synchronized String get(String key,String fallback){return prefs.getString(key,fallback);}
    synchronized void put(String key,String value){prefs.edit().putString(key,value).apply();}
    synchronized void clearUser(){SharedPreferences.Editor edit=prefs.edit();for(String key:prefs.getAll().keySet())if(key.startsWith("vedator")||key.equals("nativeQueue"))edit.remove(key);edit.apply();}
    static JSONObject object(String value){try{return new JSONObject(value);}catch(Exception e){return new JSONObject();}}
    static JSONArray array(String value){try{return new JSONArray(value);}catch(Exception e){return new JSONArray();}}
    static void set(JSONObject o,String key,Object value){try{o.put(key,value);}catch(JSONException e){throw new IllegalArgumentException(e);}}
    synchronized JSONObject webData(){
        JSONObject out=new JSONObject();
        for(java.util.Map.Entry<String,?> entry:prefs.getAll().entrySet()) if(entry.getKey().startsWith("vedator"))set(out,entry.getKey(),entry.getValue());
        return out;
    }
    synchronized void mergeWeb(JSONObject values){
        Iterator<String> keys=values.keys();
        while(keys.hasNext()){
            String key=keys.next();if(!key.startsWith("vedator")||key.length()>120)continue;
            String value=values.optString(key,"");if(value.length()>2_000_000)continue;
            if(key.equals(PROGRESS)||key.equals(COLLECTION)){
                JSONObject old=object(get(key,"{}")),incoming=object(value);
                Iterator<String> ids=incoming.keys();while(ids.hasNext()){
                    String id=ids.next();JSONObject next=incoming.optJSONObject(id),prev=old.optJSONObject(id);
                    if(next!=null&&(prev==null||next.optLong("updatedAt")>=prev.optLong("updatedAt")))set(old,id,next);
                }
                put(key,old.toString());
            }else if(key.equals(LAST)){
                if(object(value).optLong("updatedAt")>=object(get(key,"{}")).optLong("updatedAt"))put(key,value);
            }else put(key,value);
        }
    }
}
