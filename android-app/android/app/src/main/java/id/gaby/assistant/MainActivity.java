package id.gaby.assistant;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebSettings settings = getBridge().getWebView().getSettings();
        // Suara Gaby boleh langsung jalan lagi saat kembali dari aplikasi lain, tanpa ketukan.
        settings.setMediaPlaybackRequiresUserGesture(false);
        // Layar tetap menyala selama Gaby terbuka, seperti asisten yang siaga.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
