package cz.bernio.vedator;

import android.app.*;
import android.content.Intent;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.*;
import java.io.File;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;

final class Updater {
    private final Activity activity;
    private final ExecutorService io;
    Updater(Activity activity,ExecutorService io){this.activity=activity;this.io=io;}
    void check(){toast("Kontroluji novou verzi APK…");io.execute(()->{
        try{
            JSONObject manifest=new JSONObject(Net.text("https://raw.githubusercontent.com/Berniocal/vedator/main/android/latest.json",100000));
            int next=manifest.getInt("versionCode");if(next<=BuildConfig.VERSION_CODE){toast("Máš aktuální verzi APK "+BuildConfig.VERSION_NAME+".");return;}
            String url=manifest.getString("url"),sha=manifest.getString("sha256");Uri uri=Uri.parse(url);
            if(!"https".equals(uri.getScheme())||!"github.com".equals(uri.getHost())||!uri.getPath().startsWith("/Berniocal/vedator/releases/download/")||!sha.matches("[a-fA-F0-9]{64}"))throw new IllegalArgumentException("Neplatná aktualizace");
            activity.runOnUiThread(()->new AlertDialog.Builder(activity).setTitle("Nová verze "+manifest.optString("versionName")).setMessage("Stáhnout a nainstalovat aktualizaci? Uložená data zůstanou zachována.").setPositiveButton("Aktualizovat",(d,w)->download(url,sha,next)).setNegativeButton("Později",null).show());
        }catch(Exception e){toast("Aktualizace zatím není zveřejněná nebo není dostupné připojení. Webový obsah se aktualizuje samostatně.");}
    });}
    private void download(String url,String sha,int code){toast("Stahuji aktualizaci…");io.execute(()->{
        try{
            byte[] bytes=Net.get(url,100_000_000);if(!hex(MessageDigest.getInstance("SHA-256").digest(bytes)).equalsIgnoreCase(sha))throw new SecurityException("Kontrolní součet nesouhlasí");
            File file=new File(activity.getCacheDir(),"updates/vedator-update.apk");Net.write(file,bytes);
            PackageManager pm=activity.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
            PackageInfo next=pm.getPackageArchiveInfo(file.getPath(),flags),current=pm.getPackageInfo(activity.getPackageName(),flags);
            if(next==null||!activity.getPackageName().equals(next.packageName)||next.versionCode!=code||!sameSignatures(current,next))throw new SecurityException("Nesouhlasí podpis nebo verze aplikace");
            activity.runOnUiThread(()->{
                if(!pm.canRequestPackageInstalls()){
                    new AlertDialog.Builder(activity).setMessage("Povol instalaci aktualizací z Vedátora. Potom znovu zvol kontrolu aktualizace.").setPositiveButton("Otevřít nastavení",(d,w)->activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())))).setNegativeButton("Zrušit",null).show();return;
                }
                Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".files",file);activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
            });
        }catch(Exception e){toast("Aktualizaci nelze nainstalovat: "+e.getMessage());}
    });}
    static boolean sameSignatures(PackageInfo a,PackageInfo b){Signature[] x=Build.VERSION.SDK_INT>=28?a.signingInfo.getApkContentsSigners():a.signatures,y=Build.VERSION.SDK_INT>=28?b.signingInfo.getApkContentsSigners():b.signatures;return x!=null&&y!=null&&new HashSet<>(Arrays.asList(x)).equals(new HashSet<>(Arrays.asList(y)));}
    private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
    private void toast(String text){activity.runOnUiThread(()->Toast.makeText(activity,text,Toast.LENGTH_LONG).show());}
}
