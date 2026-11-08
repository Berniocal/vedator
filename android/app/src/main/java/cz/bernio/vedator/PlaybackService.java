package cz.bernio.vedator;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.*;
import androidx.annotation.NonNull;
import androidx.media3.common.*;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.*;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.session.*;
import androidx.media3.session.MediaLibraryService.MediaLibrarySession;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.*;
import org.json.*;
import java.util.*;
import java.util.concurrent.*;

@UnstableApi
public class PlaybackService extends MediaLibraryService {
    static final String COMMAND="cz.bernio.vedator.CONTROL";
    private MediaLibrarySession session;
    private ExoPlayer player;
    private Store store;
    private Catalog catalog;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private JSONObject queue=new JSONObject();
    private String error="";
    private long lastSave=0;
    private int lastIndex=-1;
    private boolean settingQueue=false;
    private final Runnable tick=new Runnable(){public void run(){if(player!=null){if(System.currentTimeMillis()-lastSave>=5000)save(false);handler.postDelayed(this,1000);}}};

    @Override public void onCreate(){
        super.onCreate();store=new Store(this);catalog=new Catalog(this,store);
        DefaultHttpDataSource.Factory http=new DefaultHttpDataSource.Factory().setUserAgent("VedatorAndroid/0.1").setAllowCrossProtocolRedirects(false).setConnectTimeoutMs(10000).setReadTimeoutMs(15000);
        androidx.media3.datasource.DefaultDataSource.Factory source=new androidx.media3.datasource.DefaultDataSource.Factory(this,http);
        player=new ExoPlayer.Builder(this).setMediaSourceFactory(new DefaultMediaSourceFactory(source,new IndexedExtractors(this))).setLoadControl(new DefaultLoadControl.Builder().setBufferDurationsMs(15000,90000,800,1500).build())
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),true).setHandleAudioBecomingNoisy(true).setWakeMode(C.WAKE_MODE_NETWORK).setSeekBackIncrementMs(10000).setSeekForwardIncrementMs(10000).build();
        player.addListener(new Player.Listener(){
            @Override public void onPlayerError(@NonNull PlaybackException e){error="Přehrávání se nezdařilo. Zkus znovu Přehrát. ("+e.getErrorCodeName()+")";save(false);}
            @Override public void onPlaybackStateChanged(int state){if(state==Player.STATE_ENDED)save(true);}
            @Override public void onIsPlayingChanged(boolean playing){save(false);}
            @Override public void onPositionDiscontinuity(@NonNull Player.PositionInfo old,@NonNull Player.PositionInfo next,int reason){
                if(!settingQueue&&old.mediaItemIndex!=next.mediaItemIndex){saveAt(old.mediaItemIndex,old.positionMs,old.mediaItem,reason==Player.DISCONTINUITY_REASON_AUTO_TRANSITION);lastIndex=next.mediaItemIndex;}
            }
            @Override public void onMediaItemTransition(MediaItem item,int reason){
                if(settingQueue||item==null)return;
                lastIndex=player.getCurrentMediaItemIndex();
                double start=item.mediaMetadata.extras==null?0:item.mediaMetadata.extras.getDouble("start",0);
                if(start>0)player.seekTo((long)(start*1000));save(false);
            }
        });
        PendingIntent activity=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        session=new MediaLibrarySession.Builder(this,player,new LibraryCallback()).setSessionActivity(activity).build();
        JSONObject saved=Store.object(store.get("nativeQueue","{}"));if(saved.optJSONArray("items")!=null)try{setQueue(saved,false);}catch(Exception ignored){}
        handler.post(tick);
        io.execute(()->{try{catalog.refresh();}catch(Exception ignored){}});
    }
    @Override public MediaLibrarySession onGetSession(@NonNull MediaSession.ControllerInfo controller){return session;}
    @Override public void onTaskRemoved(Intent rootIntent){if(!player.getPlayWhenReady())stopSelf();}
    @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);save(false);if(session!=null)session.release();if(player!=null)player.release();io.shutdownNow();super.onDestroy();}

    private void setQueue(JSONObject request,boolean autoplay)throws Exception{
        JSONArray entries=request.getJSONArray("items");if(entries.length()==0||entries.length()>600)throw new IllegalArgumentException("Neplatný playlist");
        List<MediaItem> items=new ArrayList<>();for(int i=0;i<entries.length();i++)items.add(catalog.playable(entries.getJSONObject(i)));
        int index=Math.max(0,Math.min(entries.length()-1,request.optInt("index")));
        double start=Math.max(0,request.optDouble("position",entries.getJSONObject(index).optDouble("start")));
        save(false);settingQueue=true;
        try{queue=new JSONObject(request.toString());error="";lastIndex=index;player.setMediaItems(items,index,(long)(start*1000));player.setPlaybackSpeed((float)Math.max(.5,Math.min(3,request.optDouble("speed",1))));player.prepare();player.setPlayWhenReady(autoplay);}
        finally{settingQueue=false;}
        save(false);
    }
    private void save(boolean ended){if(player==null||settingQueue)return;saveAt(player.getCurrentMediaItemIndex(),player.getCurrentPosition(),player.getCurrentMediaItem(),ended);}
    private void saveAt(int index,long position,MediaItem item,boolean ended){
        if(item==null||item.mediaMetadata.extras==null)return;
        lastSave=System.currentTimeMillis();int number=item.mediaMetadata.extras.getInt("number");if(number<=0)return;
        double duration=player.getDuration()>0?player.getDuration()/1000.0:0;
        // On transitions the player already reports the next duration: use the stored old duration.
        JSONObject all=Store.object(store.get(Store.PROGRESS,"{}")),previous=all.optJSONObject("episode-"+number);if(previous==null)previous=new JSONObject();
        if(index!=player.getCurrentMediaItemIndex())duration=previous.optDouble("duration",0);
        double time=ended&&duration>0?duration:Math.max(0,position/1000.0);
        if(duration<=0&&player.getPlaybackState()!=Player.STATE_READY&&!ended)return;
        JSONObject record=new JSONObject();boolean completed=previous.optBoolean("completed")||ended||(duration>0&&(time/duration>=.9||duration-time<=120));
        Store.set(record,"currentTime",time);Store.set(record,"duration",duration);Store.set(record,"completed",completed);Store.set(record,"replaying",previous.optBoolean("completed")&&!ended);Store.set(record,"title",item.mediaMetadata.title);Store.set(record,"updatedAt",lastSave);Store.set(all,"episode-"+number,record);store.put(Store.PROGRESS,all.toString());
        JSONArray entries=queue.optJSONArray("items");JSONObject entry=entries==null?null:entries.optJSONObject(index),context=queue.optJSONObject("context");
        if(entry!=null&&context!=null){String type=context.optString("type");if(type.equals("series")||type.equals("playlist")){
            JSONObject collections=Store.object(store.get(Store.COLLECTION,"{}")),collection=collections.optJSONObject(context.optString("id"));if(collection==null)collection=new JSONObject();JSONObject records=collection.optJSONObject("items");if(records==null)records=new JSONObject();
            JSONObject cr=Store.object(record.toString());Store.set(cr,"start",entry.optDouble("start"));Store.set(cr,"percent",completed?100:duration>entry.optDouble("start")?Math.max(0,(time-entry.optDouble("start"))/(duration-entry.optDouble("start"))*100):0);Store.set(records,entry.optString("id"),cr);Store.set(collection,"items",records);Store.set(collection,"type",type);Store.set(collection,"label",context.optString("label"));Store.set(collection,"lastItemId",entry.optString("id"));Store.set(collection,"updatedAt",lastSave);Store.set(collections,context.optString("id"),collection);store.put(Store.COLLECTION,collections.toString());
        }}
        if(entry!=null){JSONObject last=new JSONObject();Store.set(last,"version",1);Store.set(last,"episode",number);Store.set(last,"time",time);Store.set(last,"itemRef",entry.optString("ref"));Store.set(last,"updatedAt",lastSave);
            if(context!=null){JSONObject snapshot=Store.object(context.toString());JSONArray compact=new JSONArray();for(int i=0;i<entries.length();i++){JSONObject e=entries.optJSONObject(i),c=new JSONObject();Store.set(c,"n",e.optInt("number"));Store.set(c,"s",e.optDouble("start"));Store.set(c,"r",e.optString("ref"));Store.set(c,"i",e.optString("id"));compact.put(c);}Store.set(snapshot,"items",compact);Store.set(snapshot,"index",index);Store.set(last,"context",snapshot);}store.put(Store.LAST,last.toString());}
        if(index==player.getCurrentMediaItemIndex()){Store.set(queue,"index",index);Store.set(queue,"position",time);Store.set(queue,"speed",player.getPlaybackParameters().speed);store.put("nativeQueue",queue.toString());}
    }
    JSONObject snapshot(){
        JSONObject out=new JSONObject();Store.set(out,"queue",queue);Store.set(out,"index",player.getCurrentMediaItemIndex());Store.set(out,"time",player.getCurrentPosition()/1000.0);Store.set(out,"duration",player.getDuration()>0?player.getDuration()/1000.0:0);Store.set(out,"playing",player.getPlayWhenReady()&&player.getPlaybackState()!=Player.STATE_ENDED);Store.set(out,"ready",player.getPlaybackState()==Player.STATE_READY||player.getPlaybackState()==Player.STATE_ENDED);Store.set(out,"buffering",player.getPlaybackState()==Player.STATE_BUFFERING);Store.set(out,"ended",player.getPlaybackState()==Player.STATE_ENDED);Store.set(out,"speed",player.getPlaybackParameters().speed);Store.set(out,"error",error);return out;
    }
    private final class LibraryCallback implements MediaLibrarySession.Callback {
        @Override public MediaSession.ConnectionResult onConnect(@NonNull MediaSession s,@NonNull MediaSession.ControllerInfo c){
            MediaSession.ConnectionResult result=MediaLibrarySession.Callback.super.onConnect(s,c);
            if(c.getUid()!=android.os.Process.myUid())return result;
            return new MediaSession.ConnectionResult.AcceptedResultBuilder(s).setAvailableSessionCommands(result.availableSessionCommands.buildUpon().add(new SessionCommand(COMMAND,Bundle.EMPTY)).build()).build();
        }
        @Override public ListenableFuture<SessionResult> onCustomCommand(@NonNull MediaSession s,@NonNull MediaSession.ControllerInfo c,@NonNull SessionCommand command,@NonNull Bundle args){
            if(!command.customAction.equals(COMMAND)||c.getUid()!=android.os.Process.myUid())return Futures.immediateFuture(new SessionResult(SessionResult.RESULT_ERROR_PERMISSION_DENIED));
            try{
                JSONObject request=new JSONObject(args.getString("json","{}"));String action=request.optString("action");
                switch(action){
                    case "queue":setQueue(request,request.optBoolean("autoplay",true));break;
                    case "play":error="";if(player.getPlayerError()!=null)player.prepare();if(player.getPlaybackState()==Player.STATE_ENDED)player.seekTo(player.getCurrentMediaItemIndex(),0);player.play();break;
                    case "pause":player.pause();save(false);break;
                    case "seek":player.seekTo((long)(Math.max(0,request.optDouble("time"))*1000));save(false);break;
                    case "navigate":{int next=player.getCurrentMediaItemIndex()+request.optInt("delta");if(next>=0&&next<player.getMediaItemCount()){save(false);player.seekTo(next,0);player.play();}break;}
                    case "speed":player.setPlaybackSpeed((float)Math.max(.5,Math.min(3,request.optDouble("speed",1))));save(false);break;
                    case "stop":save(false);player.stop();player.clearMediaItems();queue=new JSONObject();store.put("nativeQueue","{}");break;
                    case "replaceStorage":case "clear":
                        player.stop();player.clearMediaItems();queue=new JSONObject();if(action.equals("clear"))Downloads.clear(PlaybackService.this,store);store.clearUser();
                        if(action.equals("replaceStorage")&&request.optJSONObject("values")!=null)store.mergeWeb(request.getJSONObject("values"));break;
                    case "snapshot":break;
                    default:throw new IllegalArgumentException("Neznámý příkaz");
                }
                Bundle result=new Bundle();result.putString("json",snapshot().toString());return Futures.immediateFuture(new SessionResult(SessionResult.RESULT_SUCCESS,result));
            }catch(Exception e){Bundle result=new Bundle();result.putString("error",e.getMessage());return Futures.immediateFuture(new SessionResult(SessionResult.RESULT_ERROR_BAD_VALUE,result));}
        }
        @Override public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(@NonNull MediaLibrarySession s,@NonNull MediaSession.ControllerInfo c,LibraryParams params){return Futures.immediateFuture(LibraryResult.ofItem(catalog.folder("root","Vedátor"),params));}
        @Override public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(@NonNull MediaLibrarySession s,@NonNull MediaSession.ControllerInfo c,@NonNull String parent,int page,int pageSize,LibraryParams params){
            try{return Futures.immediateFuture(LibraryResult.ofItemList(catalog.children(parent),params));}catch(Exception e){return Futures.immediateFuture(LibraryResult.ofError(SessionResult.RESULT_ERROR_BAD_VALUE));}
        }
        @Override public ListenableFuture<LibraryResult<MediaItem>> onGetItem(@NonNull MediaLibrarySession s,@NonNull MediaSession.ControllerInfo c,@NonNull String id){try{return Futures.immediateFuture(LibraryResult.ofItem(resolve(id),null));}catch(Exception e){return Futures.immediateFuture(LibraryResult.ofError(SessionResult.RESULT_ERROR_BAD_VALUE));}}
        private MediaItem resolve(String id){if(id.startsWith("episode:")){String[] bits=id.split(":");return catalog.playable(catalog.entry(Integer.parseInt(bits[1]),bits.length>2?Double.parseDouble(bits[2]):0,"",id));}return catalog.folder(id,id);}
        @Override public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onSetMediaItems(@NonNull MediaSession s,@NonNull MediaSession.ControllerInfo c,@NonNull List<MediaItem> requested,int startIndex,long startPosition){
            try{
                if(requested.isEmpty())return Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(Collections.emptyList(),0,0));
                MediaItem first=requested.get(Math.max(0,Math.min(requested.size()-1,startIndex)));MediaItem resolved=resolve(first.mediaId);List<MediaItem> items=new ArrayList<>();int index=0;
                Bundle extras=first.mediaMetadata.extras;JSONObject entry=extras==null?null:Store.object(extras.getString("entry","{}"));String parent=entry==null?"":entry.optString("parent");
                if(!parent.isEmpty()){items.addAll(catalog.children(parent));for(int i=0;i<items.size();i++)if(items.get(i).mediaId.equals(resolved.mediaId)){index=i;break;}}
                else if(requested.size()==1){items.addAll(catalog.children("recent"));index=-1;for(int i=0;i<items.size();i++)if(items.get(i).mediaId.equals(resolved.mediaId)){index=i;break;}if(index<0){items.clear();items.add(resolved);index=0;}}
                else for(MediaItem item:requested)items.add(resolve(item.mediaId));
                JSONArray entries=new JSONArray();for(MediaItem item:items)entries.put(Store.object(item.mediaMetadata.extras.getString("entry","{}")));queue=new JSONObject();Store.set(queue,"items",entries);Store.set(queue,"token","car-"+System.currentTimeMillis());JSONObject context=new JSONObject();Store.set(context,"type","episodes");Store.set(context,"id",parent.isEmpty()?"car:recent":parent);Store.set(context,"label","Android Auto");Store.set(queue,"context",context);
                JSONObject saved=Store.object(store.get(Store.PROGRESS,"{}")).optJSONObject("episode-"+resolved.mediaMetadata.extras.getInt("number"));long position=startPosition==C.TIME_UNSET?0:startPosition;
                if(position==0&&saved!=null&&!saved.optBoolean("completed"))position=(long)(saved.optDouble("currentTime")*1000);
                return Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(items,index,position));
            }catch(Exception e){return Futures.immediateFailedFuture(e);}
        }
    }
}
