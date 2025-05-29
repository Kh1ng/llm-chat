# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class kh1ng.* {
  native <methods>;
}

-keep class kh1ng.WryActivity {
  public <init>(...);

  void setWebView(kh1ng.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class kh1ng.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class kh1ng.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class kh1ng.RustWebChromeClient,kh1ng.RustWebViewClient {
  public <init>(...);
}
