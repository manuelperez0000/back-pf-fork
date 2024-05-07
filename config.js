const {
    CLIENT_ID,
    CLIENT_SECRET,
    REFRESH_TOKEN,
    ACCESS_TOKEN ,
    SCOOPE,
    EXPIRES
} = process.env;

module.exports = {
    databaseName: "pfservicios1000",
    port: 8000,
    auth: {
        email: "manuelperez.0000@gmail.com",
        password: "mhhc osxd dmot vtgv",
    },
    paypalUrl: "https://api-m.sandbox.paypal.com"
}
