/**
 * Exports control class. it's contains site control locators
 */

const { By } = require("selenium-webdriver");

controls = {
  txtUsername: By.xpath("/html/body/div/div[1]/div/form/div[1]/input"),
  txtPassword: By.xpath("/html/body/div/div[1]/div/form/div[2]/input"),
  btnLogin: By.name('Ingresar'),
  btnReservarHora: By.xpath('//*[@id="btnReservarHora"]'),
  btnCloseModalStep3: By.xpath("/html/body/div[2]/div[3]/div/button"),
  cmbRegiones: By.id("cmbRegionesST"),
  cmbComunas: By.id("cmbComunasST"),
  cmbTramites: By.id("cmbTramitesDisponiblesST"),
  btnNextStep3: By.id("btnSiguienteST"),
  btnNextStep4: By.id("btnSiguienteAG"),
  RdBtnYesStep5: By.id("opcionRadio1"),
  RdBtnNoStep5: By.id("opcionRadio2"),
  btnNextStep5: By.id("btnSiguienteRB"),
  btnCloseModalStep6: By.xpath("/html/body/div[4]/div[3]/div/button[2]"),
  lnkLogout: By.className("rh-logout"),
};

module.exports = controls;

