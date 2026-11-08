package cz.bernio.vedator;

import static org.junit.Assert.*;
import org.junit.Test;

public class WebSourceTest {
    @Test public void adapterStaysInsideMainClosure()throws Exception{
        String source="(()=>{function openPlayback(){} function playbackClock(){} function restoreLastPlayback(){}\n})();\n";
        String result=WebSource.inject(source,"window.adapterInstalled=true;");
        assertTrue(result.contains("function restoreLastPlayback(){}\nwindow.adapterInstalled=true;\n})();"));
    }
    @Test public void incompatibleWebSourceIsRejected(){
        try{WebSource.inject("window.changed=true;","adapter()");fail("Unsupported source must fail closed");}catch(java.io.IOException expected){}
    }
    @Test public void specialEpisodeReferencesKeepTheirIdentity(){assertEquals(1703,Catalog.decodeRef("an"));assertEquals(-1,Catalog.decodeRef("??"));assertEquals(9,Catalog.decodeRef("AJ"));}
}
