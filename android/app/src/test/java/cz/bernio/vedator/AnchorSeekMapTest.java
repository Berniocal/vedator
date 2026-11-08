package cz.bernio.vedator;
import static org.junit.Assert.*;
import org.json.*;
import org.junit.Test;
public class AnchorSeekMapTest {
    @Test public void distantSeekUsesFrameBeforeTarget()throws Exception{
        AnchorSeekMap map=new AnchorSeekMap(new JSONObject("{\"size\":100000,\"duration\":40,\"anchors\":[[100,0],[40000,20],[60000,30],[80000,35]]}"));
        assertEquals(60000,map.getSeekPoints(31_000_000).first.position);assertEquals(30_000_000,map.timeAt(60000));assertEquals(40_000_000,map.getDurationUs());
        assertEquals(100,map.getSeekPoints(0).first.position);assertEquals(80000,map.getSeekPoints(Long.MAX_VALUE).first.position);
    }
    @Test public void corruptMapIsRejected(){try{new AnchorSeekMap(new JSONObject("{\"size\":100,\"duration\":4,\"anchors\":[[10,2],[5,1]]}"));fail();}catch(JSONException expected){}}
}
