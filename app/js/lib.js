/**
 * Specular Mirror Client v1.0.0
 * https://github.com/specular-mirror
 * Copyright Specular Mirror (c) 2016
 * Licensed under the Apache License v2
 */

var $ = require("jquery");
var fs = require("fs");
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
      module.exports.log("critical", "No home environment path found.");
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
          module.exports.log("critical", "Could not create directory '.specular-mirror/'.", error);
        }
      }
      else {
        module.exports.log("info", "Created Specular directory.");
        // This also means that there is no saved config yet.
        fs.createReadStream(process.env.PWD+'/app/js/config-default.json').pipe(fs.createWriteStream(directory+'/config.json'));
      }
      return module.exports.readConfigFile(directory, callback);
    });
  },
  readConfigFile: function(directory, callback) {
    // Read config.json
    fs.readFile(directory+"/config.json", "utf8", function(error, data) {
      if (error) {
        if (error.code == "ENOENT") {
          module.exports.log("warn", "No config found in existing folder, copying default config.");
          fs.createReadStream(process.env.PWD+'/app/js/config-default.json').pipe(fs.createWriteStream(directory+'/config.json'));
          return module.exports.readConfigFile(directory, callback);
        } else {
          module.exports.log("critical", "Could not read file 'config.json'.", error);
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
    fs.readdir(directory, function(error, filenames) {
      if (error) {
        module.exports.log("critical", "Could not read module directory '"+directory+"'.", error);
        return;
      }
      var modulesAmount = filenames.length;
      var parsed  = 0;
      var Modules = [];
      filenames.forEach( function(filename) {
        fs.readFile(directory + "/" + filename, 'utf-8', function(error, content) {
          if (error) {
            if (error.code == "ENOENT") {
              module.exports.log("warn", "No module folder found, copying default modules.");

            } else {
              module.exports.log("warn", "Could not read module manifest '"+filename+"'.", error);
              return;
            }
          }
          Modules.push(JSON.parse(content));
          parsed++;
        });
      });
      var checkParsed = setInterval(function() {
        if (modulesAmount == parsed) {
          clearInterval(checkParsed);
          callback(Modules);
        }
      }, 100);
    });
  },

  /**
   * Show loading section.
   * @param integer percentage
   * @async false
   * @return void
   */
  showLoading: function(percentage) {
    if ( $("#loading").is(":visible") === false ) {
      module.exports.log("info", "Showing loading section.");
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
