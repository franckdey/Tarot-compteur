package fr.maxime.carnettarot;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Mise à jour intégrée : compare la version installée au fichier version.json
 * de la Release « latest » sur GitHub, puis télécharge et installe le nouvel APK.
 * Android demande toujours une confirmation (« Installer ») à l'utilisateur.
 * Exposé à la page sous le nom window.CarnetAndroid.
 */
public class MiseAJour {
    static final String RELEASE = "https://github.com/franckdey/Tarot-compteur/releases/latest/download/";
    // PendingIntent.FLAG_MUTABLE (API 31), absent de la plateforme 23 utilisée pour compiler.
    private static final int FLAG_MUTABLE = 0x02000000;

    private final Activity activite;
    private final WebView web;
    private volatile boolean enCours = false;

    MiseAJour(Activity activite, WebView web) {
        this.activite = activite;
        this.web = web;
    }

    /** Vérifie en arrière-plan ; si une version plus récente existe, la page propose de l'installer. */
    void verifier() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject v = new JSONObject(new String(lire(RELEASE + "version.json", 64 * 1024), "UTF-8"));
                    int code = v.getInt("versionCode");
                    if (code <= versionInstallee()) return;
                    appelerPage("window.majDisponible && window.majDisponible(" + JSONObject.quote(v.optString("versionName", "")) + ")");
                } catch (Exception e) {
                    // Pas de réseau ou pas encore de Release : on réessaiera au prochain lancement.
                }
            }
        }).start();
    }

    /** Appelé par la page quand l'utilisateur accepte la mise à jour. */
    @JavascriptInterface
    public void installer() {
        if (enCours) return;
        if (!installationAutorisee()) {
            message("Autorisez l’installation d’applis pour Carnet de tarot, puis revenez et réessayez");
            try {
                activite.startActivity(new Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES",
                        Uri.parse("package:" + activite.getPackageName())));
            } catch (Exception e) { }
            return;
        }
        enCours = true;
        message("Téléchargement de la mise à jour…");
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    File apk = new File(activite.getCacheDir(), "carnet-tarot.apk");
                    telecharger(RELEASE + "carnet-tarot.apk", apk);
                    installerApk(apk);
                } catch (Exception e) {
                    message("Mise à jour impossible : vérifiez la connexion internet");
                } finally {
                    enCours = false;
                }
            }
        }).start();
    }

    /** Version installée, affichée par la page (accueil et menu de la partie). */
    @JavascriptInterface
    public String version() {
        try {
            return activite.getPackageManager().getPackageInfo(activite.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }

    private int versionInstallee() throws Exception {
        return activite.getPackageManager().getPackageInfo(activite.getPackageName(), 0).versionCode;
    }

    /** Android 8 et plus : l'utilisateur doit autoriser l'appli à installer des applis. */
    private boolean installationAutorisee() {
        if (Build.VERSION.SDK_INT < 26) return true;
        try {
            // canRequestPackageInstalls() (API 26) n'existe pas dans la plateforme 23 : appel par réflexion.
            Object pm = activite.getPackageManager();
            return (Boolean) pm.getClass().getMethod("canRequestPackageInstalls").invoke(pm);
        } catch (Exception e) {
            return true;
        }
    }

    private void installerApk(File apk) throws Exception {
        PackageInstaller pi = activite.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(activite.getPackageName());
        int id = pi.createSession(params);
        PackageInstaller.Session session = pi.openSession(id);
        try {
            OutputStream out = session.openWrite("carnet-tarot.apk", 0, apk.length());
            InputStream in = new FileInputStream(apk);
            try {
                copier(in, out);
                session.fsync(out);
            } finally {
                in.close();
                out.close();
            }
            Intent retour = new Intent(activite, InstallReceiver.class);
            PendingIntent pending = PendingIntent.getBroadcast(activite, id, retour,
                    PendingIntent.FLAG_UPDATE_CURRENT | FLAG_MUTABLE);
            session.commit(pending.getIntentSender());
        } finally {
            session.close();
        }
    }

    private static HttpURLConnection ouvrir(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(30000);
        c.setUseCaches(false);
        c.setInstanceFollowRedirects(true); // GitHub redirige vers son stockage de fichiers
        if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
        return c;
    }

    private static byte[] lire(String url, int max) throws Exception {
        HttpURLConnection c = ouvrir(url);
        try {
            InputStream in = c.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                if (out.size() > max) throw new Exception("fichier trop gros");
            }
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    private static void telecharger(String url, File dest) throws Exception {
        HttpURLConnection c = ouvrir(url);
        try {
            InputStream in = c.getInputStream();
            OutputStream out = new FileOutputStream(dest);
            try {
                copier(in, out);
            } finally {
                out.close();
            }
        } finally {
            c.disconnect();
        }
    }

    private static void copier(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    }

    private void message(String texte) {
        appelerPage("window.toast && toast(" + JSONObject.quote(texte) + ")");
    }

    private void appelerPage(final String js) {
        activite.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                web.evaluateJavascript(js, null);
            }
        });
    }
}
