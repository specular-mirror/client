/**
 * Specular Mirror Client v1.0.0
 * https://github.com/specular-mirror
 * Copyright Specular Mirror (c) 2016
 * Licensed under the Apache License v2
 */

var $   = require("jquery");
var fs  = require("fs");
var ncp = require('ncp').ncp;
var LOG_HISTORY = "";
module.exports = {

  /**
   * Log to console.
   * @async false
   * @return void
   */
  log: function(type, message, stack) {
    var d = new Date();
    var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + ":" + d.getMilliseconds();
    LOG_HISTORY += time+ " [" +type.toUpperCase()+ "] " +message+ "\n";
    if (stack) LOG_HISTORY += JSON.stringify(stack) + "\n";
    if (type == "critical") {
      LOG_HISTORY += time+ " [CRASH] Mirror has stopped working.\n";
      var type = "error";
      var message = "CRITICAL "+message;
      var crash = true;
    }
    console[type]("["+type.toUpperCase()+"] "+message);
    if (stack) console.log(stack);
    if (crash) {
      console.warn("[CRASH] Mirror has stopped working.");
      module.exports.crash(LOG_HISTORY);
    }
    return;
  },

  /**
   * Show the user that we crashed.
   * @async false
   * @return void
   */
  crash(history) {
    // Nice output.
    $("#crash").html('\
    <h1>Mirror Crashed :(</h1>\
    <p>See the log history below for more information.</p>\
    <textarea class="form-control">'+history+'</textarea>');
    $("#crash").show();
    $("html, body").attr("style", "overflow: hidden;");

    // Try to write a crash log to disk.


    // Stop the script.
    //throw new Exception("Stopping script.");
  },

  /**
   * Return the environment's home path.
   * @async false
   * @return string | false
   */
  getHomePath: function() {
    var home = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE || false);
    if (!home) {
      log("critical", "No home environment path found.");
      return false;
    } else {
      return home;
    }
  },

  /**
   * Return preferably saved settings
   * object for core module.
   * @param string directory
   * @param function callback
   * @async true
   * @return void
   */
  loadSettings: function(directory, callback) {

    // See if our directory exists.
    fs.mkdir(directory, function(error) {
      if (error) {
        if (error.code != "EEXIST") {
          log("critical", "Could not create directory '.specular-mirror/'.", error);
        }
      }
      else {
        // This also means that there is no saved config yet.
        fs.createReadStream(process.env.PWD+'/app/default/config.json').pipe(fs.createWriteStream(directory+'/config.json'));
        log("warn", "Created Specular directory and configuration.");
      }
      return module.exports.readConfigFile(directory, callback);
    });
  },
  readConfigFile: function(directory, callback) {
    // Read config.json
    fs.readFile(directory+"/config.json", "utf8", function(error, data) {
      if (error) {
        if (error.code == "ENOENT") {
          log("warn", "No config found in existing folder, copying default config.");
          fs.createReadStream(process.env.PWD+"/app/default/config.json").pipe(fs.createWriteStream(directory+"/config.json"));
          return module.exports.readConfigFile(directory, callback);
        } else {
          log("critical", "Could not read file 'config.json'.", error);
        }
      }
      return callback(JSON.parse(data));
    });
  },

  /**
   * Get all module manifests in JSON array.
   * @param string directory
   * @param function callback
   * @async true
   * @return void
   */
  getModuleManifests(directory, callback) {

    log("info", "Obtaining module manifest files.");

    // Read the given modules directory.
    fs.readdir(directory, function(error, filenames) {

      // Check for errors.
      if (error) {

        // It's fine if the folder doesn't exist, we can just copy the default folder.
        if (error.code == "ENOENT") {
          log("warn", "No module folder found, copying default modules.");
          ncp(process.env.PWD+"/app/default/modules", directory, function(error) {
            if (error) {
              log("critical", "Could not copy default module directory '"+directory+"'.", error);
            } else {
              return module.exports.getModuleManifests(directory, callback);
            }
          });
          return;
        }
        // Some different error happened, this is critical.
        else {
          log("critical", "Could not read module directory '"+directory+"'.", error);
          return;
        }
      }

      // We just read the modules directory, let's read all manifest.json files!
      var modulesAmount = filenames.length;
      var parsed  = 0;
      var skipped = 0;
      var Modules = [];
      log("debug", "Files found in modules directory:", filenames);
      filenames.forEach( function(filename) {

        // Read each manifest.json file.
        fs.readFile(directory + "/" + filename + "/manifest.json", 'utf-8', function(error, content) {

          // Catch an error.
          if (error) {
            log("warn", "Could not read manifest of module '"+filename+"'.", error);
            skipped++;
            return;
          }

          // Make sure that the manifest is correct.
          if (!module.exports.validateModuleManifest(filename, content)) {
            log("warn", "Manifest of module '"+filename+"' is not valid.");
            skipped++;
            return;
          }

          // Push the parsed JSON to the final object.
          Modules.push(JSON.parse(content));
          parsed++;
        });
      });

      // Because of async callbacks, we have to wait until all modules have been parsed
      // through an interval.
      var checkParsed = setInterval(function() {
        log("debug", "checkParsed interval fired.");
        if (modulesAmount == [parsed+skipped]) {
          log("debug", "checkParsed: all modules parsed.");
          clearInterval(checkParsed);
          log("debug", "Modules object:", Modules);
          callback(Modules, parsed, skipped);
        }
      }, 100);
    });
  },
  validateModuleManifest(name, content) {

    // 1. Make sure the JSON is valid.
    try {
      JSON.parse(content);
    } catch(error) {
      log("warn", "Could not parse JSON of manifest.json from module '"+name+"'.", error);
      return false;
    }
    var manifest = JSON.parse(content);

    // 2. Required fields present?
    if (manifest.id == undefined ||
        manifest.name == undefined ||
        manifest.version == undefined ||
        manifest.author == undefined ||
        manifest.main == undefined ||
        manifest.description == undefined ||
        manifest.manifestVersion == undefined ||
        manifest.enabled == undefined) {
      log("warn", "Module '"+name+"' has missing manifest data.");
      return false;
    }

    // 3. Make sure the filename matches the given id.
    if (manifest.id !== name) {
      log("warn", "Name of module '"+name+"' does not match manifest.id");
      return false;
    }

    // 4. Is the manifest supported?
    if (manifest.manifestVersion !== "1") {
      log("warn", "Module '"+name+"' uses an unsupported or outdated manifest version.");
      return false;
    }

    // It seems like a valid manifest!
    return true;
  },

  /**
   * Show loading section.
   * @param integer percentage
   * @async false
   * @return void
   */
  showLoading: function(percentage) {
    if ( $("#loading").is(":visible") === false ) {
      log("info", "Showing loading section.");
      $("#loading .progress-bar").attr("style", "width: 0%;");
      $("#loading .progress-bar").attr("data-progress", "0");
      $("#loading").show();
    }
    var percentage = Number(percentage);
    var currentWidth = Number( $("#loading .progress-bar").attr("data-progress") );
    $("#loading .progress-bar").attr("style", "width: "+[currentWidth + percentage]+"%;");
    $("#loading .progress-bar").attr("data-progress", [currentWidth + percentage]);
  },
  readyLoading: function() {
    var currentWidth = $("#loading .progress-bar").attr("data-progress");
    $("#loading .progress-bar").attr("style", "background-color: #2ecc71;width: "+currentWidth+"%;");
    setTimeout(function() {
      $("#loading").hide();
    }, 1000);
  }
}

/* Shortcuts for module export functions. */
function log(a, b, c) {
  return module.exports.log(a, b, c);
}
