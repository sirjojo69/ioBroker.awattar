// main.js
const utils = require("@iobroker/adapter-core");
const axios = require("axios").default;

class Awattar extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: "awattar" });
        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    async onReady() {
        this.log.info("Adapter awattar is ready.");

        // Fetch data periodically
        this.fetchAwattarData();
    }

    async fetchAwattarData() {

        // this.log.info("aWATTar API URL: " + this.config.aWATTarApiUrl);
        // this.log.info("Loading Threshold Start: " + this.config.LoadingThresholdStart);
        // this.log.info("Loading Threshold End: " + this.config.LoadingThresholdEnd);

        const url = this.config.aWATTarApiUrl;
        const mwst = parseInt(this.config.MWstRate);
        const mwstRate = (mwst + 100) / 100;
        const workRate = parseFloat(this.config.WorkRate);
        const loadingThresholdStart = this.config.LoadingThresholdStart;
        if (isNaN(parseInt(loadingThresholdStart))) { return this.log.error("loadingThresholdStart NaN"); }
        const loadingThresholdEnd = this.config.LoadingThresholdEnd;
        if (isNaN(parseInt(loadingThresholdEnd))) { return this.log.error("loadingThresholdEnd NaN"); }

        const heute = new Date();
        const loadingThresholdStartDateTime = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), parseInt(loadingThresholdStart), 0, 0);
        const loadingThresholdEndDateTime = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1, parseInt(loadingThresholdEnd), 0, 0);

        const epochToday = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate()).getTime();
        const epochTomorrow = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 2).getTime() - 1;
        const urlEpoch = url.concat("?start=", epochToday.toString(), "&end=", epochTomorrow.toString());

        this.log.debug("local request started");

        //get data from awattar api
        let response;
        try {
            response = await axios({
                method: "get",
                baseURL: urlEpoch,
                timeout: 10000,
                responseType: "json"
            });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                // The request was made and the server responded with a status code
                this.log.warn("received error " + error.response.status + " response from local sensor with content: " + JSON.stringify(error.response.data));
            } else if (axios.isAxiosError(error) && error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                this.log.error((error instanceof Error) ? error.message : "Unknown error");
            } else {
                // Something happened in setting up the request that triggered an Error
                this.log.error((error instanceof Error) ? error.message : "Unknown error");
            }
            return;
        }

        const content = response.data;

        this.log.debug("local request done");
        this.log.debug("received data (" + response.status + "): " + JSON.stringify(content));

        //write raw data to data point
        await this.setObjectNotExistsAsync("Rawdata", {
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
        await this.setState("Rawdata", JSON.stringify(content), true);

        const array = content.data;

        for (let i = 0; i < array.length; i++) {
            const stateBaseName = "prices." + i + ".";

            //ensure all necessary data points exist
            await this.setObjectNotExistsAsync(stateBaseName + "start", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "startTimestamp", {
                type: "state",
                common: {
                    name: "startTimestamp",
                    type: "number",
                    role: "value",
                    desc: "Timestamp des Beginns der Gültigkeit des Preises",
                    read: true,
                    write: false
                },
                native: {}
            });

            await this.setObjectNotExistsAsync(stateBaseName + "startDate", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "end", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "endTimestamp", {
                type: "state",
                common: {
                    name: "endTimestamp",
                    type: "number",
                    role: "value",
                    desc: "Timestamp des Endes der Gültigkeit des Preises",
                    read: true,
                    write: false
                },
                native: {}
            });

            await this.setObjectNotExistsAsync(stateBaseName + "endDate", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "nettoPriceKwh", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "bruttoPriceKwh", {
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

            await this.setObjectNotExistsAsync(stateBaseName + "totalPriceKwh", {
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

            //calculate prices / timestamps
            const startTs = array[i].start_timestamp;
            const start = new Date(startTs);
            const startTime = start.toLocaleTimeString("de-DE");
            const startDate = `${start.getDate().toString().padStart(2, "0")}.${(start.getMonth() + 1).toString().padStart(2, "0")}.${start.getFullYear()}`;
            const endTs = array[i].end_timestamp;
            const end = new Date(endTs);
            const endTime = end.toLocaleTimeString("de-DE");
            const endDate = `${end.getDate().toString().padStart(2, "0")}.${(end.getMonth() + 1).toString().padStart(2, "0")}.${end.getFullYear()}`;
            const nettoPriceKwh = array[i].marketprice / 10; //price is in eur per MwH. Convert it in cent per KwH
            const bruttoPriceKwh = nettoPriceKwh * mwstRate;
            const totalPriceKwh = bruttoPriceKwh + workRate;

            //write prices / timestamps to their data points
            await Promise.all(
                [this.setStateAsync(stateBaseName + "start", startTime, true)
                    , this.setStateAsync(stateBaseName + "startTimestamp", startTs, true)
                    , this.setStateAsync(stateBaseName + "startDate", startDate, true)
                    , this.setStateAsync(stateBaseName + "end", endTime, true)
                    , this.setStateAsync(stateBaseName + "endTimestamp", endTs, true)
                    , this.setStateAsync(stateBaseName + "endDate", endDate, true)
                    , this.setStateAsync(stateBaseName + "nettoPriceKwh", nettoPriceKwh, true)
                    , this.setStateAsync(stateBaseName + "bruttoPriceKwh", bruttoPriceKwh, true)
                    , this.setStateAsync(stateBaseName + "totalPriceKwh", totalPriceKwh, true)
                ]);
        }

        this.log.debug("all prices written to their data points");

        //ordered prices
        const sortedArray = array.sort(compareValues("marketprice", "asc"));
        let j = 0;

        for (let k = 0; k < sortedArray.length; k++) {
            const startTs = sortedArray[k].start_timestamp;
            const start = new Date(startTs);
            const endTs = sortedArray[k].end_timestamp;
            const end = new Date(endTs);

            if (start >= loadingThresholdStartDateTime && end < loadingThresholdEndDateTime) {
                const stateBaseName = "pricesOrdered." + j + ".";

                //ensure all necessary data points exist
                await this.setObjectNotExistsAsync(stateBaseName + "start", {
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

                await this.setObjectNotExistsAsync(stateBaseName + "startTimestamp", {
                    type: "state",
                    common: {
                        name: "startTimestamp",
                        type: "number",
                        role: "value",
                        desc: "Timestamp des Beginns der Gültigkeit des Preises",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                await this.setObjectNotExistsAsync(stateBaseName + "startDate", {
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

                await this.setObjectNotExistsAsync(stateBaseName + "end", {
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

                await this.setObjectNotExistsAsync(stateBaseName + "endTimestamp", {
                    type: "state",
                    common: {
                        name: "endTimestamp",
                        type: "number",
                        role: "value",
                        desc: "Timestamp des Endes der Gültigkeit des Preises",
                        read: true,
                        write: false
                    },
                    native: {}
                });

                await this.setObjectNotExistsAsync(stateBaseName + "endDate", {
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

                await this.setObjectNotExistsAsync(stateBaseName + "priceKwh", {
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

                //calculate prices / timestamps
                const startTime = start.toLocaleTimeString("de-DE");
                const startDate = start.toLocaleDateString("de-DE");
                const endTime = end.toLocaleTimeString("de-DE");
                const endDate = end.toLocaleDateString("de-DE");
                const priceKwh = sortedArray[k].marketprice / 10; //price is in eur per MwH. Convert it in cent per KwH

                //write prices / timestamps to their data points
                await Promise.all(
                    [this.setState(stateBaseName + "start", startTime, true)
                        , this.setState(stateBaseName + "startTimestamp", startTs, true)
                        , this.setState(stateBaseName + "startDate", startDate, true)
                        , this.setState(stateBaseName + "end", endTime, true)
                        , this.setState(stateBaseName + "endTimestamp", endTs, true)
                        , this.setState(stateBaseName + "endDate", endDate, true)
                        , this.setState(stateBaseName + "priceKwh", priceKwh, true)
                    ]);
                j++;
            }

        }

        this.log.debug("all ordered prices written to their data points");

        setTimeout(() => {
            if (typeof this.stop === "function") {
                this.stop();
            }
        }, 10000);

    }

    onUnload(callback) {
        try {
            this.log.info("Adapter awattar is shutting down.");
            callback();
        } catch (error) {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new Awattar(options);
} else {
    new Awattar();
}

function compareValues(key, order = "asc") {
    return function innerSort(a, b) {
        if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) {
            // property doesn't exist on either object
            return 0;
        }

        const varA = (typeof a[key] === "string")
            ? a[key].toUpperCase() : a[key];
        const varB = (typeof b[key] === "string")
            ? b[key].toUpperCase() : b[key];

        let comparison = 0;
        if (varA > varB) {
            comparison = 1;
        } else if (varA < varB) {
            comparison = -1;
        }
        return (
            (order === "desc") ? (comparison * -1) : comparison
        );
    };
}

