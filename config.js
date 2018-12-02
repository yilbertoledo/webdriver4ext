const locations = require("./locations.js");

var config = {
  browser: "chrome",
  url: "https://reservahora.extranjeria.gob.cl/inicio.action",
  urlExpiredSession:
    "https://reservahora.extranjeria.gob.cl/reservaHoras/sessionExpirada.jsp",
  urlData:
    "https://reservahora.extranjeria.gob.cl/reservarHora/cargaEventosDeReserva.action?start=2018-11-26&end=2018-12-10",
  username: "********@gmail.com",
  password: "*******",
  shortWait: 1000,
  longWait: 3000,
  timeoutWait: 10000,
  location: locations.RM_SANTIAGO.SANTIAGO,
  procedureName: `(PDI) Certificado de viajes y Registro de visa para postular a la            Permanencia Definitiva`,
  noDataMsg:
    "No es posible realizar la operación solicitada. Intentar más tarde.",
  loginPageTitle: "<title>Login</title>",
  expiredSession: "ha expirado",
  htmlInJsonWrap: `<html xmlns="http://www.w3.org/1999/xhtml">`,
  monitorInterval: 207000,
  useHeadlessBrowser: true,
  mailService: "gmail",
  mailAuthUser: "******@gmail.com",
  mailAuthPass: "******",
  mailRecipient: "******@gmail.com"
};
module.exports = config;
