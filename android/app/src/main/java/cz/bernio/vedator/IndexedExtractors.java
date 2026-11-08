package cz.bernio.vedator;

import android.content.Context;
import android.net.Uri;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.extractor.*;
import androidx.media3.extractor.mp3.Mp3Extractor;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@UnstableApi
final class IndexedExtractors implements ExtractorsFactory {
    private final Context context;
    private final DefaultExtractorsFactory defaults=new DefaultExtractorsFactory();
    IndexedExtractors(Context context){this.context=context;}
    @Override public Extractor[] createExtractors(){return defaults.createExtractors();}
    @Override public Extractor[] createExtractors(Uri uri,Map<String,List<String>> headers){
        Extractor[] extractors=defaults.createExtractors(uri,headers);AnchorSeekMap index=find(uri);
        if(index!=null)for(int i=0;i<extractors.length;i++)if(extractors[i] instanceof Mp3Extractor)extractors[i]=new IndexedMp3(extractors[i],index);
        return extractors;
    }
    private AnchorSeekMap find(Uri uri){
        try{
            if(BuildConfig.DEBUG&&"file".equals(uri.getScheme())&&"test-tone.mp3".equals(uri.getLastPathSegment())){File testIndex=new File(context.getCacheDir(),"test-tone-index.json");if(testIndex.isFile())return new AnchorSeekMap(new JSONObject(new String(java.nio.file.Files.readAllBytes(testIndex.toPath()),StandardCharsets.UTF_8)));}
            File cached=new File(context.getFilesDir(),"web/audio-seek-index.json");byte[] bytes=cached.isFile()?java.nio.file.Files.readAllBytes(cached.toPath()):Net.asset(context,"web/audio-seek-index.json");
            JSONObject entries=new JSONObject(new String(bytes,StandardCharsets.UTF_8)).getJSONObject("entries"),entry=entries.optJSONObject(uri.toString());
            if(entry==null&&"file".equals(uri.getScheme())&&"episode-9.mp3".equals(uri.getLastPathSegment()))entry=entries.optJSONObject("https://mcdn.podbean.com/mf/web/4mbanm/podcast_ep9.mp3");
            return entry==null?null:new AnchorSeekMap(entry);
        }catch(Exception e){return null;}
    }
    static final class IndexedMp3 implements Extractor {
        private final Extractor delegate;
        private final AnchorSeekMap index;
        private boolean active=false,awaitingTimestamp=false;
        private long anchorTime=0,timeOffset=0;
        IndexedMp3(Extractor delegate,AnchorSeekMap index){this.delegate=delegate;this.index=index;}
        @Override public boolean sniff(ExtractorInput input)throws IOException{return delegate.sniff(input);}
        @Override public void init(ExtractorOutput output){delegate.init(new ExtractorOutput(){
            @Override public TrackOutput track(int id,int type){return new ForwardingTrackOutput(output.track(id,type)){
                @Override public void durationUs(long duration){super.durationUs(active?index.durationUs:duration);}
                @Override public void sampleMetadata(long timeUs,int flags,int size,int offset,CryptoData crypto){if(active&&awaitingTimestamp){timeOffset=anchorTime-timeUs;awaitingTimestamp=false;}super.sampleMetadata(timeUs+(active?timeOffset:0),flags,size,offset,crypto);}
            };}
            @Override public void endTracks(){output.endTracks();}
            @Override public void seekMap(SeekMap map){output.seekMap(active?index:map);}
        });}
        @Override public int read(ExtractorInput input,PositionHolder holder)throws IOException{active=input.getLength()==index.size;return delegate.read(input,holder);}
        @Override public void seek(long position,long timeUs){if(active){anchorTime=index.timeAt(position);awaitingTimestamp=true;}delegate.seek(position,timeUs);}
        @Override public void release(){delegate.release();}
    }
}
