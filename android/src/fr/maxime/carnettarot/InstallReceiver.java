package fr.maxime.carnettarot;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.widget.Toast;

/** Résultat de l'installation : affiche la confirmation Android, ou l'erreur. */
public class InstallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int statut = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (statut == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmer = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirmer != null) context.startActivity(confirmer.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } else if (statut != PackageInstaller.STATUS_SUCCESS) {
            // STATUS_SUCCESS : l'appli vient d'être remplacée par la nouvelle version.
            String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            if (statut == PackageInstaller.STATUS_FAILURE_ABORTED) msg = "installation annulée";
            Toast.makeText(context, "Mise à jour non installée : " + (msg != null ? msg : "erreur " + statut), Toast.LENGTH_LONG).show();
        }
    }
}
