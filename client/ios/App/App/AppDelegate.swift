import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// Contrôleur Capacitor personnalisé : masque les indicateurs de scroll natifs de la
// WebView (look « app » plutôt que page web). Référencé dans Base.lproj/Main.storyboard.
class MainViewController: CAPBridgeViewController {
    private var observingThemeColor = false
    private let fallbackBg = UIColor(red: 245.0 / 255.0, green: 245.0 / 255.0, blue: 240.0 / 255.0, alpha: 1.0)

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        // Rebond élastique même si le contenu tient à l'écran (sinon "figé").
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        // Zone de rebond : scrollView transparent → on voit le fond de la WebView,
        // qu'on synchronise à la couleur de la page via themeColor (KVO).
        webView?.scrollView.backgroundColor = .clear
        webView?.backgroundColor = fallbackBg
        if #available(iOS 15.0, *), let wv = webView {
            wv.addObserver(self, forKeyPath: "themeColor", options: [.initial, .new], context: nil)
            observingThemeColor = true
        }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                              change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if #available(iOS 15.0, *), keyPath == "themeColor" {
            webView?.backgroundColor = webView?.themeColor ?? fallbackBg
        }
    }

    deinit {
        if observingThemeColor, let wv = webView {
            wv.removeObserver(self, forKeyPath: "themeColor")
        }
    }
}
