// @ts-nocheck
"use strict";

const { Adapter } = require("@iobroker/adapter-core");
/*
 * Created with @iobroker/create-adapter v1.29.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const request = require("request");

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: "awattar",

        // The ready callback is called when databases are connected and adapter received configuration.
        // start here!
        ready: main, // Main method defined below for readability

        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: (callback) => {
            try {
                // Here you must clear all timeouts or intervals that may still be active
                // clearTimeout(timeout1);
                // clearTimeout(timeout2);
                // ...
                // clearInterval(interval1);

                callback();
            } catch (e) {
                callback();
            }
        },

        // // is called if a subscribed state changes
        // stateChange: (id, state) => {
        //     if (state) {
        //         // The state was changed
        //         adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        //     } else {
        //         // The state was deleted
        //         adapter.log.info(`state ${id} deleted`);
        //     }
        // },
    }));
}

function compareValues(key, order = 'asc') {
    return function innerSort(a, b) {
      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0;
      }
  
      const varA = (typeof a[key] === 'string')
        ? a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string')
        ? b[key].toUpperCase() : b[key];
  
      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return (
        (order === 'desc') ? (comparison * -1) : comparison
      );
    };
  }

async function main() {

    // adapter.log.info("aWATTar API URL: " + adapter.config.aWATTarApiUrl);
    // adapter.log.info("Loading Threshold Start: " + adapter.config.LoadingThresholdStart);
    // adapter.log.info("Loading Threshold End: " + adapter.config.LoadingThresholdEnd);

    const url = adapter.config.aWATTarApiUrl;
    const mwst = parseInt(adapter.config.MWstRate);
    const workRate = parseFloat(adapter.config.WorkRate);
    const loadingThresholdStart = adapter.config.LoadingThresholdStart;
    if (isNaN(parseInt(loadingThresholdStart))) {return adapter.log.error("loadingThresholdStart NaN")}
    const loadingThresholdEnd = adapter.config.LoadingThresholdEnd;
    if (isNaN(parseInt(loadingThresholdStart))) {return adapter.log.error("loadingThresholdEnd NaN")}

    const heute = new Date();
    const loadingThresholdStartDateTime = new Date(heute.getFullYear(),heute.getMonth(),heute.getDate(),parseInt(loadingThresholdStart),0,0)
    const loadingThresholdEndDateTime = new Date(heute.getFullYear(),heute.getMonth(),heute.getDate() + 1,parseInt(loadingThresholdEnd),0,0)

    let epochToday = new Date(heute.getFullYear(),heute.getMonth(),heute.getDate()).getTime();
    let epochTomorrow = new Date(heute.getFullYear(),heute.getMonth(),heute.getDate()+2).getTime() - 1;
    let urlEpoch = url.concat("?start=", epochToday.toString(), "&end=", epochTomorrow.toString());

    const options = {
        url: urlEpoch,
        method: 'GET'
    };

    request(options, (error, response, body) => {
        // adapter.log.info("request done");
        var mwstRate = (mwst + 100) / 100;

        if(error) return adapter.log.error(error);

        if(response.statusCode == 200) {

            adapter.setObjectNotExists("Rawdata", {
                    type: "state",
                    common: {
                        name: "Rawdata",
                        type: "string",
                        role: "value",
                        desc: "Beinhaltet die Rohdaten des Abfrageergebnisses als JSON",
                        read: true,
                        write: false
                    },
                    native: {}
                });
            adapter.setState("Rawdata", body);
			
            let array = JSON.parse(body).data;

            for(let i = 0; i < array.length; i++) {
                let stateBaseName = "prices." + i + ".";
                adapter.setObjectNotExists(stateBaseName + "start", {
                    type: "state",
                    common: {
                        name: "Gultigkeitsbeginn (Uhrzeit)",
                        type: "string",
                        role: "value",
                        desc: "Uhrzeit des Beginns der Gültigkeit des Preises",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "startDate", {
                    type: "state",
                    common: {
                        name: "Gultigkeitsbeginn (Datum)",
                        type: "string",
                        role: "value",
                        desc: "Datum des Beginns der Gültigkeit des Preises",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "end", {
                    type: "state",
                    common: {
                        name: "Gultigkeitsende (Uhrzeit)",
                        type: "string",
                        role: "value",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "endDate", {
                    type: "state",
                    common: {
                        name: "Gultigkeitsende (Datum)",
                        type: "string",
                        role: "value",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "nettoPriceKwh", {
                    type: "state",
                    common: {
                        name: "Preis pro KWh (excl. MwSt.)",
                        type: "number",
                        role: "value",
                        unit: "Cent / KWh",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "bruttoPriceKwh", {
                    type: "state",
                    common: {
                        name: "Preis pro KWh (incl. MwSt.)",
                        type: "number",
                        role: "value",
                        unit: "Cent / KWh",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                adapter.setObjectNotExists(stateBaseName + "totalPriceKwh", {
                    type: "state",
                    common: {
                        name: "Gesamtpreis pro KWh (incl. MwSt.)",
                        type: "number",
                        role: "value",
                        unit: "Cent / KWh",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                let start = new Date(array[i].start_timestamp);
                let startTime = start.toLocaleTimeString('de-DE');
                let startDate = start.toLocaleDateString('de-DE');
                let end = new Date(array[i].end_timestamp);
                let endTime = end.toLocaleTimeString('de-DE');
                let endDate = end.toLocaleDateString('de-DE');
                let nettoPriceKwh = array[i].marketprice / 10; //price is in eur per MwH. Convert it in cent per KwH
                let bruttoPriceKwh = nettoPriceKwh * mwstRate; 
                let toalPriceKwh = bruttoPriceKwh + workRate ; 

                adapter.setState(stateBaseName + "start", startTime);
                adapter.setState(stateBaseName + "startDate", startDate);
                adapter.setState(stateBaseName + "end", endTime);
                adapter.setState(stateBaseName + "endDate", endDate);
                adapter.setState(stateBaseName + "nettoPriceKwh", nettoPriceKwh);
                adapter.setState(stateBaseName + "bruttoPriceKwh", bruttoPriceKwh);
                adapter.setState(stateBaseName + "totalPriceKwh", toalPriceKwh);
            }

            let sortedArray = array.sort(compareValues("marketprice", "asc"));
            let j= 0;

            for(let k = 0; k < sortedArray.length; k++) {
                let start = new Date(array[k].start_timestamp);
                let end = new Date(array[k].end_timestamp);

                if (start >= loadingThresholdStartDateTime && end < loadingThresholdEndDateTime) {
                    let stateBaseName = "pricesOrdered." + j + ".";

                    adapter.setObjectNotExists(stateBaseName + "start", {
                        type: "state",
                        common: {
                            name: "Gultigkeitsbeginn (Uhrzeit)",
                            type: "string",
                            role: "value",
                            desc: "Uhrzeit des Beginns der Gültigkeit des Preises",
                            read: true,
                            write: false
                        },
                        native: {}
                    });
    
                    adapter.setObjectNotExists(stateBaseName + "startDate", {
                        type: "state",
                        common: {
                            name: "Gultigkeitsbeginn (Datum)",
                            type: "string",
                            role: "value",
                            desc: "Datum des Beginns der Gültigkeit des Preises",
                            read: true,
                            write: false
                        },
                        native: {}
                    });
    
                    adapter.setObjectNotExists(stateBaseName + "end", {
                        type: "state",
                        common: {
                            name: "Gultigkeitsende (Uhrzeit)",
                            type: "string",
                            role: "value",
                            read: true,
                            write: false
                        },
                        native: {}
                    });
    
                    adapter.setObjectNotExists(stateBaseName + "endDate", {
                        type: "state",
                        common: {
                            name: "Gultigkeitsende (Datum)",
                            type: "string",
                            role: "value",
                            read: true,
                            write: false
                        },
                        native: {}
                    });
    
                adapter.setObjectNotExists(stateBaseName + "priceKwh", {
                    type: "state",
                    common: {
                        name: "Preis pro KWh (excl. MwSt.)",
                        type: "number",
                        role: "value",
                        unit: "Cent / KWh",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                    let startTime = start.toLocaleTimeString('de-DE');
                    let startDate = start.toLocaleDateString('de-DE');
                    let endTime = end.toLocaleTimeString('de-DE');
                    let endDate = end.toLocaleDateString('de-DE');
                    let priceKwh = array[k].marketprice / 10; //price is in eur per MwH. Convert it in cent per KwH

                    adapter.setState(stateBaseName + "start", startTime);
                    adapter.setState(stateBaseName + "startDate", startDate);
                    adapter.setState(stateBaseName + "end", endTime);
                    adapter.setState(stateBaseName + "endDate", endDate);
                    adapter.setState(stateBaseName + "priceKwh", priceKwh);

                    j++;
                }

            }

        }
    });

    setTimeout(function() {
        adapter.stop();
    }, 10000)
    
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}