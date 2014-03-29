//jshint browser: true
/*global asyncStorage: true, L */
(function () {
  //jshint maxstatements: 31
  "use strict";
  var result,
      watchId,
      items = [],
      item,
      nbItems,
      curPos,
      curCell,
      options,
      utils,
      map,
      group,
      _;
  options = {
    geoloc: 'GPS',
    action: 'send',
    logLevel: 'debug',
    lang: 'en-US',
    accuracy: 50,
    delta: 10,
    mapType: 'full',
    username: ''
  };
  function $$(sel, root) {  root = root || document; return [].slice.call(root.querySelectorAll(sel)); }
  utils = {
    format:  function (str) {
      var params = Array.prototype.splice.call(arguments, 1);
      return (str.replace(/%s/g, function () {return params.shift(); }));
    },
    logLevel: 'debug',
    logLevels: ['debug', 'info', 'warning', 'error'],
    log: function () {
      var args     = Array.prototype.slice.call(arguments),
          level    = args.pop(),
          levelNum = utils.logLevels.indexOf(level),
          message,
          res;

      function getDate() {
        var d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().substr(11, 8);
      }
      if (levelNum === -1) {
        console.log("Unknown log level " + level);
      }
      if (levelNum >= utils.logLevels.indexOf(utils.logLevel)) {
        if (args.length === 1) {
          message = args[0];
          if (typeof message === 'object') {
            message = JSON.stringify(message, null, '  ');
          }
        } else {
          message = utils.format.apply(null, args);
        }
        res = result.innerHTML.split("\n").slice(0, 100);
        res.unshift(utils.format('<span class="%s">[%s][%s]</span> %s', level, getDate(), level, message));
        result.innerHTML = res.join("\n");
      }
    }
  };
  // send {{
  function send(cb) {
    //jshint maxstatements: 30
    var xhr, res, options, username;
    username = document.querySelector("[name=username]").value.replace(/^\s+/g, '').replace(/\s+$/g, '');
    options = {
      mozAnon: true,
      mozSystem: true
    };
    utils.log("[Send] Sending…", "debug");
    utils.log(items, "debug");
    try {
      xhr = new XMLHttpRequest(options);
      xhr.open("POST", "https://location.services.mozilla.com/v1/submit", false);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      if (username !== '') {
        xhr.setRequestHeader("X-Nickname", username);
      }
      xhr.send(JSON.stringify({items: items}));
      if (xhr.status === 204) {
        utils.log("[Send] Done sending %s measurements", items.length, "info");
        items = [];
        if (cb) {
          cb();
        }
      } else {
        try {
          utils.log("[Send] Error sending datas: ", "error");
          res = JSON.parse(xhr.responseText).errors;
          res.forEach(function (error) { utils.log(error, "error"); });
        } catch (e) {
          utils.log("[Send] Unable to parse response: " + e, "error");
        }
      }
    } catch (e) {
      utils.log("[Send] Error sending datas: " + e, "error");
    }
  }
  function search() {
    //jshint maxstatements: 30
    var xhr, options, res;
    options = {
      mozAnon: true,
      mozSystem: true
    };
    utils.log("[Search] Searching…", "debug");
    try {
      if (item.cell.length > 0) {
        item.radio = item.cell[0].radio;
      }
      utils.log(item, "debug");
      xhr = new XMLHttpRequest(options);
      xhr.open("POST", "https://location.services.mozilla.com/v1/search?key=", false);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(item));
      if (xhr.status === 200) {
        res = JSON.parse(xhr.responseText);
        if (res.status === "ok") {
          utils.log("[Search] OK\nlat: %s\nlon: %s\naccuracy: %s", res.lat, res.lon, res.accuracy, "info");
          document.getElementById('sectionMain').classList.toggle('hidden');
          document.getElementById('sectionMap').classList.toggle('hidden');
          map.setView([res.lat, res.lon], 14);
          map._onResize();
        } else {
          utils.log("[Search] " + res.status, "error");
        }
      } else {
        utils.log("[Search] K0: %s - %s - %s", xhr.status, xhr.statusText, xhr.responseText, "error");
      }
    } catch (e) {
      utils.log('[Search] Error sending datas: ' + e, "error");
    }
    items = [];
  }
  // }}
  function onInfosCollected() {
    try {
      switch (document.querySelector('[name=action]:checked').value) {
      case 'send':
        send();
        break;
      case 'store':
        asyncStorage.getItem('items', function (value) {
          if (value === null) {
            value = items;
          } else {
            try {
              value = JSON.parse(value);
            } catch (e) {
              utils.log("Error retrieving stored items: " + e, "error");
              value = [];
            }
            value = value.concat(items);
          }
          asyncStorage.setItem('items', JSON.stringify(value), function () {
            utils.log("Done adding %s items. %s items stored.", items.length, value.length, "info");
            nbItems.innerHTML = value.length;
            items = [];
          });
        });
        break;
      case 'nothing':
        utils.log("Done", "info");
        utils.log(items, "debug");
        break;
      }
    } catch (e) {
      utils.log("Error in onInfosCollected: " + e, "error");
    }
  }
  // Cell {{
  function getCellInfos() {
    //jshint maxstatements: 25
    var conns, data, voice, cells = [], cell = {}, type, tr;
    utils.log("[cell] Getting cell infos", "debug");
    // Convert radio type
    tr = {
      'gsm': ["gsm", "edge", "gprs", "hspa", "hsdpa", "hspa+", "hsupa"],
      'cdma': ["cdma", "evdo", "ehrpd"]
    };

    conns = window.navigator.mozMobileConnection;
    if (typeof conns !== 'undefined') {
      if (!Array.isArray(conns)) {
        conns = [ conns ];
      }
      conns.forEach(function (conn) {
        try {
          data  = conn.data;
          voice = conn.voice;
          type  = voice.type;
          Object.keys(tr).forEach(function (radio) {
            if (tr[radio].indexOf(type) !== -1) {
              type = radio;
            }
          });
          cell.radio  = type;
          cell.mcc    = voice.network.mcc;
          cell.mnc    = voice.network.mnc;
          cell.lac    = voice.cell.gsmLocationAreaCode;
          cell.cid    = voice.cell.gsmCellId;
          cell.signal = voice.signalStrength;
          cell.asu    = undefined;
          cell.ta     = undefined;
          cell.psc    = undefined;
          cells.push(cell);
          utils.log("[cell] Done", "debug");
        } catch (e) {
          utils.log("[cell] Error : " + e, "error");
        }
      });
    } else {
      utils.log("[cell] Unable to get mobile connection", "debug");
    }
    return cells;
  }
  // }}
  // Wifi {{
  function getWifiInfos(cb) {
    var wifi,
        request,
        networks = [];

    function onWifiInfos(networks) {
      try {
        item.wifi = networks;
        items.push(item);
        cb();
      } catch (e) {
        utils.log("[wifi] Error onWifiInfos: " + e, "error");
      }
    }

    utils.log("[wifi] Getting Wifi infos", "debug");
    try {
      wifi     = navigator.mozWifiManager;
      request  = wifi.getNetworks();
      request.onsuccess = function () {
        utils.log("[wifi] found " + this.result.length + " networks", "info");
        this.result.forEach(function (network) {
          var net;
          if (!/_nomap/.test(network.ssid)) {
            net = {
              key: network.bssid,
              channel: undefined,
              frequency: undefined,
              signal: network.signalStrength
            };
            networks.push(net);
          }
        });
        utils.log("[wifi] Done", "debug");
        onWifiInfos(networks);
      };
      request.onerror = function () {
        utils.log('[wifi] Something goes wrong: ' + request.error.name, "error");
        onWifiInfos(networks);
      };
    } catch (e) {
      utils.log('[wifi] Something goes wrong: ' + e, "error");
      onWifiInfos(networks);
    }
  }
  // }}
  // Geoloc {{
  function onGeolocSuccess(pos) {
    try {
      item = {};
      item.cell     = getCellInfos();
      item.lat      = pos.coords.latitude;
      item.lon      = pos.coords.longitude;
      item.accuracy = pos.coords.accuracy;

      // Filter out erroneous values
      if (typeof item.lat !== 'number' || isNaN(item.lat) || typeof item.lon !== 'number' || isNaN(item.lon)) {
        utils.log("[geoloc] Wrong location", "error");
      } else if (item.accuracy > options.accuracy) {
        utils.log("[geoloc] Not accurate : " + item.accuracy, "error");
      } else {
        getWifiInfos(onInfosCollected);
      }
    } catch (e) {
      utils.log("[geoloc] Error in onGeolocSuccess: " + e.toString(), "error");
    }
  }
  function onGeolocError(err) {
    utils.log('[geoloc] Error: ' + err.code + ' : ' + err.message, "error");
    utils.log('[geoloc] Aborting.', "error");
  }
  // }}

  function getGeolocOptions() {
    return {
      enableHighAccuracy: document.getElementById('geoAccur').checked,
      timeout: parseInt(document.getElementById('geoTo').value, 10),
      maximumAge: parseInt(document.getElementById('geoMax').value, 10)
    };
  }
  function getGeoloc() {

    utils.log("Getting infos", "debug");

    if (document.querySelector('[name=geoloc]:checked').value === 'GPS') {
      navigator.geolocation.getCurrentPosition(onGeolocSuccess, onGeolocError, getGeolocOptions());
    } else {
      var activity = new window.MozActivity({
        name: "clochix.geoloc"
      });
      activity.onsuccess = function () {
        onGeolocSuccess(this.result);
      };
      activity.onerror = function () {
        utils.log('[geoloc] Error getting location: ' + this.error.name, "error");
        utils.log('[geoloc] Aborting.', "error");
      };
    }

    return false;
  }
  function onVoiceChange() {
    try {
      var conns = window.navigator.mozMobileConnection;
      if (!Array.isArray(conns)) {
        conns = [ conns ];
      }
      conns.forEach(function (conn) {
        if (conn && conn.voice && conn.voice.cell) {
          //@FIXME we can't rely on currCell if there is more than one conn
          if (curCell !== conn.voice.cell.gsmCellId) {
            curCell = conn.voice.cell.gsmCellId;
            utils.log("[cell] New cell: " + curCell, "debug");
            getGeoloc();
          }
        }
      });
    } catch (e) {
      utils.log("Error in onVoiceChange: " + e, "error");
    }
  }
  function distance(p1, p2) {
    function rad(r) { return r * Math.PI / 180; }
    var R    = 6371, // Radius of the earth in km
        dLat = rad(p2.latitude - p1.latitude),
        dLon = rad(p2.longitude - p1.longitude),
        a    = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(rad(p1.latitude)) * Math.cos(rad(p2.latitude)) *
               Math.sin(dLon / 2) * Math.sin(dLon / 2),
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
        d = R * c * 1000; // Distance in m
    return isNaN(d) ? 0 : d;
  }
  function onPosChange(pos) {
    try {
      if (typeof curPos === 'undefined') {
        curPos = {};
        curPos.latitude  = pos.coords.latitude;
        curPos.longitude = pos.coords.longitude;
        curPos.accuracy  = pos.coords.accuracy;
      }
      var delta = distance(curPos, pos.coords);
      if (delta > parseInt(options.delta, 10) || pos.coords.accuracy < 0.8 * curPos.accuracy) {
        utils.log("[geoloc] New position:" + pos.coords.accuracy + "/" + pos.coords.latitude + "/" + pos.coords.longitude, "info");
        curPos.latitude  = pos.coords.latitude;
        curPos.longitude = pos.coords.longitude;
        curPos.accuracy  = pos.coords.accuracy;
        if (curPos.accuracy > options.accuracy) {
          utils.log("[geoloc] Not accurate : " + curPos.accuracy, "error");
        } else {
          onGeolocSuccess(pos);
        }
      } else {
        utils.log("[geoloc] Difference too small : " + delta, "debug");
      }
    } catch (e) {
      utils.log("Error in onPosChange: " + e, "error");
    }
  }
  function startMonitoring() {
    try {
      if (document.querySelector('[name=geoloc]:checked').value !== 'GPS') {
        window.alert("Monitoring is only available when using GPS");
        return false;
      }
      var conns = window.navigator.mozMobileConnection;
      if (!Array.isArray(conns)) {
        conns = [ conns ];
      }
      conns.forEach(function (conn) {
        if (conn && conn.voice) {
          conn.addEventListener('voicechange', onVoiceChange);
        }
      });
      watchId = navigator.geolocation.watchPosition(onPosChange, onGeolocError, getGeolocOptions());
    } catch (e) {
      utils.log("Error in startMonitoring: " + e, "error");
    }
  }
  function stopMonitoring() {
    try {
      var conns = window.navigator.mozMobileConnection;
      if (!Array.isArray(conns)) {
        conns = [ conns ];
      }
      conns.forEach(function (conn) {
        if (conn && conn.voice) {
          conn.removeEventListener('voicechange', onVoiceChange);
        }
      });
      if (typeof watchId !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    } catch (e) {
      utils.log("Error in stopMonitoring: " + e, "error");
    }
  }
  window.addEventListener("load", function () {
    //jshint maxstatements: 41
    var onAccuracyChange, onDeltaChange, tile;
    _ = document.webL10n.get;
    function onSliderChange(option, target) {
      var fct = function (event) {
        if (event) {
          options[option] = event.target.value;
          document.getElementById(target).textContent = event.target.value;
        } else {
          document.getElementById(target).textContent = options[option];
        }
      };
      return fct;
    }
    function saveOptions() {
      asyncStorage.setItem('options', options);
    }
    try {
      result  = document.getElementById("result");
      nbItems = document.getElementById("nbItems");
      document.body.addEventListener('click', function (event) {
        var elmt;
        if (event.target.dataset && event.target.dataset.target) {
          elmt = document.getElementById(event.target.dataset.target);
          if (elmt) {
            elmt.classList.toggle('hidden');
          }
        }
      });
      document.getElementById('mobile').addEventListener('click', getGeoloc);
      document.getElementById('monitor').addEventListener('click', function () {
        if (this.dataset.state === 'stopped') {
          startMonitoring();
          this.dataset.state = "started";
          this.textContent   = _('monitoringStop');
        } else {
          stopMonitoring();
          this.dataset.state = "stopped";
          this.textContent   = _('monitoringStart');
        }
      });
      document.getElementById('clearLogs').addEventListener('click', function (event) {
        event.preventDefault();
        try {
          result.textContent = '';
        } catch (e) {
          utils.log("Error in clearLogs: " + e, "error");
        }
        return false;
      });
      document.getElementById('search').addEventListener('click', function (event) {
        event.preventDefault();
        item = {};
        item.cell = getCellInfos();
        getWifiInfos(search);
        return false;
      });
      document.getElementById('openService').addEventListener('click', function (event) {
        navigator.geolocation.getCurrentPosition(function (pos) {
          var url = 'https://location.services.mozilla.com/map#15/' + pos.coords.latitude + '/' + pos.coords.longitude;
          utils.log('[service] Opening ' + url);
          window.open(url);
        }, function (err) {
          utils.log('[service] Error: ' + err.code + ' : ' + err.message, "error");
          utils.log('[service] Aborting.', "error");
        }, getGeolocOptions());
      });
      document.getElementById('displayStorage').addEventListener('click', function (event) {
        event.preventDefault();
        var logs;
        try {
          result.textContent = '';
          asyncStorage.getItem('items', function (value) {
            if (value === null) {
              value = items;
              utils.log("Nothing stored", "info");
            } else {
              try {
                value = JSON.parse(value);
                utils.log("Number of items: " + value.length, "info");
                utils.log(value, "info");
                logs = document.getElementById('logs');
                logs.classList.remove('hidden');
                logs.scrollIntoView();
              } catch (e) {
                utils.log("Error retrieving stored items: " + e, "error");
              }
            }
          });
        } catch (e) {
          utils.log("Error in displayStorage: " + e, "error");
        }
        return false;
      });
      document.getElementById('dumpStorage').addEventListener('click', function (event) {
        event.preventDefault();
        try {
          result.textContent = '';
          asyncStorage.getItem('items', function (value) {
            if (value === null) {
              value = items;
              utils.log("Nothing stored", "info");
            } else {
              try {
                var d, sdcard, file, request;
                d = new Date();
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                sdcard  = navigator.getDeviceStorage("sdcard");
                file    = new Blob([value], {type: "text/plain"});
                request = sdcard.addNamed(file, "stumbler" + d.toISOString().replace(/[^0-9]/g, '').substr(0, 14) + ".json");
                request.onsuccess = function () {
                  var name = this.result;
                  utils.log('[storage] File "' + name + '" successfully wrote on the sdcard storage area', 'info');
                };
                request.onerror = function () {
                  console.warn('[storage] Unable to write the file: ' + this.error, 'error');
                };
              } catch (e) {
                utils.log("Error retrieving stored items: " + e, "error");
              }
            }
          });
        } catch (e) {
          utils.log("Error in displayStorage: " + e, "error");
        }
        return false;
      });
      document.getElementById('displayMap').addEventListener('click', function (event) {
        event.preventDefault();
        var markers = [];
        try {
          result.textContent = '';
          asyncStorage.getItem('items', function (value) {
            value = JSON.parse(value);
            if (value === null || (Array.isArray(value) && value.length < 1)) {
              window.alert("Nothing stored");
            } else {
              // Filter erroneous values
              utils.log('[map] before filtering ' + value.length, 'debug');
              value = value.filter(function (v) {
                return typeof v.lat === 'number' && !isNaN(v.lat) && typeof v.lon === 'number' && !isNaN(v.lon);
              });
              utils.log('[map] after filtering ' + value.length, 'debug');
              try {
                document.getElementById('sectionMain').classList.toggle('hidden');
                document.getElementById('sectionMap').classList.toggle('hidden');
                map.setView([value[value.length - 1].lat, value[value.length - 1].lon], 14);
                value.forEach(function (v) {
                  var circle, marker;
                  if (typeof v.lat === 'number' && !isNaN(v.lat) && typeof v.lon === 'number' && !isNaN(v.lon)) {
                    try {
                      if (options.mapType === 'full') {
                        circle = L.circle([v.lat, v.lon], v.accuracy, {
                          color: 'red',
                          fillColor: '#f03',
                          fillOpacity: 0.5
                        }).addTo(map);
                        circle.bindPopup(v.wifi.length + " wifi networks");
                        circle.on("click", function () {
                          circle.openPopup();
                        });
                      } else {
                        marker = L.marker(new L.LatLng(v.lat, v.lon));
                        markers.push(marker);
                      }
                    } catch (e) {
                      utils.log('[map] ' + e.toString(), 'error');
                    }
                  }
                });
                if (options.mapType === 'compact') {
                  group.clearLayers();
                  group.addLayers(markers);
                  map.addLayer(group);
                } else {
                  if (map.hasLayer(group)) {
                    map.removeLayer(group);
                  }
                }

                // Force map redraw
                map._onResize();
              } catch (e) {
                utils.log("Error displaying map: " + e, "error");
              }
            }
          });
        } catch (e) {
          utils.log("Error in displayMap: " + e, "error");
        }
        return false;
      });
      document.getElementById('displayStats').addEventListener('click', function (event) {
        event.preventDefault();
        var dist = 0, wifi = {}, cells = {}, curPos, prevPos, logs;
        try {
          result.textContent = '';
          asyncStorage.getItem('items', function (value) {
            value = JSON.parse(value);
            if (value === null || (Array.isArray(value) && value.length < 1)) {
              window.alert("Nothing stored");
            } else {
              try {
                // Filter our erroneous values
                value = value.filter(function (v) {
                  return typeof v.lat === 'number' && !isNaN(v.lat) && typeof v.lon === 'number' && !isNaN(v.lon);
                });
                value.forEach(function (v) {
                  v.cell.forEach(function (c) {
                    if (c.cid) {
                      cells[c.cid.toString()] = true;
                    }
                  });
                  v.wifi.forEach(function (c) {
                    if (c.key) {
                      wifi[c.key] = true;
                    }
                  });
                  if (typeof prevPos === 'undefined') {
                    prevPos = {
                      latitude: v.lat,
                      longitude: v.lon
                    };
                  } else {
                    curPos = {
                      latitude: v.lat,
                      longitude: v.lon
                    };
                    dist += distance(prevPos, curPos);
                    prevPos = {
                      latitude: v.lat,
                      longitude: v.lon
                    };
                  }
                });
                utils.log("[stats] " + Object.keys(wifi).length + " wifi networks", "info");
                utils.log("[stats] " + Object.keys(cells).length + " cells", "info");
                utils.log("[stats] " + dist + "m", "info");
                logs = document.getElementById('logs');
                logs.classList.remove('hidden');
                logs.scrollIntoView();
              } catch (e) {
                utils.log("Error compiling stats stored items: " + e, "error");
              }
            }
          });
        } catch (e) {
          utils.log("Error in displayStats: " + e, "error");
        }
        return false;
      });
      document.getElementById('mapBack').addEventListener('click', function (event) {
        event.preventDefault();
        document.getElementById('sectionMain').classList.toggle('hidden');
        document.getElementById('sectionMap').classList.toggle('hidden');
        return false;
      });
      document.getElementById('sendStorage').addEventListener('click', function (event) {
        event.preventDefault();
        try {
          result.textContent = '';
          asyncStorage.getItem('items', function (value) {
            var toSend = 0;
            if (value === null) {
              utils.log('Nothing to send', "warning");
            } else {
              try {
                items = JSON.parse(value);
                // Filter our erroneous values
                items = items.filter(function (v) {
                  return typeof v.lat === 'number' && !isNaN(v.lat) && typeof v.lon === 'number' && !isNaN(v.lon);
                });
                toSend = items.length;
                send(function () {
                  utils.log("Done sending " + toSend + " items", "info");
                  asyncStorage.setItem('items', JSON.stringify([]), function () {
                    utils.log("Done reseting storage", "info");
                    nbItems.innerHTML = "0";
                  });
                });
              } catch (e) {
                utils.log("Error retrieving stored items: " + e, "error");
              }
            }
          });
        } catch (e) {
          utils.log("Error in sendStorage: " + e, "error");
        }
        return false;
      });
      document.getElementById('clearStorage').addEventListener('click', function (event) {
        event.preventDefault();
        if (window.confirm("Do you really want to delete local storage?")) {
          try {
            result.textContent = '';
            asyncStorage.removeItem('items', function () {
              utils.log("Storage deleted", "info");
              nbItems.innerHTML = "0";
            });
          } catch (e) {
            utils.log("Error in clearStorage: " + e, "error");
          }
        }
        return false;
      });
      document.getElementById('settingsLogLevel').addEventListener('change', function () {
        utils.logLevel   = this.value;
        options.logLevel = this.value;
        saveOptions();
      });
      document.getElementById('settingsLang').addEventListener('change', function () {
        options.lang = this.value;
        document.webL10n.setLanguage(this.value);
        saveOptions();
      });
      utils.logLevel = document.getElementById('settingsLogLevel').value;
      document.webL10n.setLanguage(document.getElementById('settingsLang').value);

      onAccuracyChange = onSliderChange('accuracy', 'accuracyValue');
      document.getElementById('accuracy').addEventListener('input', onAccuracyChange);
      document.getElementById('accuracy').addEventListener('change', onAccuracyChange);
      document.getElementById('accuracy').addEventListener('change', saveOptions);

      onDeltaChange = onSliderChange('delta', 'deltaValue');
      document.getElementById('delta').addEventListener('input', onDeltaChange);
      document.getElementById('delta').addEventListener('change', onDeltaChange);
      document.getElementById('delta').addEventListener('change', saveOptions);

      document.getElementById('options').addEventListener('change', function (ev) {
        if ((ev.target.tagName === 'INPUT' && ev.target.type === 'radio') || ev.target.name === 'username') {
          options[ev.target.name] = ev.target.value;
          saveOptions();
        }
      });

      asyncStorage.getItem('options', function (val) {
        //jshint maxcomplexity: 15
        if (val) {
          // Default values
          options.accuracy = val.accuracy || 50;
          options.action   = val.action   || 'store';
          options.delta    = val.delta    || 10;
          options.geoloc   = val.geoloc   || 'GPS';
          options.logLevel = val.logLevel || 'debug';
          options.lang     = val.lang     || 'en-US';
          options.username = val.username || '';
          options.mapType  = val.mapType  || 'full';
        } else {
          options.accuracy = 50;
          options.action   = 'store';
          options.delta    = 10;
          options.geoloc   = 'GPS';
          options.logLevel = 'debug';
          options.lang     = 'en-US';
          options.username = '';
          options.mapType  = 'full';
        }
        // Init options
        onAccuracyChange();
        onDeltaChange();
        utils.logLevel = options.logLevel;
        document.webL10n.setLanguage(options.lang);
        document.getElementById('settingsLogLevel').value = options.logLevel;
        document.getElementById('settingsLang').value = options.lang;
        document.querySelector("[name=username]").value = options.username;
        ['action', 'geoloc', 'mapType'].forEach(function (type) {
          $$("[name=" + type + "]").forEach(function (e) {
            e.checked = (e.value === options[type]);
          });
        });
      });

      try {
        asyncStorage.getItem('items', function (value) {
          if (value === null) {
            nbItems.innerHTML = "0";
          } else {
            try {
              value = JSON.parse(value);
              // Filter our erroneous values
              value = value.filter(function (v) {
                return typeof v.lat === 'number' && !isNaN(v.lat) && typeof v.lon === 'number' && !isNaN(v.lon);
              });
              nbItems.innerHTML = value.length;
            } catch (e) {
              utils.log("Error retrieving stored items: " + e, "error");
            }
          }
        });
      } catch (e) {
        utils.log("Error in displayStorage: " + e, "error");
      }
    } catch (e) {
      utils.log(e.toString(), "error");
    }
    // Map
    map = L.map('map');
    group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      disableClusteringAtZoom: 18
    });
    tile = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>', maxZoom: 18});
    tile.addTo(map);
    //map.addLayer(group);
    L.Icon.Default.imagePath = 'lib/leaflet/images';
  }, false);
  window.addEventListener("error", function (e) {
    utils.log(e.toString(), "error");
  }, false);

  // {{ Create Mock
  function createMock() {
    navigator.mozWifiManager = {
      getNetworks: function () {
        var res = {};
        window.setTimeout(function () {
          var self = {
            result: [
              {
                ssid: '00:00:00:00',
                signalStrengh: 0
              }
            ]
          };
          res.onsuccess.call(self);
        }, 500);
        return res;
      }
    };
    var info = {
      'type': 'gsm',
      'network': {
        'mcc': 'mcc',
        'mnc': 'mnc'
      },
      'cell': {
        'gsmLocationAreaCode': '123',
        'gsmCellId': '456'
      },
      'signalStrength': 1
    };
    navigator.mozMobileConnection = {
      data: info,
      voice: info
    };
    window.MozActivity = function (options) {
      var self = this;
      window.setTimeout(function () {
        var res = {
          result: {
            coords: {
              latitude: 48.856578 + (Math.random() / 100),
              longitude: 2.351828 + (Math.random() / 100),
              accuracy: 50
            }
          }
        };
        self.onsuccess.call(res);
      }, 50);
    };
  }
  if (typeof navigator.mozWifiManager === 'undefined' && typeof navigator.mozMobileConnection === 'undefined' && typeof window.MozActivity === 'undefined') {
    createMock();
    window.getGeoloc = getGeoloc;
  }
  // }}

}());
