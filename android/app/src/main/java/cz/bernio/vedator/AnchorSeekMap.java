package cz.bernio.vedator;

import androidx.media3.common.util.UnstableApi;
import androidx.media3.extractor.*;
import org.json.*;

/** Exact MP3 frame anchors shared with the web player; no prefix scan on a distant seek. */
@UnstableApi
final class AnchorSeekMap implements SeekMap {
    final long size,durationUs;
    final long[] positions,times;
    AnchorSeekMap(JSONObject value)throws JSONException{
        size=value.getLong("size");durationUs=Math.round(value.getDouble("duration")*1_000_000);
        JSONArray anchors=value.getJSONArray("anchors");if(size<=0||durationUs<=0||anchors.length()<2)throw new JSONException("Invalid seek map");
        positions=new long[anchors.length()];times=new long[anchors.length()];
        for(int i=0;i<anchors.length();i++){positions[i]=anchors.getJSONArray(i).getLong(0);times[i]=Math.round(anchors.getJSONArray(i).getDouble(1)*1_000_000);if(positions[i]<0||positions[i]>=size||times[i]<0||(i>0&&(positions[i]<=positions[i-1]||times[i]<=times[i-1])))throw new JSONException("Unsorted seek map");}
    }
    static int floor(long[] values,long value){int lo=0,hi=values.length-1;while(lo<hi){int mid=(lo+hi+1)>>>1;if(values[mid]<=value)lo=mid;else hi=mid-1;}return lo;}
    long timeAt(long position){return times[floor(positions,position)];}
    @Override public boolean isSeekable(){return true;}
    @Override public long getDurationUs(){return durationUs;}
    @Override public SeekPoints getSeekPoints(long timeUs){int i=floor(times,timeUs);SeekPoint first=new SeekPoint(times[i],positions[i]);return i<times.length-1?new SeekPoints(first,new SeekPoint(times[i+1],positions[i+1])):new SeekPoints(first);}
}
