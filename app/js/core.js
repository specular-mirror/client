/**
 * Specular Mirror Client v1.0.0
 * https://github.com/specular-mirror
 * Copyright Specular Mirror (c) 2016
 * Licensed under the Apache License v2
 */

/* 1. Load dependencies. */
var $     = require("jquery");
var gui   = require("nw.gui");
var Core  = require("./js/lib.js");
Core.log("info", "Dependencies included, loading configuration.");

/* 2. Construct App Object. */
var App = {
  Environment: {
    version: "1.0.0",
    home: null,
    directory: "/.specular-mirror"
  },
  Settings: {},
  Modules: {
    _loaded: 0
  },
  Windows: {}
};

/* 2.1 Wrap current window in App Object. */
App.Windows.Main = gui.Window.get();

/* 3. Show loading screen. */
Core.showLoading(10);

/* 4. Get home path. */
App.Environment.home = Core.getHomePath();

/* 5. Load core configuration. */
Core.loadSettings(App.Environment.home+App.Environment.directory,
function(config) {
  App.Settings = config;
  Core.showLoading(10);
  enableDebugging();
});

/* 6. Enable debugger? */
function enableDebugging() {
  if (App.Settings.debug) {
    Core.log("debug", "WebKit Developer Tools is enabled.");
    App.Windows.MainDevTools = App.Windows.Main.showDevTools();
    if (process.platform === "darwin") {
      var mb = new gui.Menu({type: 'menubar'});
      mb.createMacBuiltin('Specular', {
        hideEdit: false,
      });
      gui.Window.get().menu = mb;
    }
  }
  Core.showLoading(5);
  includeModules();
}

/* 7. Look for enabled modules. */
function includeModules() {
  Core.log("info", "Including enabled modules.");
  Core.getModuleManifests(App.Environment.home+App.Environment.directory+"/modules",
  function(modules) {

    var percentageLoad = [70 / modules.length];
    $.each(modules, function(i, module) {
      Core.loadModule(module, function() {
        Core.log("info", "Loaded module #"+i+" "+module.name);
        App.Modules._loaded += 1;
        Core.showLoading(percentageLoad);
      });
    });

    var readyCheck = setInterval(function() {
      if (App.Modules._loaded == modules.length) {
        clearInterval(readyCheck);
        readyMirror();
      }
    }, 100);

  });
}

/* Prepare for final view. */
function readyMirror() {
  Core.log("info", "Mirror Core is ready for use!");
  Core.showLoading(5);
  Core.readyLoading();
}
