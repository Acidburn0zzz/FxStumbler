# FxStumbler

Firefox OS client for [Mozilla Location Service](http://location.services.mozilla.com).

This application uses phone APIs only available to certified apps for the moment ([WifiManager](https://developer.mozilla.org/en-US/docs/Web/API/WifiManager), [MobileConnection](https://developer.mozilla.org/en-US/docs/Web/API/MozMobileConnection)). And [“the marketplace can not distribute apps that use certified APIs”](https://groups.google.com/forum/#!topic/mozilla.dev.marketplace/vY3Rj3tWXuU). So you will have to install it by hand on a developer phone.

## Install

You can either just download and extract the archive, or clone the repository :

    mkdir FxStumbler
    cd FxStumbler
    curl -O https://raw.githubusercontent.com/clochix/FxStumbler/master/stumbler.zip
    unzip stumbler.zip

Or

    git clone https://github.com/clochix/FxStumbler
    make all

Then create a new packaged app into the [App Manager](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Using_the_App_Manager), and install the application on your phone. If you haven’t yet, don’t forget to [enable remote debugging](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Debugging/Developer_settings#Remote_debugging) on your phone.


## Usage

### Main actions

 - *Get infos*: get current location, cell and Wifi informations and perform the action selected in the options (default is to push to the Web service);
 - *Start Monitoring*: perform the above action every time location or mobile cell information change;
 - *Get my position* query the Web service to get current position according to mobile cells and wifi networks nearby;
 - *Clear log*: clear the log window;

### Storage

Collected information can by stored in a local database and sent to the server later. You can display the full content of the database (warning, a huge JSON array), send it or clear all records.

### Options

 - *Geoloc*: how to get current location: GPS or by using another app;
 - *Action*: send data immediately, store them in local database or do nothing;
 - *Username*: if you want your name in the [hall of fame](https://location.services.mozilla.com/leaders);
 - geoloc: allow to fine tune [geolocation options](https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions);
 - min accuracy: data will be ignored if accuracy of geoloc is more than this value (aka if geoloc is not accurate enough);
 - min distance: when watching position change, will only store new data if distance from previous measure is more than this value, in meter, or if accuracy is 20% better;
 - map type: displaying hundred of measurements on map may take a lot of time. By choosing *compact*, the markers will be grouped on the map;
 - *Log level*: verbosity of logs;

## Troubleshooting GeoLocation

On my Keon, geolocation seems very inaccurate. So I added the ability to select current location on a map with a custom Web Activity. To use it, you need to install another application which implements `clochix.geoloc` Web Activity (see my [hereIam](https://github.com/clochix/hereIam) application) and check the "Ask" radio button. In this mode, monitoring of position changes is currently disabled;

## Release notes

* [2015-10-22]
  - allow to reload data saved in files
  - bumped version du 0.3

* [2014-10-20]
  - add an option to compress data before sending, Refs #15
  - bumped version du 0.2

* [2014-08-24]
  - fix dual-SIM support

* [2014-02-03]
  - add some statistics

* [2014-02-01]
  - allow to display data in storage on a map

* [2014-01-19]
  - use bigger buttons;
  - add options: minimal accuracy and minimal distance between 2 measures;
  - options should be saved;
  - logs are now hidden by default;
