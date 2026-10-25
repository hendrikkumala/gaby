package id.gaby.assistant;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.AlarmClock;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

// Alarm sungguhan lewat aplikasi Jam bawaan HP, plus cek & buka pengaturan
// yang membuat pengingat Gaby bisa berbunyi saat HP terkunci.
@CapacitorPlugin(name = "GabyAlarm")
public class GabyAlarmPlugin extends Plugin {

    // Pasang alarm di aplikasi Jam: { hour, minute, message, days: [1=Minggu..7=Sabtu] }
    @PluginMethod
    public void setAlarm(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        if (hour == null || minute == null) {
            call.reject("Jam alarm belum diisi");
            return;
        }
        Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
        intent.putExtra(AlarmClock.EXTRA_HOUR, hour.intValue());
        intent.putExtra(AlarmClock.EXTRA_MINUTES, minute.intValue());
        intent.putExtra(AlarmClock.EXTRA_MESSAGE, call.getString("message", "Gaby"));
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, call.getBoolean("skipUi", true).booleanValue());
        JSArray days = call.getArray("days");
        if (days != null && days.length() > 0) {
            ArrayList<Integer> list = new ArrayList<>();
            for (int i = 0; i < days.length(); i++) list.add(days.optInt(i));
            intent.putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS, list);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Aplikasi Jam tidak ditemukan", e);
        }
    }

    // Apakah notifikasi, alarm tepat waktu, dan izin latar belakang sudah beres?
    @PluginMethod
    public void status(PluginCall call) {
        Context ctx = getContext();
        boolean exact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            exact = am != null && am.canScheduleExactAlarms();
        }
        boolean battery = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            battery = pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        JSObject ret = new JSObject();
        ret.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        ret.put("exactAlarm", exact);
        ret.put("batteryUnrestricted", battery);
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = appDetails();
        }
        open(call, intent);
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            open(call, appDetails());
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
        open(call, intent);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            open(call, appDetails());
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
        open(call, intent);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        open(call, appDetails());
    }

    private Intent appDetails() {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
    }

    // Buka layar pengaturan; kalau HP tidak punya layar itu, buka info aplikasi saja.
    private void open(PluginCall call, Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = appDetails();
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            } catch (Exception ignored) {
                call.reject("Pengaturan tidak bisa dibuka", e);
                return;
            }
        }
        call.resolve();
    }
}
