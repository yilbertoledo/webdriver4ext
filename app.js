const { Builder, By, Key, until, Point } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const h2p = require("html2plaintext");
const fs = require("fs");
const config = require("./config.js");
const controls = require("./controls.js");
const comparer = require("./comparer.js");
const mailer = require("./mailer.js");
const notifyer = require("./notifyer.js");


const STEP1_LOGIN = 1;
const STEP2_MAIN_OPERATION = 2;
const STEP3_NEW_PROCEDURE = 3;
const STEP4_GENERAL_BACKGROUND = 4;
const STEP5_REQUIEREMENTS_COMPLIANCE = 5;
const STEP6_PERSONAL_INFO = 6;
const STEP7_CALENDAR = 7;

var driver;
var monitorCounter = 0;

const notifyTitle = "WebDriver4Extranj";

const onlyAlphanumerics = str => {
  var result = "";
  var code, i, len;
  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (code >= 0 && code <= 31) continue;
    else result = result + str[i];
    return result;
  }
  return true;
};

const clickElement = async (
  element,
  waitForVisible = true,
  waitForEnabled = true
) => {
  var result = {
    status: "ERROR",
    reason: ""
  };
  try {
    if (waitForVisible)
      await driver.wait(
        until.elementIsVisible(driver.findElement(element)),
        config.timeoutWait
      );

    if (waitForEnabled)
      await driver.wait(
        until.elementIsEnabled(driver.findElement(element)),
        config.timeoutWait
      );

    var ctrl = await driver.findElement(element);
    if (ctrl) {
      ctrl.click();
      result.status = "OK";
    } else {
      result.reason = "Element not found.";
    }
  } catch (error) {
    log(error);
    result.reason = error.message;
  } finally {
    log(`Click ${result.status}: ${result.reason}`);
    return result;
  }
};

const selectItemByText = async (
  element,
  itemText,
  onlyAlpha = false,
  waitForEnabled = true
) => {
  var result = {
    status: "ERROR",
    reason: ""
  };

  try {
    if (waitForEnabled)
      await driver.wait(
        until.elementIsEnabled(driver.findElement(element)),
        config.timeoutWait
      );

    var dropdown_list = await driver.findElement(element);
    if (dropdown_list) {
      var options = await dropdown_list.findElements(By.tagName("option"));
      if (options) {
        for (var i = 0, len = options.length; i < len; i++) {
          var optionText = await options[i].getText();
          if (onlyAlpha) {
            //Remove non printable characters
            optionText = onlyAlphanumerics(optionText);
            itemText = onlyAlphanumerics(itemText);
          }
          if (optionText === itemText) {
            options[i].click();
            result.status = "OK";
            result.reason = "";
            break;
          }
        }
        if (result.status !== "OK") result.reason = "Item not found";
      } else {
        result.reason = "List has no options";
      }
    } else {
      result.reason = "Control not found.";
    }
  } catch (error) {
    log(error);
    result.reason = error.message;
  } finally {
    log(`Selection ${result.status}: ${result.reason}`);
    return result;
  }
};

initialize = async () => {
  //Initialazing WebDriver
  log("Initializing webdriver", false, true);
  if (!config.useHeadlessBrowser) {
    driver = await new Builder().forBrowser(config.browser).build();
  } else {
    driver = new Builder()
      .forBrowser(config.browser)
      .setChromeOptions("headless")
      //.setFirefoxOptions(/* ... */)
      .build();
  }

  //Maximize browser window
  await driver
    .manage()
    .window()
    .maximize();
};

loadCalendarPage = async (initialStep) => {
  try {

    if (!initialStep)
      initialStep = STEP1_LOGIN

    if (initialStep <= STEP1_LOGIN) {
      log("Initializing Login", false, true);
      //Open calendar page
      await driver.get(config.url);
      /** Step 1: Login **/
      await driver
        .findElement(controls.txtUsername)
        .sendKeys(config.username, Key.TAB, config.password, Key.RETURN);
      /** End Login **/
    }

    if (initialStep <= STEP2_MAIN_OPERATION) {
      /** Step 2: Operation selection **/
      log("Init Operation Selection");
      await driver.sleep(config.shortWait); //Explicit wait for page loading
      await clickElement(controls.btnReservarHora);
      /** End Operation selection **/
    }

    if (initialStep <= STEP3_NEW_PROCEDURE) {
      /** Step 3: Transaction selection **/
      log("Init Transaction Selection");
      //Begin dismiss info modal
      await driver.sleep(config.longWait); //Explicit wait for modal loading
      await clickElement(controls.btnCloseModalStep3);
      //End dismiss info modal
      //Begin Procedure selection
      let region = config.location.split(":")[0];
      let comune = config.location.split(":")[1];
      var resultStep3 = await selectItemByText(controls.cmbRegiones, region);
      if (resultStep3.status === "OK")
        resultStep3 = await selectItemByText(controls.cmbComunas, comune);
      if (resultStep3.status === "OK") {
        resultStep3 = await selectItemByText(
          controls.cmbTramites,
          config.procedureName,
          true
        );
      }
      if (resultStep3.status === "OK") {
        resultStep3 = await clickElement(controls.btnNextStep3, false, true);
      }
      //Begin Procedure selection
      /** End Transaction selection **/
    }

    if (initialStep <= STEP4_GENERAL_BACKGROUND) {
      /** Step 4: Informative general background  **/
      log("Init Informative general background");
      await driver.sleep(config.longWait); //Explicit wait for page loading
      let result = await clickElement(controls.btnNextStep4, true, false);
      /** End Informative general background  **/
    }

    if (initialStep <= STEP5_REQUIEREMENTS_COMPLIANCE) {
      /** Step 5: Requirement compliance **/
      await driver.sleep(config.longWait); //Explicit wait for page loading
      var resultStep5 = await clickElement(controls.RdBtnYesStep5);
      if (resultStep5.status === "OK")
        resultStep5 = await clickElement(controls.btnNextStep5);
      /** End Requirement compliance  **/
    }

    if (initialStep <= STEP6_PERSONAL_INFO) {
      /** Step 6: Transaction selection **/
      log("Init Transaction Selection");
      //Begin dismiss user data modal
      await driver.sleep(config.longWait); //Explicit wait for modal loading
      await clickElement(controls.btnCloseModalStep6);
      //End dismiss user data modal
    }

    return true;
  } catch (error) {
    log("Help! Exception in loadCalendarPage(). " + err.message, true, false);
    return false;
  } finally {
    //await driver.quit();
  }
};

const extractData = async () => {
  var result = {
    status: "",
    data: ""
  };
  log("Data extraction in process", false, true);
  try {
    var source = await driver.getPageSource();
    if (source) {
      if (source.includes(config.noDataMsg)) {
        result.status = "RETRY";
      } else {
        if (
          source.includes(config.loginPageTitle) ||
          source.includes(config.expiredSession)
        ) {
          result.status = "LOGIN";
        } else {
          if (source.includes(config.htmlInJsonWrap)) source = h2p(source); //Extract JSON wrapped in HTTM page
          var days = JSON.parse(source);
          result.status = "OK";
          result.data = days;
        }
      }
    } else {
      result.status = "ERROR";
      result.data = "Source Undefined";
    }
  } catch (err) {
    result.status = "ERROR";
    result.data = err.message;
  } finally {
    return result;
  }
};

const tabsCount = async () => {
  var tabs = await driver.getAllWindowHandles();
  return tabs.length;
};

const loadDataPage = async () => {
  try {
    extractData;
    if ((await tabsCount()) === 1) await driver.executeScript("window.open()");
    await goToTab(1); //switches to new tab
    await driver.get(config.urlData);
    return true;
  } catch (error) {
    log(error);
    return false;
  }
};

const goToTab = async tabIdx => {
  log(`goToTab ${tabIdx}`);
  try {
    var tabs = await driver.getAllWindowHandles();
    if (tabs.length >= tabIdx + 1) {
      await driver.switchTo().window(tabs[tabIdx]); //switches to tab
      return true;
    }
  } catch (error) {
    log(error);
    return false;
  }
};

const refreshPage = async () => {
  log("Init refreshPage");
  await driver.navigate().refresh();
};

const logout = async () => {
  await clickElement(controls.lnkLogout);
  con
  rh - logout
}

const log = async (message, email = false, desktop = false) => {
  console.log(message);
  if (desktop)
    notifyer.sendMessage(
      notifyTitle,
      message,
    );
  if (email)
    mailer.sendMail(
      notifyTitle,
      message
    );
}

const monitorCalendar = async () => {
  monitorCounter++;
  log(`Monitor running for ${monitorCounter} time`);
  try {
    if (await loadDataPage()) {
      var res = await extractData();
      switch (res.status) {
        case "ERROR":
          log(`Error: ${res.data}`);
          return;
        case "OK":
          log("Keep going baby =>");
          resultComp = await comparer.compareData(res.data);
          switch (resultComp) {
            case "ERROR":
              log("Something went wrong in file comparison. Come with me, let's fix it.", true, true);
              return;
            case "EQUAL":
              log("Equal data. Nothing to do", false, true);
              return;
            case "DIFFERENT":
              log("Data has changed. Hurry up aka Move your ass!!", true, true);
              return;
            case "FIRST":
              log("Initial Data File created.", true, true);
              return;
            default:
              return;
          }
          return;
        case "LOGIN":
          log("Trying to login again.", true, false);
          await goToTab(0);
          await loadCalendarPage(STEP1_LOGIN);
          return;
        case "RETRY":
          log("Retrying login.", true, true);
          await goToTab(0);
          var btnNextStep5 = await driver.findElement(controls.btnNextStep5);
          if (btnNextStep5) {
            log("Bug has bite us!! Retrying login from STEP 5.", true, true);
            //There is a bug that shows a validation error waiting for RadioButton
            //Then we need to retry from Step 5
            await loadCalendarPage(STEP5_REQUIEREMENTS_COMPLIANCE)
          }
          else {
            //Maybe we should start over :(
            log("Abort mission, step back and realign!");
            await logout();
          }
          return;
        default:
          return;
      }
    }
  } catch (err) {
    log(`Help! Exception in monitorCalendar(): ${err.message}`, true, true);
  } finally {
  }
};

const main = async () => {
  await initialize();
  await loadCalendarPage();
  await driver.sleep(config.longWait); //Explicit wait for page loading
  await monitorCalendar(); //First run, without dealy
  //schedule monitor
  var timer = setInterval(monitorCalendar, config.monitorInterval);
};

main();
