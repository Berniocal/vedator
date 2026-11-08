package cz.bernio.vedator;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import org.json.*;
import java.io.File;
import java.util.Iterator;

final class Downloads {
    private static final String KEY="downloads";
    static String completedPath(Context context,Store store,int number){
        JSONObject entry=Store.object(store.get(KEY,"{}")).optJSONObject(""+number);if(entry==null)return null;
        DownloadManager manager=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        try(Cursor c=manager.query(new DownloadManager.Query().setFilterById(entry.optLong("downloadId")))){
            if(c!=null&&c.moveToFirst()&&c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))==DownloadManager.STATUS_SUCCESSFUL){File file=new File(entry.optString("path"));if(file.isFile()&&file.length()>0)return file.getAbsolutePath();}
        }catch(Exception ignored){}return null;
    }
    static synchronized String toggle(Context context,Store store,Catalog catalog,int number){
        JSONObject all=Store.object(store.get(KEY,"{}")),entry=all.optJSONObject(""+number);
        DownloadManager manager=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        if(entry!=null){manager.remove(entry.optLong("downloadId"));all.remove(""+number);store.put(KEY,all.toString());return "Offline kopie byla odstraněna.";}
        JSONObject episode=catalog.episode(number);if(episode==null||!Catalog.validAudio(episode.optString("enclosure")))throw new IllegalArgumentException("Epizoda není dostupná");
        File dir=context.getExternalFilesDir(Environment.DIRECTORY_PODCASTS);if(dir==null)throw new IllegalStateException("Úložiště není dostupné");
        File file=new File(dir,"episode-"+number+".mp3");if(file.exists()&&!file.delete())throw new IllegalStateException("Nelze přepsat offline kopii");
        DownloadManager.Request request=new DownloadManager.Request(Uri.parse(episode.optString("enclosure"))).setTitle("Vedátor – "+catalog.title(episode)).setMimeType("audio/mpeg")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED).setDestinationUri(Uri.fromFile(file));
        long id=manager.enqueue(request);entry=new JSONObject();Store.set(entry,"path",file.getAbsolutePath());Store.set(entry,"downloadId",id);Store.set(all,""+number,entry);store.put(KEY,all.toString());return "Stahuji epizodu pro offline poslech…";
    }
    static JSONObject state(Context context,Store store){
        JSONObject all=Store.object(store.get(KEY,"{}")),out=new JSONObject();Iterator<String> keys=all.keys();
        DownloadManager manager=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        while(keys.hasNext()){
            String key=keys.next();JSONObject entry=all.optJSONObject(key);if(entry==null)continue;JSONObject status=new JSONObject();
            try(Cursor c=manager.query(new DownloadManager.Query().setFilterById(entry.optLong("downloadId")))){if(c!=null&&c.moveToFirst()){
                int code=c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));Store.set(status,"ready",code==DownloadManager.STATUS_SUCCESSFUL&&new File(entry.optString("path")).isFile());
                Store.set(status,"failed",code==DownloadManager.STATUS_FAILED);Store.set(status,"bytes",c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)));
                Store.set(status,"total",c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)));Store.set(out,"episode-"+key,status);
            }}catch(Exception ignored){}
        }return out;
    }
    static void clear(Context context,Store store){JSONObject all=Store.object(store.get(KEY,"{}"));Iterator<String> keys=all.keys();DownloadManager manager=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);while(keys.hasNext()){JSONObject e=all.optJSONObject(keys.next());if(e!=null)manager.remove(e.optLong("downloadId"));}store.put(KEY,"{}");}
}
