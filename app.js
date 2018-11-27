const { Builder, By, Key, until, Point } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const h2p = require("html2plaintext");
const fs = require("fs");
const config = require("./config.js");
const controls = require("./controls.js");
const comparer = require("./comparer.js");
const mailer = require("./mailer.js");

var driver;
var monitorCounter = 0;

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
    console.log(error);
    result.reason = error.message;
  } finally {
    console.log(`Click ${result.status}: ${result.reason}`);
    return result;
  }
};

const selectItemByText = async (element, itemText, onlyAlpha = false) => {
  var result = {
    status: "ERROR",
    reason: ""
  };

  try {
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
    console.log(error);
    result.reason = error.message;
  } finally {
    console.log(`Selection ${result.status}: ${result.reason}`);
    return result;
  }
};

initialize = async () => {
  //Initialazing WebDriver
  console.log("Initializing webdriver");
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

loadCalendarPage = async () => {
  try {
    //Open calendar page
    await driver.get(config.url);

    /** Step 1: Login **/
    console.log("Init Login");
    await driver
      .findElement(controls.txtUsername)
      .sendKeys(config.username, Key.TAB, config.password, Key.RETURN);
    /** End Login **/

    /** Step 2: Operation selection **/
    console.log("Init Operation Selection");
    await driver.sleep(config.shortWait); //Explicit wait for page loading
    await clickElement(controls.btnReservarHora);
    /** End Operation selection **/

    /** Step 3: Transaction selection **/
    console.log("Init Transaction Selection");
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

    /** Step 4: Informative general background  **/
    console.log("Init Informative general background");
    await driver.sleep(config.longWait); //Explicit wait for page loading
    let result = await clickElement(controls.btnNextStep4, true, false);
    /** End Informative general background  **/

    /** Step 5: Requirement compliance **/
    await driver.sleep(config.longWait); //Explicit wait for page loading
    var resultStep5 = await clickElement(controls.RdBtnYesStep5);
    if (resultStep5.status === "OK")
      resultStep5 = await clickElement(controls.btnNextStep5);
    /** End Requirement compliance  **/

    /** Step 6: Transaction selection **/
    console.log("Init Transaction Selection");
    //Begin dismiss user data modal
    await driver.sleep(config.longWait); //Explicit wait for modal loading
    await clickElement(controls.btnCloseModalStep6);
    //End dismiss user data modal
    return true;
  } catch (error) {
    console.log(error);
    mailer.sendMail(
      "WebDriver4Ext Notification",
      "Help! Exception in loadCalendarPage(). " + err.message
    );
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
  console.log("Init extractData");
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
    if ((await tabsCount()) === 1) await driver.executeScript("window.open()");
    await goToTab(1); //switches to new tab
    await driver.get(config.urlData);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const goToTab = async tabIdx => {
  console.log(`goToTab ${tabIdx}`);
  try {
    var tabs = await driver.getAllWindowHandles();
    if (tabs.length >= tabIdx + 1) {
      await driver.switchTo().window(tabs[tabIdx]); //switches to tab
      return true;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

const refreshPage = async () => {
  console.log("Init refreshPage");
  await driver.navigate().refresh();
};

const monitorCalendar = async () => {
  monitorCounter++;
  console.log(`Monitor running for ${monitorCounter} time`);
  try {
    if (await loadDataPage()) {
      var res = await extractData();
      switch (res.status) {
        case "ERROR":
          console.log(`Error: ${res.data}`);
          return;
        case "OK":
          console.log("Keep going baby =>");
          resultComp = await comparer.compareData(res.data);
          switch (resultComp) {
            case "ERROR":
              console.log("Error in comparation");
              mailer.sendMail(
                "WebDriver4Ext Notification",
                "Something went wrong in file comparison. Come with me, let's fix it."
              );
              return;
            case "EQUAL":
              console.log("Equal data. Nothing to do");
              return;
            case "DIFFERENT":
              console.log("Data has changed. Notify quickly");
              mailer.sendMail(
                "WebDriver4Ext Notification",
                "Data has changed. Hurry up aka Move your ass."
              );
              return;
            case "FIRST":
              console.log("");
              mailer.sendMail(
                "WebDriver4Ext Notification",
                "Initial Data File created."
              );
              return;
            default:
              return;
          }
          return;
        case "LOGIN":
          console.log("Need to login again");
          mailer.sendMail(
            "WebDriver4Ext Notification",
            "Trying to login again."
          );
          await goToTab(0);
          await loadCalendarPage();
          return;
        case "RETRY":
          console.log("Wait & Retry");
          return;
        default:
          return;
      }
    }
  } catch (err) {
    console.log(`Error in monitorCalendar: ${err.message}`);
    mailer.sendMail(
      "WebDriver4Ext Notification",
      "Help! Exception in monitorCalendar(). " + err.message
    );
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
