module.exports = {
    environment: process.env.NODE_ENV || 'development',
    // keep alive set to 1 minute on incoming requests
    keepAliveInterval: 60000,
    knex: {
        debug: false,
        client: 'mysql',
        connection: {
            host: process.env.MYSQL_HOST || '127.0.0.1',
            user: process.env.MYSQL_USER || 'sangoma',
            password: process.env.MYSQL_PASSWORD || 'sangomaftw!',
            database: process.env.MYSQL_DATABASE || 'iot',
            charset: 'utf8mb4',
        },
        pool: { min: 1, max: 10 },
    },
    log: {
        level: 'debug',
        logUncaughtException: false,
        pretty: true,
        verboseEvents: false,
        path: '/var/log/asterisk/iot-server.log',
    },
    iot: {

        udp_port_range: '10000:60000',
        default_org_id: '8736421e-6b51-41fb-bebe-c37351642acd',

        cloud: {
            connection: { host: 'sr.iot.sangoma.tech', ssl: true, port: 443 },
            base_path: '/etcd-v3',
            fw_download: {
                aws_gw_endpoint: { host: 'firmware-images.sr.iot.sangoma.tech', ssl: true, port: 443, prefix: "" },
                aws_s3: { host: 's3.amazonaws.com', ssl: true, port: 443, prefix: "smart-office-firmware-images"},
                fw_updates_support_for_old_builds: {
                    "3.0.14": {
                        develco_version: "3.0.14",
                        supported_max_build_number: 21,
                        version_check_ep: "getProviderLatestFirmwareInfo",
                        cert_renewal_ep: "updateGWCertificate"
                    }
                }
            }
        },
        weather_service: {

            url: 'api.openweathermap.org/data/2.5',
            api_key: 'a7c1ab62607366ed0ccf0aa22d5b09b8'
        },

        swagger: {
            enabled: false,
        },

        providers: [
            {
                name: 'cyberdata',
            },

            {
                name: 'develco',
                base_url: 'ssapi',
                //templates: {storage: 'local', path:'/usr/local/iot-server/config/develco'}

            },
        ],
    },
    zulu: {
        api: { port: 80, ssl: false },
        asterisk: { port: 8089, ssl: true },
        port: 8100,
    },
    client: {
        //uuid:'iZh8grpZbjQZ2JIFyViUfOoVLcOT7XYqZdu1u34frvfNQrL8ifJAHgpgV'
    },
    port: 3000,
    host: '127.0.0.1',
    // name of this service to use when the source of an error is not an upstream service
    sourceService: 'SmartOffice',
    firebase: {
        databaseURL: "https://pushnotificationtest-f8f56.firebaseio.com"
    }
};
