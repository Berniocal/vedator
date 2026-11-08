package cz.bernio.vedator;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

final class Net {
    static byte[] get(String address,int limit) throws IOException {
        URL url=new URL(address);
        for(int n=0;n<6;n++){
            if(!url.getProtocol().equals("https"))throw new IOException("Nezabezpečená adresa");
            HttpURLConnection c=(HttpURLConnection)url.openConnection();
            c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent","VedatorAndroid/0.1");
            try{
                int status=c.getResponseCode();
                if(status>=300&&status<400){String location=c.getHeaderField("Location");if(location==null)throw new IOException("Chybí přesměrování");url=new URL(url,location);continue;}
                if(status!=200)throw new IOException("HTTP "+status);
                try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                    byte[] buffer=new byte[32768];int read;while((read=in.read(buffer))!=-1){if(out.size()+read>limit)throw new IOException("Soubor je příliš velký");out.write(buffer,0,read);}return out.toByteArray();
                }
            }finally{c.disconnect();}
        }
        throw new IOException("Příliš mnoho přesměrování");
    }
    static String text(String address,int limit)throws IOException{return new String(get(address,limit),StandardCharsets.UTF_8);}
    static byte[] asset(android.content.Context c,String path)throws IOException {try(InputStream in=c.getAssets().open(path);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}}
    static void write(File file,byte[] bytes)throws IOException{
        File parent=file.getParentFile();if(parent!=null&&!parent.exists()&&!parent.mkdirs())throw new IOException("Úložiště není dostupné");
        File temp=new File(file.getPath()+".tmp");try(FileOutputStream out=new FileOutputStream(temp)){out.write(bytes);out.getFD().sync();}if(!temp.renameTo(file))throw new IOException("Soubor nelze uložit");
    }
}
